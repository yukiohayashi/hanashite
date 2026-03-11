import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    // 管理者チェック
    if (!session?.user || (session.user.status !== 1 && session.user.status !== 2)) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const commentId = params.id;

    // コメントを削除（status を 'trash' に変更）
    const { error } = await supabase
      .from('comments')
      .update({ status: 'trash' })
      .eq('id', commentId);

    if (error) {
      console.error('コメント削除エラー:', error);
      return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('コメント削除エラー:', error);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
