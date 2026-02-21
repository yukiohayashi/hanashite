import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { postId, content, parentId, userId } = await request.json();

    if (!postId || !content) {
      return NextResponse.json(
        { success: false, error: '投稿IDとコメント内容が必要です' },
        { status: 400 }
      );
    }

    if (content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'コメント内容を入力してください' },
        { status: 400 }
      );
    }

    // コメントを挿入
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content: content.trim(),
        status: 'approved',
        parent_id: parentId || null
      })
      .select('id, content, created_at, user_id, parent_id')
      .single();

    if (error) {
      console.error('Comment insert error:', error);
      return NextResponse.json(
        { success: false, error: 'コメントの投稿に失敗しました: ' + error.message },
        { status: 500 }
      );
    }

    // ユーザー情報を取得（アバター含む）
    let userInfo: { name: string; image?: string | null; avatar_style?: string | null; avatar_seed?: string | null; use_custom_image?: boolean | null } = { name: 'ゲスト' };
    if (comment.user_id) {
      const { data: user } = await supabase
        .from('users')
        .select('name, image, avatar_style, avatar_seed, use_custom_image')
        .eq('id', comment.user_id)
        .single();
      
      if (user) {
        userInfo = {
          name: user.name || 'ゲスト',
          image: user.image,
          avatar_style: user.avatar_style,
          avatar_seed: user.avatar_seed,
          use_custom_image: user.use_custom_image,
        };
      }
    }

    return NextResponse.json({
      success: true,
      comment: {
        ...comment,
        users: userInfo,
        like_count: 0
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
