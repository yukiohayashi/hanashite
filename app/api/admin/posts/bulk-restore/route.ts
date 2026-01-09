import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { auth } from '@/auth';

export async function POST(request: Request) {
  try {
    // 管理者権限チェック
    const session = await auth();
    if (!session || (session.user?.status && session.user.status < 2)) {
      return NextResponse.json(
        { success: false, error: '権限がありません' },
        { status: 403 }
      );
    }

    const { postIds } = await request.json();

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '復元する投稿IDが指定されていません' },
        { status: 400 }
      );
    }

    // 投稿を復元（statusをpublishedに変更）
    const { error } = await supabase
      .from('posts')
      .update({ status: 'published' })
      .in('id', postIds);

    if (error) {
      console.error('Restore error:', error);
      return NextResponse.json(
        { success: false, error: '復元に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${postIds.length}件の投稿を復元して公開しました`
    });
  } catch (error) {
    console.error('Bulk restore error:', error);
    return NextResponse.json(
      { success: false, error: '復元に失敗しました' },
      { status: 500 }
    );
  }
}
