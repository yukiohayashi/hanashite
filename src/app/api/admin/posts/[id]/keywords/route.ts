import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parseInt(id);
    const { keywordIds } = await request.json();

    if (!Array.isArray(keywordIds)) {
      return NextResponse.json(
        { error: 'キーワードIDの配列が必要です' },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin;

    // 既存のキーワード関連付けを削除
    await supabase
      .from('post_keywords')
      .delete()
      .eq('post_id', postId);

    // 新しいキーワード関連付けを追加
    if (keywordIds.length > 0) {
      const postKeywords = keywordIds.map(keywordId => ({
        post_id: postId,
        keyword_id: keywordId
      }));

      const { error: insertError } = await supabase
        .from('post_keywords')
        .insert(postKeywords);

      if (insertError) {
        console.error('キーワード関連付けエラー:', insertError);
        return NextResponse.json(
          { error: 'キーワードの関連付けに失敗しました' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('キーワード更新エラー:', error);
    return NextResponse.json(
      { error: 'キーワード更新に失敗しました' },
      { status: 500 }
    );
  }
}
