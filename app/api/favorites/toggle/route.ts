import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { toggleFavorite } from '../../../lib/favorites';

export async function POST(request: NextRequest) {
  const session = await auth();

  console.log('=== API: お気に入りトグル ===');
  console.log('Session:', session);

  if (!session || !session.user?.id) {
    console.log('エラー: セッションなし');
    return NextResponse.json(
      { error: 'ログインが必要です' },
      { status: 401 }
    );
  }

  try {
    const { post_id } = await request.json();
    console.log('Post ID:', post_id);

    if (!post_id) {
      console.log('エラー: 投稿IDなし');
      return NextResponse.json(
        { error: '投稿IDが不正です' },
        { status: 400 }
      );
    }

    const userId = parseInt(session.user.id);
    console.log('User ID:', userId);
    
    const result = await toggleFavorite(userId, post_id);
    console.log('Toggle結果:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('お気に入りトグルエラー:', error);
    return NextResponse.json(
      { error: 'お気に入りの更新に失敗しました' },
      { status: 500 }
    );
  }
}
