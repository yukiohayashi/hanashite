import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // ポイント履歴を取得（全件取得、制限なし）
    // Supabaseのデフォルト制限を解除するため、rangeを指定
    const { data: pointHistory, error } = await supabase
      .from('points')
      .select('id, type, amount, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(0, 999999);

    if (error) {
      console.error('Point history fetch error:', error);
      return NextResponse.json(
        { success: false, error: 'ポイント履歴の取得に失敗しました: ' + error.message },
        { status: 500 }
      );
    }

    // 現在の所有ポイントを計算（全履歴の合計）
    const totalPoints = (pointHistory || []).reduce((sum, record) => sum + (record.amount || 0), 0);
    
    console.log('Point history debug:', {
      userId,
      recordCount: pointHistory?.length || 0,
      totalPoints,
      sampleRecords: pointHistory?.slice(0, 5)
    });

    return NextResponse.json({
      success: true,
      pointHistory: pointHistory || [],
      totalPoints,
      debug: {
        recordCount: pointHistory?.length || 0,
        userId
      }
    });
  } catch (error) {
    console.error('Point history error:', error);
    return NextResponse.json(
      { success: false, error: 'ポイント履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
}
