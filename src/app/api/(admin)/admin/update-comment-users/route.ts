import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// commentsのuser_idを更新するAPI（開発用）
// 2001-2010, 964, またはゲスト投稿（NULL）をランダムに設定
export async function POST() {
  try {
    // 2001-2010のユーザーID + 964
    const userIds = [2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 964];
    
    let totalUpdated = 0;
    let guestCount = 0;
    let userCount = 0;
    let errorCount = 0;
    const batchSize = 1000;
    let lastId = 0;
    
    // バッチ処理で全件更新
    while (true) {
      // バッチでコメントを取得
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('id')
        .gt('id', lastId)
        .order('id', { ascending: true })
        .limit(batchSize);

      if (commentsError) {
        return NextResponse.json({ error: 'Failed to fetch comments', details: commentsError }, { status: 500 });
      }

      if (!comments || comments.length === 0) {
        break; // 全件処理完了
      }

      // 各コメントを更新
      for (const comment of comments) {
        // 20%の確率でゲスト投稿（NULL）にする
        const isGuest = Math.random() < 0.2;
        
        let newUserId: number | null;
        if (isGuest) {
          newUserId = null;
          guestCount++;
        } else {
          // ランダムにuser_idを選択
          newUserId = userIds[Math.floor(Math.random() * userIds.length)];
          userCount++;
        }

        // commentsテーブルのuser_idを更新
        const { error: updateError } = await supabase
          .from('comments')
          .update({ user_id: newUserId })
          .eq('id', comment.id);

        if (updateError) {
          errorCount++;
        } else {
          totalUpdated++;
        }
        
        lastId = comment.id;
      }
      
      console.log(`Processed batch, lastId: ${lastId}, totalUpdated: ${totalUpdated}`);
    }

    return NextResponse.json({ 
      success: true, 
      total_updated: totalUpdated,
      guest_count: guestCount,
      user_count: userCount,
      error_count: errorCount
    });
  } catch (error) {
    console.error('Error updating comment users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
