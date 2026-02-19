import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { auth } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const postId = parseInt(id);
    const { best_answer_id } = await request.json();

    // 投稿の所有者を確認
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // コメントが存在するか確認
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id, user_id')
      .eq('id', best_answer_id)
      .eq('post_id', postId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // ベストアンサーを更新
    const { data, error } = await supabase
      .from('posts')
      .update({
        best_answer_id,
        best_answer_selected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ベストアンサーポイントを取得
    const { data: pointSetting } = await supabase
      .from('point_settings')
      .select('point_value')
      .eq('point_type', 'best_answer')
      .single();

    const pointValue = pointSetting?.point_value || 10;

    // コメント投稿者にポイントを付与
    if (comment.user_id) {
      await supabase
        .from('points')
        .insert({
          user_id: comment.user_id,
          points: pointValue,
          type: 'best_answer',
          description: `ベストアンサーに選ばれました（投稿ID: ${postId}）`,
          created_at: new Date().toISOString(),
        });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating best answer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const postId = parseInt(id);

    // 投稿の所有者を確認
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('user_id, best_answer_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ベストアンサーのコメント投稿者を取得
    let commentUserId = null;
    if (post.best_answer_id) {
      const { data: comment } = await supabase
        .from('comments')
        .select('user_id')
        .eq('id', post.best_answer_id)
        .single();
      
      commentUserId = comment?.user_id;
    }

    // ベストアンサーを解除
    const { data, error } = await supabase
      .from('posts')
      .update({
        best_answer_id: null,
        best_answer_selected_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ベストアンサーポイントのレコードを削除
    if (commentUserId) {
      await supabase
        .from('points')
        .delete()
        .eq('user_id', commentUserId)
        .eq('type', 'best_answer')
        .ilike('description', `%投稿ID: ${postId}%`);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error removing best answer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
