import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'top_post';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('posts')
      .select('id, title, content, created_at, user_id, best_answer_id, best_answer_selected_at, category_id, categories(name)')
      .in('status', ['publish', 'published'])
      .is('best_answer_id', null)
      .is('best_answer_selected_at', null);

    // ソート条件
    switch (sort) {
      case 'notvoted':
        query = query.eq('vote_count', 0).order('created_at', { ascending: false });
        break;
      case 'top_post':
        query = query.order('created_at', { ascending: false });
        break;
      case 'comment':
        query = query.order('comment_count', { ascending: false });
        break;
      default: // recommend
        query = query.order('created_at', { ascending: false });
        break;
    }

    const { data: postsData, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!postsData || postsData.length === 0) {
      return NextResponse.json({ posts: [], hasMore: false });
    }

    // ユーザー情報を取得
    const userIds = [...new Set(postsData.map(p => p.user_id).filter(id => id !== null))];
    const { data: usersData } = await supabase
      .from('users')
      .select('id, name, avatar_style, avatar_seed, use_custom_image, image')
      .in('id', userIds);

    const posts = postsData.map(post => {
      const user = usersData?.find(u => u.id === post.user_id);
      let avatarUrl: string;
      if (user?.use_custom_image && user?.image) {
        avatarUrl = user.image;
      } else {
        const seed = user?.avatar_seed || String(post.user_id) || 'guest';
        const style = user?.avatar_style || 'big-smile';
        avatarUrl = `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=20`;
      }
      return {
        id: post.id,
        title: post.title,
        content: post.content,
        created_at: post.created_at,
        user_name: user?.name || null,
        avatar_url: avatarUrl,
        category_id: (post as any).category_id || null,
        category_name: (post as any).categories?.name || null
      };
    });

    // 次のページがあるかチェック
    const { count } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .in('status', ['publish', 'published'])
      .is('best_answer_id', null)
      .is('best_answer_selected_at', null);

    const hasMore = offset + postsData.length < (count || 0);

    return NextResponse.json({ posts, hasMore });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
