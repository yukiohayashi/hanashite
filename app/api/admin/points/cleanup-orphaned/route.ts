import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE() {
  try {
    // 2023年のポイントレコードを検索
    const { data: oldPoints, error: fetchError } = await supabase
      .from('points')
      .select('id, user_id, created_at')
      .gte('created_at', '2023-01-01')
      .lt('created_at', '2024-01-01')
      .eq('type', 'regist');

    if (fetchError) {
      return NextResponse.json(
        { error: 'ポイントレコードの取得に失敗しました', details: fetchError },
        { status: 500 }
      );
    }

    const orphanedIds = [];
    
    // 各レコードのユーザーが存在するか確認
    for (const point of oldPoints || []) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, created_at')
        .eq('id', point.user_id)
        .single();

      if (userError || !user) {
        // ユーザーが存在しない
        orphanedIds.push(point.id);
      } else {
        const userCreatedAt = new Date(user.created_at);
        const pointCreatedAt = new Date(point.created_at);
        
        // ポイント作成日時がユーザー作成日時より前の場合は異常
        if (pointCreatedAt < userCreatedAt) {
          orphanedIds.push(point.id);
        }
      }
    }

    if (orphanedIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: '削除対象のレコードはありません',
        deletedCount: 0
      });
    }

    // 孤立したレコードを削除
    const { error: deleteError } = await supabase
      .from('points')
      .delete()
      .in('id', orphanedIds);

    if (deleteError) {
      return NextResponse.json(
        { error: '削除に失敗しました', details: deleteError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${orphanedIds.length}件の孤立したポイントレコードを削除しました`,
      deletedCount: orphanedIds.length,
      deletedIds: orphanedIds.slice(0, 10) // 最初の10件のIDを返す
    });
  } catch (error) {
    console.error('Cleanup orphaned error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
