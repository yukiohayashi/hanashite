import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // すべてのキーワードを取得
    const { data: allKeywords, error: keywordsError } = await supabaseAdmin
      .from('keywords')
      .select('id, keyword, description, keyword_type, created_at');

    if (keywordsError) {
      console.error('Error fetching keywords:', keywordsError);
      return NextResponse.json({ error: keywordsError.message }, { status: 500 });
    }

    // post_keywordsに存在するkeyword_idを取得
    const { data: linkedKeywordIds, error: linkedError } = await supabaseAdmin
      .from('post_keywords')
      .select('keyword_id');

    if (linkedError) {
      console.error('Error fetching linked keywords:', linkedError);
      return NextResponse.json({ error: linkedError.message }, { status: 500 });
    }

    // 紐付けられているkeyword_idのセットを作成
    const linkedIds = new Set(linkedKeywordIds?.map(item => item.keyword_id) || []);

    // 紐付けられていないキーワードをフィルタリング
    const orphanedKeywords = allKeywords?.filter(keyword => !linkedIds.has(keyword.id)) || [];

    return NextResponse.json({ keywords: orphanedKeywords });
  } catch (error) {
    console.error('Error fetching orphaned keywords:', error);
    return NextResponse.json({ error: '孤立したキーワードの取得に失敗しました' }, { status: 500 });
  }
}
