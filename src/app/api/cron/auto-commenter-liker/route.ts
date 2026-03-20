import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    // Vercel Cronの認証トークンを確認
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      );
    }

    console.log('=== AI自動コメント CRON実行開始 ===');

    // 設定を取得
    const { data: settingsData } = await supabase
      .from('auto_commenter_liker_settings')
      .select('setting_key, setting_value');

    const settings: Record<string, string> = {};
    settingsData?.forEach((item) => {
      settings[item.setting_key] = item.setting_value;
    });

    // 有効化チェック
    if (settings.enabled !== 'true') {
      console.log('AI自動コメントが無効化されています');
      return NextResponse.json({
        success: true,
        message: 'AI自動コメントが無効化されています',
        skipped: true,
      });
    }

    // 実行間隔のチェック
    const interval = parseInt(settings.interval || '120');
    const intervalVariance = parseInt(settings.interval_variance || '30');
    const noRunStart = settings.no_run_start || '00:00';
    const noRunEnd = settings.no_run_end || '06:00';
    const lastExecution = settings.last_executed_at;

    // 実行間隔チェック（ゆらぎを適用）
    if (lastExecution) {
      const lastExecutedAt = new Date(lastExecution);
      const now = new Date();
      
      // 次回実行予定時刻を取得または生成
      let nextExecutionTime: Date;
      
      if (settings.next_execution_time) {
        nextExecutionTime = new Date(settings.next_execution_time);
      } else {
        // 次回実行予定時刻が設定されていない場合は、ゆらぎを適用して生成
        const minInterval = interval - intervalVariance;
        const maxInterval = interval + intervalVariance;
        const randomInterval = minInterval + Math.random() * (maxInterval - minInterval);
        nextExecutionTime = new Date(lastExecutedAt.getTime() + randomInterval * 60 * 1000);
        
        // 次回実行予定時刻を保存
        await supabase
          .from('auto_commenter_liker_settings')
          .upsert({ 
            setting_key: 'next_execution_time',
            setting_value: nextExecutionTime.toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'setting_key'
          });
      }
      
      // 次回実行予定時刻になっていない場合はスキップ
      if (now < nextExecutionTime) {
        const remainingMinutes = Math.ceil((nextExecutionTime.getTime() - now.getTime()) / (1000 * 60));
        console.log(`次回実行予定時刻まで待機: あと${remainingMinutes}分`);
        return NextResponse.json({
          success: true,
          message: `次回実行予定時刻まで待機（あと${remainingMinutes}分）`,
          skipped: true,
          nextExecutionTime: nextExecutionTime.toISOString(),
        });
      }
    }

    // 実行禁止時間帯のチェック
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (noRunStart && noRunEnd && noRunStart <= noRunEnd) {
      if (currentTime >= noRunStart && currentTime < noRunEnd) {
        console.log(`実行禁止時間帯です: ${currentTime} (${noRunStart} - ${noRunEnd})`);
        return NextResponse.json({
          success: true,
          message: `実行禁止時間帯です（${noRunStart} - ${noRunEnd}）`,
          skipped: true,
        });
      }
    }

    // AI自動コメントを実行
    console.log('AI自動コメントを実行します');
    const executeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auto-voter/execute-auto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const executeResult = await executeResponse.json();

    // last_executed_atを更新
    const executedAt = new Date();
    await supabase
      .from('auto_commenter_liker_settings')
      .update({ setting_value: executedAt.toISOString() })
      .eq('setting_key', 'last_executed_at');

    // 次回実行予定時刻を生成・保存（ゆらぎを適用）
    const minInterval = interval - intervalVariance;
    const maxInterval = interval + intervalVariance;
    const randomInterval = minInterval + Math.random() * (maxInterval - minInterval);
    const nextExecutionTime = new Date(executedAt.getTime() + randomInterval * 60 * 1000);
    
    await supabase
      .from('auto_commenter_liker_settings')
      .upsert({ 
        setting_key: 'next_execution_time',
        setting_value: nextExecutionTime.toISOString(),
        updated_at: executedAt.toISOString()
      }, {
        onConflict: 'setting_key'
      });
    
    console.log(`次回実行予定時刻を設定: ${nextExecutionTime.toISOString()} (${Math.floor(randomInterval)}分後)`);

    // ログを記録
    await supabase.from('auto_voter_logs').insert({
      execution_type: 'cron',
      status: executeResponse.ok ? 'success' : 'error',
      message: executeResult.message || 'AI自動コメントを実行しました',
      executed_at: executedAt.toISOString(),
    });

    console.log('=== AI自動コメント CRON実行完了 ===');

    return NextResponse.json({
      success: true,
      message: 'AI自動コメントを実行しました',
      result: executeResult,
    });
  } catch (error) {
    console.error('AI自動コメント CRONエラー:', error);
    const errorMessage = error instanceof Error ? error.message : 'AI自動コメントの実行に失敗しました';

    // エラーログを記録
    await supabase.from('auto_voter_logs').insert({
      execution_type: 'cron',
      status: 'error',
      message: errorMessage,
      executed_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
