import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    console.log('=== AI自動投稿実行開始 ===');

    // 設定を取得
    const { data: settings, error: settingsError } = await supabase
      .from('auto_creator_settings')
      .select('*')
      .limit(1)
      .single();

    if (settingsError || !settings) {
      console.error('設定取得エラー:', settingsError);
      return NextResponse.json({
        success: false,
        error: '設定が見つかりません',
      }, { status: 500 });
    }

    // 有効化チェック
    if (!settings.is_active) {
      console.log('自動投稿は無効化されています');
      return NextResponse.json({
        success: false,
        message: '自動投稿は無効化されています',
      });
    }

    // 実行間隔チェック（interval_minutes + 10%のゆらぎ）
    const intervalMinutes = settings.interval_minutes || 60;
    const varianceMinutes = Math.floor(intervalMinutes * 0.1); // 10%のゆらぎ
    const minInterval = intervalMinutes - varianceMinutes;
    
    const lastExecutedAt = settings.updated_at;

    if (lastExecutedAt) {
      const lastExecutedTime = new Date(lastExecutedAt).getTime();
      const currentTime = new Date().getTime();
      const elapsedMinutes = (currentTime - lastExecutedTime) / (1000 * 60);

      console.log(`前回実行: ${lastExecutedAt}`);
      console.log(`経過時間: ${elapsedMinutes.toFixed(1)}分`);
      console.log(`実行間隔設定: ${intervalMinutes}分 ± ${varianceMinutes}分`);
      console.log(`最小間隔: ${minInterval}分`);

      if (elapsedMinutes < minInterval) {
        console.log(`実行間隔未満のためスキップ（あと${(minInterval - elapsedMinutes).toFixed(1)}分）`);
        return NextResponse.json({
          success: false,
          message: `実行間隔未満のためスキップ（あと${(minInterval - elapsedMinutes).toFixed(1)}分）`,
          elapsed: elapsedMinutes,
          required: minInterval,
          interval: intervalMinutes,
          variance: varianceMinutes,
        });
      }
    }

    // 作成しない時間帯チェック
    const currentHour = new Date().getHours();
    const noCreateStartHour = settings.no_create_start_hour || 0;
    const noCreateEndHour = settings.no_create_end_hour || 6;

    if (currentHour >= noCreateStartHour && currentHour < noCreateEndHour) {
      console.log(`作成しない時間帯のためスキップ（${noCreateStartHour}時〜${noCreateEndHour}時）`);
      return NextResponse.json({
        success: false,
        message: `作成しない時間帯のためスキップ（${noCreateStartHour}時〜${noCreateEndHour}時）`,
      });
    }

    // 未処理のソースを取得
    const { data: sources, error: sourcesError } = await supabase
      .from('auto_consultation_sources')
      .select('*')
      .eq('is_processed', false)
      .order('created_at', { ascending: true })
      .limit(1);

    if (sourcesError) {
      console.error('ソース取得エラー:', sourcesError);
      return NextResponse.json({
        success: false,
        error: 'ソース取得に失敗しました',
      }, { status: 500 });
    }

    if (!sources || sources.length === 0) {
      console.log('未処理のソースがありません');
      return NextResponse.json({
        success: false,
        message: '未処理のソースがありません',
      });
    }

    const source = sources[0];
    console.log(`ソースを処理: ${source.id} - ${source.source_title}`);

    // post-from-source APIを呼び出し
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auto-creator/post-from-source`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_id: source.id,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('投稿作成エラー:', result);
      return NextResponse.json({
        success: false,
        error: result.message || '投稿作成に失敗しました',
      }, { status: 500 });
    }

    // 最終実行時刻を更新（updated_atを使用）
    await supabase
      .from('auto_creator_settings')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);

    console.log('=== AI自動投稿実行完了 ===');
    console.log(`投稿ID: ${result.postId}`);

    return NextResponse.json({
      success: true,
      message: '投稿を作成しました',
      postId: result.postId,
      sourceId: source.id,
    });

  } catch (error) {
    console.error('AI自動投稿実行エラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '実行に失敗しました',
    }, { status: 500 });
  }
}
