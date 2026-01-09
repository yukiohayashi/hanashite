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

    const { error } = await supabase
      .from('auto_creator_settings')
      .update({
        setting_value: enabled ? 'true' : 'false',
        updated_at: new Date().toISOString(),
      })
      .eq('setting_key', 'is_enabled');

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
