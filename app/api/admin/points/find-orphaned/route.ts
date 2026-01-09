import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 2023年のポイントレコードを検索
    const { data: oldPoints, error } = await supabase
      .from('points')
      .select('id, user_id, amount, type, created_at')
      .gte('created_at', '2023-01-01')
      .lt('created_at', '2024-01-01')
      .eq('type', 'regist')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Old points fetch error:', error);
      return NextResponse.json(
        { error: 'ポイントレコードの取得に失敗しました', details: error },
        { status: 500 }
      );
    }

    // 各レコードのユーザー作成日時を確認
    const orphanedRecords = [];
    
    for (const point of oldPoints || []) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, created_at')
        .eq('id', point.user_id)
        .single();

      if (userError || !user) {
        orphanedRecords.push({
          ...point,
          reason: 'ユーザーが存在しない'
        });
      } else {
        const userCreatedAt = new Date(user.created_at);
        const pointCreatedAt = new Date(point.created_at);
        
        // ポイント作成日時がユーザー作成日時より前の場合は異常
        if (pointCreatedAt < userCreatedAt) {
          orphanedRecords.push({
            ...point,
            user_email: user.email,
            user_created_at: user.created_at,
            reason: 'ポイント作成日時がユーザー作成日時より前'
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalOldPoints: oldPoints?.length || 0,
      orphanedRecords,
      orphanedCount: orphanedRecords.length
    });
  } catch (error) {
    console.error('Find orphaned error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
