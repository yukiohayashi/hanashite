import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '../../lib/supabase';

export async function PUT(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const { postId, title, content, random, closeDate, closeTime, category } = await request.json();

    if (!postId || !title || !content) {
      return NextResponse.json(
        { success: false, error: '必須項目を入力してください' },
        { status: 400 }
      );
    }

    // 投稿の所有者確認
    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (!post || post.user_id.toString() !== session.user.id.toString()) {
      return NextResponse.json(
        { success: false, error: '権限がありません' },
        { status: 403 }
      );
    }

    // 投稿を更新
    const { error: updateError } = await supabase
      .from('posts')
      .update({
        title: title.trim(),
        content: content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', postId);

    if (updateError) {
      console.error('Post update error:', updateError);
      return NextResponse.json(
        { success: false, error: '投稿の更新に失敗しました' },
        { status: 500 }
      );
    }

    // 投票オプションを更新
    let closeAt = null;
    if (closeDate && closeTime) {
      closeAt = `${closeDate}T${closeTime}`;
    }

    const { error: voteOptionsError } = await supabase
      .from('vote_options')
      .update({
        random: random || false,
        close_at: closeAt
      })
      .eq('post_id', postId);

    if (voteOptionsError) {
      console.error('Vote options update error:', voteOptionsError);
    }

    return NextResponse.json({
      success: true,
      postId
    });
  } catch (error) {
    console.error('Edit error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
