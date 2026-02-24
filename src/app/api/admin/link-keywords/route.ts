import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    // すべてのキーワードを取得
    const { data: keywords, error: keywordsError } = await supabaseAdmin
      .from('keywords')
      .select('id, keyword');

    if (keywordsError) {
      return NextResponse.json({ error: keywordsError.message }, { status: 500 });
    }

    if (!keywords || keywords.length === 0) {
      return NextResponse.json({ message: 'キーワードが見つかりませんでした' });
    }

    let totalLinked = 0;

    // 各キーワードについて処理
    for (const keyword of keywords) {
      // このキーワードを含む投稿を検索
      const { data: posts, error: postsError } = await supabaseAdmin
        .from('posts')
        .select('id')
        .or(`title.ilike.%${keyword.keyword}%,content.ilike.%${keyword.keyword}%`)
        .in('status', ['publish', 'published']);

      if (postsError) {
        console.error(`Error fetching posts for keyword ${keyword.keyword}:`, postsError);
        continue;
      }

      if (!posts || posts.length === 0) {
        continue;
      }

      // 各投稿とキーワードを紐付け
      for (const post of posts) {
        // 既に紐付けが存在するか確認
        const { data: existing } = await supabaseAdmin
          .from('post_keywords')
          .select('id')
          .eq('post_id', post.id)
          .eq('keyword_id', keyword.id)
          .single();

        if (!existing) {
          // 紐付けを作成
          const { error: linkError } = await supabaseAdmin
            .from('post_keywords')
            .insert({ post_id: post.id, keyword_id: keyword.id });

          if (!linkError) {
            totalLinked++;
          }
        }
      }
    }

    return NextResponse.json({
      message: `${totalLinked}件の投稿とキーワードを紐付けました`,
      linked: totalLinked,
    });
  } catch (error) {
    console.error('Error linking keywords:', error);
    return NextResponse.json({ error: 'キーワードの紐付けに失敗しました' }, { status: 500 });
  }
}
