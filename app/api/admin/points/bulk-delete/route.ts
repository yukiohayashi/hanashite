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

    const { pointIds } = await request.json();

    if (!pointIds || !Array.isArray(pointIds) || pointIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '削除するポイントIDが指定されていません' },
        { status: 400 }
      );
    }

    // ポイント履歴を削除
    const { error } = await supabase
      .from('points')
      .delete()
      .in('id', pointIds);

    if (error) {
      console.error('Bulk delete points error:', error);
      return NextResponse.json(
        { success: false, error: '削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${pointIds.length}件のポイント履歴を削除しました`
    });
  } catch (error) {
    console.error('Bulk delete points error:', error);
    return NextResponse.json(
      { success: false, error: '削除に失敗しました' },
      { status: 500 }
    );
  }
}
