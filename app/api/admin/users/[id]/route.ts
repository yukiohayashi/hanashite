import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// 管理者チェック
async function isAdmin() {
  const session = await auth();
  return session?.user?.id ? Number(session.user.id) === 33 : false;
}

// ユーザーBAN/BAN解除、status変更
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!await isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = parseInt(id);
  const body = await request.json();
  const { is_banned, status } = body;

  const updateData: any = {};

  if (typeof is_banned === 'boolean') {
    updateData.is_banned = is_banned;
  }

  if (typeof status === 'number' && (status >= 0 && status <= 3 || status === 6)) {
    updateData.status = status;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    );
  }

  try {
    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
