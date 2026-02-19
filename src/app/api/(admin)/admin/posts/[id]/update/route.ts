import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// 管理者チェック
async function isAdmin() {
  const session = await auth();
  return session?.user?.status && session.user.status >= 2;
}

// 投稿更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const postId = parseInt(id);
  const body = await request.json();

  const { title, content, status, og_image, best_answer_id, created_at, deadline_at } = body;

  const updateData: Record<string, any> = {};

  if (title !== undefined) updateData.title = title;
  if (content !== undefined) updateData.content = content;
  if (status !== undefined) updateData.status = status;
  if (og_image !== undefined) updateData.og_image = og_image;
  if (created_at !== undefined) updateData.created_at = created_at;
  if (deadline_at !== undefined) updateData.deadline_at = deadline_at;

  // ベストアンサーの変更を処理
  let oldBestAnswerId: number | null = null;
  let newBestAnswerId: number | null = null;
  
  if (best_answer_id !== undefined) {
    // 現在のベストアンサーIDを取得
    const { data: currentPost } = await supabase
      .from('posts')
      .select('best_answer_id')
      .eq('id', postId)
      .single();
    
    oldBestAnswerId = currentPost?.best_answer_id || null;
    newBestAnswerId = best_answer_id;
    
    updateData.best_answer_id = best_answer_id;
    updateData.best_answer_selected_at = best_answer_id ? new Date().toISOString() : null;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    );
  }

  try {
    const { error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId);

    if (error) throw error;

    // ベストアンサーが変更された場合、ポイント処理を実行
    if (best_answer_id !== undefined && oldBestAnswerId !== newBestAnswerId) {
      // 古いベストアンサーのポイントを削除
      if (oldBestAnswerId) {
        const { data: oldComment } = await supabase
          .from('comments')
          .select('user_id')
          .eq('id', oldBestAnswerId)
          .single();
        
        if (oldComment?.user_id) {
          await supabase
            .from('points')
            .delete()
            .eq('user_id', oldComment.user_id)
            .eq('type', 'best_answer')
            .ilike('description', `%投稿ID: ${postId}%`);
        }
      }

      // 新しいベストアンサーにポイントを付与
      if (newBestAnswerId) {
        const { data: newComment } = await supabase
          .from('comments')
          .select('user_id')
          .eq('id', newBestAnswerId)
          .single();
        
        if (newComment?.user_id) {
          // ベストアンサーポイントを取得
          const { data: pointSetting } = await supabase
            .from('point_settings')
            .select('point_value')
            .eq('point_type', 'best_answer')
            .single();

          const pointValue = pointSetting?.point_value || 10;

          await supabase
            .from('points')
            .insert({
              user_id: newComment.user_id,
              points: pointValue,
              type: 'best_answer',
              description: `ベストアンサーに選ばれました（投稿ID: ${postId}）`,
              created_at: new Date().toISOString(),
            });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
}
