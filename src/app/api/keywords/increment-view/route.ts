import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { keywordIds } = await request.json();

    if (!keywordIds || !Array.isArray(keywordIds) || keywordIds.length === 0) {
      return NextResponse.json(
        { error: 'キーワードIDが必要です' },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin;

    // 各キーワードのview_countをインクリメント
    for (const keywordId of keywordIds) {
      const { error } = await supabase.rpc('increment_keyword_view_count', {
        keyword_id: keywordId
      });

      if (error) {
        console.error('キーワードview_count更新エラー:', error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('キーワードview_count更新エラー:', error);
    return NextResponse.json(
      { error: 'キーワードview_count更新に失敗しました' },
      { status: 500 }
    );
  }
}
