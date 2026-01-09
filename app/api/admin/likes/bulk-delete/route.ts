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

    const { likeIds } = await request.json();

    if (!likeIds || !Array.isArray(likeIds) || likeIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '削除するいいねIDが指定されていません' },
        { status: 400 }
      );
    }

    // いいねを削除
    const { error } = await supabase
      .from('likes')
      .delete()
      .in('id', likeIds);

    if (error) {
      console.error('Bulk delete likes error:', error);
      return NextResponse.json(
        { success: false, error: '削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${likeIds.length}件のいいねを削除しました`
    });
  } catch (error) {
    console.error('Bulk delete likes error:', error);
    return NextResponse.json(
      { success: false, error: '削除に失敗しました' },
      { status: 500 }
    );
  }
}
