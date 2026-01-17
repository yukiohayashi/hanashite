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

    const { error } = await supabase
      .from('auto_creator_settings')
      .update({
        setting_value: enabled ? 'true' : 'false',
        updated_at: new Date().toISOString(),
      })
      .eq('setting_key', 'is_active');

    if (error) {
      throw new Error('設定の更新に失敗しました');
    }

    await supabase.from('auto_creator_logs').insert({
      execution_type: 'manual',
      status: 'success',
      message: `自動作成を${enabled ? '開始' : '停止'}しました`,
      executed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `自動作成を${enabled ? '開始' : '停止'}しました`,
      enabled,
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
