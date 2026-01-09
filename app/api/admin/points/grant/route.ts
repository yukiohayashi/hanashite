import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, amount, type, createdAt } = body;

    if (!userId || !amount || !type) {
      return NextResponse.json(
        { error: 'userId, amount, typeが必要です' },
        { status: 400 }
      );
    }

    // ポイントを付与（IDは自動採番）
    const insertData: Record<string, string | number> = {
      user_id: userId,
      amount,
      type,
    };
    
    if (createdAt) {
      insertData.created_at = createdAt;
    }

    const { data, error } = await supabase
      .from('points')
      .insert(insertData)
      .select();

    if (error) {
      console.error('Point grant error:', error);
      return NextResponse.json(
        { error: 'ポイント付与に失敗しました', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      point: data?.[0],
      message: `${amount}ptを付与しました`
    });
  } catch (error) {
    console.error('Grant error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
