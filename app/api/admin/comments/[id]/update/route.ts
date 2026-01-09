import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// 管理者チェック
async function isAdmin() {
  const session = await auth();
  return session?.user?.status && session.user.status >= 2;
}

// コメント更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const commentId = parseInt(id);
  const body = await request.json();

  const { content } = body;

  if (!content) {
    return NextResponse.json(
      { error: 'Content is required' },
      { status: 400 }
    );
  }

  try {
    console.log('Updating comment:', commentId, 'with content:', content);
    
    const { data, error } = await supabase
      .from('comments')
      .update({ content })
      .eq('id', commentId)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Update successful:', data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { error: 'Failed to update comment', details: error },
      { status: 500 }
    );
  }
}
