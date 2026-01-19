import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content, category_id, status, thumbnail_url, og_image, user_id } = body;

    // バリデーション
    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'タイトルと本文は必須です' },
        { status: 400 }
      );
    }

    if (user_id !== 33) {
      return NextResponse.json(
        { success: false, error: '管理者のみが投稿を作成できます' },
        { status: 403 }
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
        user_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
