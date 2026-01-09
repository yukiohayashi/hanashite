import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isFavorited, getFavoriteCount } from '../../../lib/favorites';

export async function GET(request: NextRequest) {
  const session = await auth();
  const searchParams = request.nextUrl.searchParams;
  const postId = searchParams.get('post_id');

  if (!postId) {
    return NextResponse.json(
      { error: '投稿IDが必要です' },
      { status: 400 }
    );
  }

  try {
    const count = await getFavoriteCount(parseInt(postId));
    
    if (!session || !session.user?.id) {
      return NextResponse.json({
        is_favorited: false,
        count
      });
    }

    const userId = parseInt(session.user.id);
    const is_favorited = await isFavorited(userId, parseInt(postId));

    return NextResponse.json({
      is_favorited,
      count
    });
  } catch (error) {
    console.error('お気に入りチェックエラー:', error);
    return NextResponse.json(
      { error: 'お気に入り状態の取得に失敗しました' },
      { status: 500 }
    );
  }
}
