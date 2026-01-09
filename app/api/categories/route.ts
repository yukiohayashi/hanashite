import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';

export async function GET() {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name, slug')
      .order('display_order', { ascending: true })
      .range(0, 999999);

    if (error) {
      console.error('Categories fetch error:', error);
      return NextResponse.json(
        { success: false, error: 'カテゴリーの取得に失敗しました: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      categories: categories || []
    });
  } catch (error) {
    console.error('Categories error:', error);
    return NextResponse.json(
      { success: false, error: 'カテゴリーの取得に失敗しました' },
      { status: 500 }
    );
  }
}
