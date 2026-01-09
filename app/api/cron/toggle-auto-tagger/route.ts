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

    const { data: existingSetting } = await supabase
      .from('auto_creator_settings')
      .select('id')
      .eq('setting_key', 'auto_tagger_enabled')
      .single();

    if (existingSetting) {
      const { error } = await supabase
        .from('auto_creator_settings')
        .update({
          setting_value: enabled ? 'true' : 'false',
          updated_at: new Date().toISOString(),
        })
        .eq('setting_key', 'auto_tagger_enabled');

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('auto_creator_settings')
        .insert({
          setting_key: 'auto_tagger_enabled',
          setting_value: enabled ? 'true' : 'false',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    }

    await supabase.from('auto_tagger_logs').insert({
      execution_type: 'manual',
      status: 'success',
      message: `AI自動タグ付けを${enabled ? '開始' : '停止'}しました`,
      executed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `AI自動タグ付けを${enabled ? '開始' : '停止'}しました`,
      enabled,
    });
  } catch (error) {
    console.error('Toggle auto-tagger error:', error);
    const errorMessage = error instanceof Error ? error.message : '設定の更新に失敗しました';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
