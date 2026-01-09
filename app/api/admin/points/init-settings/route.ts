import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    // registerレコードが既に存在するか確認
    const { data: existing } = await supabase
      .from('point_settings')
      .select('*')
      .eq('point_type', 'register')
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'registerレコードは既に存在します',
        data: existing,
      });
    }

    // registerレコードを追加
    const { data, error } = await supabase
      .from('point_settings')
      .insert({
        point_type: 'register',
        point_value: 3000,
        label: 'ユーザー登録',
        description: '新規会員登録時に付与されるポイント',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json(
        { error: 'レコードの追加に失敗しました', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'registerレコードを追加しました',
      data,
    });
  } catch (error) {
    console.error('Init settings error:', error);
    return NextResponse.json(
      { error: '初期化に失敗しました' },
      { status: 500 }
    );
  }
}
