import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 管理者チェック（user_id: 1 または status: 3）
    const { data: userData } = await supabase
      .from('users')
      .select('status')
      .eq('id', session.user.id)
      .single();

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    if (!userData || (userData.status !== 3 && userId !== 1)) {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content, category_id, status, thumbnail_url, og_image, user_id } = body;

    // バリデーション
    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'タイトルと本文は必須です' },
        { status: 400 }
      );
    }

    // 投稿を作成
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        title,
        content,
        category_id: category_id || null,
        status: status || 'draft',
        thumbnail_url: thumbnail_url || null,
        og_image: og_image || null,
        user_id: user_id || session.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating post:', error);
      return NextResponse.json(
        { success: false, error: '投稿の作成に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      post,
    });
  } catch (error) {
    console.error('Error in create post API:', error);
    return NextResponse.json(
      { success: false, error: '投稿の作成に失敗しました' },
      { status: 500 }
    );
  }
}
