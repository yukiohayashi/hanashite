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

    const { postIds, permanentDelete } = await request.json();

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '削除する投稿IDが指定されていません' },
        { status: 400 }
      );
    }

    if (permanentDelete) {
      // 完全削除
      const { error } = await supabase
        .from('posts')
        .delete()
        .in('id', postIds);

      if (error) {
        console.error('Permanent delete error:', error);
        return NextResponse.json(
          { success: false, error: '完全削除に失敗しました' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `${postIds.length}件の投稿を完全に削除しました`
      });
    } else {
      // ゴミ箱に移動
      const { error } = await supabase
        .from('posts')
        .update({ status: 'trash' })
        .in('id', postIds);

      if (error) {
        console.error('Move to trash error:', error);
        return NextResponse.json(
          { success: false, error: 'ゴミ箱への移動に失敗しました' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `${postIds.length}件の投稿をゴミ箱に移動しました`
      });
    }
  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json(
      { success: false, error: '削除に失敗しました' },
      { status: 500 }
    );
  }
}
