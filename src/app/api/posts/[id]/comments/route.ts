import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parseInt(id);

    if (isNaN(postId)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    // commentsとusersをJOINして取得
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        user_id,
        users (
          name,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // データを変換
    const comments = data?.map(comment => {
      const user = comment.users as { name?: string; avatar_url?: string } | null;
      return {
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        user_id: comment.user_id,
        user_name: user?.name || '匿名',
        avatar_url: user?.avatar_url
      };
    }) || [];

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error in comments API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
