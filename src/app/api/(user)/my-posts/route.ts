import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // 自分の投稿を取得
    const { data: posts, error, count } = await supabase
      .from('posts')
      .select('id, title, created_at, og_image, thumbnail_url, best_answer_id', { count: 'exact' })
      .eq('user_id', userId)
      .in('status', ['publish', 'published'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Posts fetch error:', error);
      return NextResponse.json(
        { success: false, error: '投稿の取得に失敗しました' },
        { status: 500 }
      );
    }

    // 各投稿の投票数とコメント数を取得
    const postsWithStats = await Promise.all(
      (posts || []).map(async (post) => {
        // 投票数を取得
        const { count: voteCount } = await supabase
          .from('votes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        // コメント数を取得
        const { count: commentCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id)
          .eq('status', 'approved');

        return {
          ...post,
          vote_count: voteCount || 0,
          comment_count: commentCount || 0
        };
      })
    );

    return NextResponse.json({
      success: true,
      posts: postsWithStats,
      total: count || 0,
      page,
      hasMore: count ? offset + limit < count : false
    });
  } catch (error) {
    console.error('My posts error:', error);
    return NextResponse.json(
      { success: false, error: '投稿の取得に失敗しました' },
      { status: 500 }
    );
  }
}
