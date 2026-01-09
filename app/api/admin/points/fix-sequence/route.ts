import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 現在のpointsテーブルの最大IDを取得
    const { data: maxIdData, error: maxIdError } = await supabase
      .from('points')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    if (maxIdError) {
      return NextResponse.json(
        { error: 'IDの取得に失敗しました', details: maxIdError },
        { status: 500 }
      );
    }

    const maxId = maxIdData && maxIdData.length > 0 ? maxIdData[0].id : 0;

    return NextResponse.json({
      success: true,
      maxId,
      message: `現在の最大ID: ${maxId}`,
      nextId: maxId + 1
    });
  } catch (error) {
    console.error('Fix sequence error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
