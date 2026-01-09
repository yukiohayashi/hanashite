import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // point_settingsテーブルの全レコードを取得
    const { data: settings, error } = await supabase
      .from('point_settings')
      .select('*')
      .order('point_type');

    if (error) {
      console.error('Point settings fetch error:', error);
      return NextResponse.json(
        { error: 'ポイント設定の取得に失敗しました', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      settings,
      registSetting: settings?.find(s => s.point_type === 'regist')
    });
  } catch (error) {
    console.error('Check settings error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
