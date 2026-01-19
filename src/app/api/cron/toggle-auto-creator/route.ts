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
    const { data: settings } = await supabase
      .from('auto_creator_settings')
      .select('setting_key, setting_value');

    const settingsMap = new Map(
      settings?.map((s) => [s.setting_key, s.setting_value]) || []
    );

    const isActive = settingsMap.get('is_active') === 'true';
    const noCreateStartHour = parseInt(settingsMap.get('no_create_start_hour') || '0');
    const noCreateEndHour = parseInt(settingsMap.get('no_create_end_hour') || '6');
    const intervalMinutes = parseInt(settingsMap.get('interval_minutes') || '30');
    const varianceMinutes = parseInt(settingsMap.get('variance_minutes') || '10');
    const lastExecutedAt = settingsMap.get('last_executed_at');

    // 現在時刻をチェック（日本時間）
    const now = new Date();
    const jstOffset = 9 * 60; // JST is UTC+9
    const jstTime = new Date(now.getTime() + jstOffset * 60 * 1000);
    const currentHour = jstTime.getUTCHours();

    // 作成しない時間帯かチェック
    const isNoCreateTime = currentHour >= noCreateStartHour && currentHour < noCreateEndHour;

    if (isNoCreateTime) {
      return NextResponse.json({
        success: true,
        message: `作成しない時間帯です（${noCreateStartHour}時〜${noCreateEndHour}時）`,
        skipped: true,
      });
    }

    // is_activeがfalseの場合はスキップ
    if (!isActive) {
      return NextResponse.json({
        success: true,
        message: 'AI自動投稿が無効化されています',
        skipped: true,
      });
    }

    // 実行間隔チェック
    if (lastExecutedAt) {
      const lastExecuted = new Date(lastExecutedAt);
      const elapsedMinutes = (now.getTime() - lastExecuted.getTime()) / (1000 * 60);

      if (elapsedMinutes < intervalMinutes) {
        return NextResponse.json({
          success: true,
          message: `実行間隔が短すぎます（前回実行から${Math.floor(elapsedMinutes)}分、設定間隔${intervalMinutes}分）`,
          skipped: true,
        });
      }
    }

    // 実際の投稿作成処理を呼び出す
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const executeResponse = await fetch(`${baseUrl}/api/auto-creator/execute-auto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const executeResult = await executeResponse.json();

    // 実行時刻を記録（投稿が作成されたかどうかに関わらず）
    await supabase
      .from('auto_creator_settings')
      .update({ setting_value: now.toISOString() })
      .eq('setting_key', 'last_executed_at');

    return NextResponse.json({
      success: true,
      message: executeResult.message || '自動作成を開始しました',
      enabled: true,
      result: executeResult,
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
