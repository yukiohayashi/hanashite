import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// お気に入り追加/削除
export async function POST(request: Request) {
  try {
    const { userId, postId } = await request.json();

    if (!userId || !postId) {
      return NextResponse.json(
        { success: false, error: 'ユーザーIDと投稿IDが必要です' },
        { status: 400 }
      );
    }

    // 既存のお気に入りを確認
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();

    let action = '';
    if (existing) {
      // 削除
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postId);
      action = 'removed';
    } else {
      // 追加
      await supabase
        .from('favorites')
        .insert({
          user_id: userId,
          post_id: postId,
          created_at: new Date().toISOString()
        });
      action = 'added';
    }

    // お気に入り数を取得
    const { count } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    return NextResponse.json({
      success: true,
      action,
      count: count || 0
    });
  } catch (error) {
    console.error('Favorites error:', error);
    return NextResponse.json(
      { success: false, error: 'お気に入りの処理に失敗しました' },
      { status: 500 }
    );
  }
}

// ユーザーのお気に入り一覧取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // お気に入りの投稿IDを取得
    const { data: favorites } = await supabase
      .from('favorites')
      .select('post_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!favorites || favorites.length === 0) {
      return NextResponse.json({
        success: true,
        posts: [],
        total: 0
      });
    }

    const postIds = favorites.map(f => f.post_id);

    // 投稿情報を取得
    const { data: posts } = await supabase
      .from('posts')
      .select('id, title, created_at, user_id, og_image, thumbnail_url, best_answer_id')
      .in('id', postIds);

    if (!posts) {
      return NextResponse.json({
        success: true,
        posts: [],
        total: 0
      });
    }

    // ユーザー情報を取得
    const userIds = [...new Set(posts.map(p => p.user_id))];
    const { data: users } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds);

    // 投稿にユーザー名を追加
    const postsWithUsers = posts.map(post => ({
      ...post,
      user_name: users?.find(u => u.id === post.user_id)?.name || 'ゲスト'
    }));

    // お気に入りの順序に並び替え
    const sortedPosts = favorites
      .map(f => postsWithUsers.find(p => p.id === f.post_id))
      .filter(p => p !== undefined);

    // 総数を取得
    const { count: total } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return NextResponse.json({
      success: true,
      posts: sortedPosts,
      total: total || 0
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    return NextResponse.json(
      { success: false, error: 'お気に入りの取得に失敗しました' },
      { status: 500 }
    );
  }
}
