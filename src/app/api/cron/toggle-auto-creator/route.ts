import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { enabled } = await request.json();

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled パラメータが必要です' },
        { status: 400 }
      );
    }

    // 設定を取得
    const { data: settingsData } = await supabase
      .from('auto_creator_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['enabled', 'interval', 'last_executed_at']);

    if (!settingsData || settingsData.length === 0) {
      return NextResponse.json(
        { error: '設定が見つかりません' },
        { status: 404 }
      );
    }

    const settingsMap: Record<string, string> = {};
    settingsData.forEach((item) => {
      settingsMap[item.setting_key] = item.setting_value;
    });

    const currentlyActive = settingsMap.enabled === 'true';
    const intervalMinutes = parseInt(settingsMap.interval || '60');

    // 停止から開始する場合、ランダムな初回実行時間を設定
    if (enabled && !currentlyActive) {
      const varianceMinutes = 6; // interval_minutesの10%
      const maxInterval = intervalMinutes + varianceMinutes;
      
      // 0〜最大間隔の範囲でランダムな分数を生成
      const randomMinutes = Math.floor(Math.random() * maxInterval);
      const pastExecutionTime = new Date(Date.now() - randomMinutes * 60 * 1000);
      
      // enabled と last_executed_at を更新
      const updates = [
        { setting_key: 'enabled', setting_value: enabled.toString() },
        { setting_key: 'last_executed_at', setting_value: pastExecutionTime.toISOString() },
      ];

      for (const update of updates) {
        await supabase
          .from('auto_creator_settings')
          .upsert({ 
            setting_key: update.setting_key,
            setting_value: update.setting_value, 
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'setting_key'
          });
      }

      return NextResponse.json({
        success: true,
        message: enabled ? 'AI自動投稿を開始しました' : 'AI自動投稿を停止しました',
        enabled: enabled,
      });
    }

    // 通常のトグル（開始→停止）
    await supabase
      .from('auto_creator_settings')
      .upsert({ 
        setting_key: 'enabled',
        setting_value: enabled.toString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_key'
      });

    return NextResponse.json({
      success: true,
      message: enabled ? 'AI自動投稿を開始しました' : 'AI自動投稿を停止しました',
      enabled: enabled,
    });
  } catch (error) {
    console.error('Toggle auto-creator error:', error);
    const errorMessage = error instanceof Error ? error.message : '設定の更新に失敗しました';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
