import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// postsのuser_idを1001-1010の間でランダムに更新するAPI（開発用）
export async function POST() {
  try {
    // すべての投稿を取得
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id')
      .order('id', { ascending: true });

    if (postsError || !posts) {
      return NextResponse.json({ error: 'Failed to fetch posts', details: postsError }, { status: 500 });
    }

    const results = [];
    const userIds = [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010];

    for (const post of posts) {
      // ランダムにuser_idを選択
      const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];

      // postsテーブルのuser_idを更新
      const { error: updateError } = await supabase
        .from('posts')
        .update({ user_id: randomUserId })
        .eq('id', post.id);

      if (updateError) {
        results.push({ post_id: post.id, error: updateError.message });
      } else {
        results.push({ post_id: post.id, new_user_id: randomUserId, success: true });
      }
    }

    return NextResponse.json({ 
      success: true, 
      total: posts.length,
      results 
    });
  } catch (error) {
    console.error('Error updating post users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
