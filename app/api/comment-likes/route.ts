import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { commentId, userId } = await request.json();

    if (!commentId) {
      return NextResponse.json(
        { success: false, error: 'コメントIDが必要です' },
        { status: 400 }
      );
    }

    // ユーザーIDが指定されていない場合はゲストとして扱う
    const effectiveUserId = userId || null;

    // 既存のいいねを確認
    const { data: existingLike, error: likeError } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', effectiveUserId)
      .eq('like_type', 'comment')
      .eq('target_id', commentId)
      .maybeSingle();

    let liked = false;

    if (existingLike && !likeError) {
      // いいねを削除
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id);
      
      if (deleteError) {
        console.error('Like delete error:', deleteError);
        throw deleteError;
      }
      
      liked = false;
      console.log('Comment like removed:', { commentId, userId: effectiveUserId });
    } else {
      // いいねを追加
      const { data: newLike, error: insertError } = await supabase
        .from('likes')
        .insert({
          user_id: effectiveUserId,
          like_type: 'comment',
          target_id: commentId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Like insert error:', insertError);
        throw insertError;
      }
      
      liked = true;
      console.log('Comment like added:', { commentId, userId: effectiveUserId, likeId: newLike?.id });
    }

    // いいね数を取得
    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('like_type', 'comment')
      .eq('target_id', commentId);

    return NextResponse.json({
      success: true,
      liked,
      likeCount: count || 0
    });
  } catch (error) {
    console.error('Comment like error:', error);
    return NextResponse.json(
      { success: false, error: 'いいねの処理に失敗しました' },
      { status: 500 }
    );
  }
}
