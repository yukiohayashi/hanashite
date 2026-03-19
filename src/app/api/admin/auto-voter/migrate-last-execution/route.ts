import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    // last_executionレコードを取得
    const { data: oldRecord } = await supabase
      .from('auto_voter_settings')
      .select('*')
      .eq('setting_key', 'last_execution')
      .single();

    if (oldRecord) {
      // last_executed_atとして新しいレコードを作成
      await supabase
        .from('auto_voter_settings')
        .upsert({
          setting_key: 'last_executed_at',
          setting_value: oldRecord.setting_value,
          updated_at: oldRecord.updated_at || new Date().toISOString(),
        }, {
          onConflict: 'setting_key'
        });

      // 古いlast_executionレコードを削除
      await supabase
        .from('auto_voter_settings')
        .delete()
        .eq('setting_key', 'last_execution');

      return NextResponse.json({
        success: true,
        message: 'last_executionをlast_executed_atに移行しました',
        migrated_value: oldRecord.setting_value,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'last_executionレコードが存在しないため、移行は不要です',
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to migrate last_execution' },
      { status: 500 }
    );
  }
}
