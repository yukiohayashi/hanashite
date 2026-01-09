import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = parseInt(params.id);

    // 投稿を取得
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, title, content')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }

    // OpenAI APIでカテゴリとキーワードを分析
    const result = await analyzePostWithAI(post.title, post.content);

    if (!result) {
      return NextResponse.json(
        { error: 'AI分析に失敗しました' },
        { status: 500 }
      );
    }

    // カテゴリを割り当て
    if (result.category_id) {
      await assignCategory(postId, result.category_id);
    }

    // キーワードを割り当て
    if (result.keywords && result.keywords.length > 0) {
      await assignKeywords(postId, result.keywords);
    }

    // タグ付け完了フラグを設定
    await supabase
      .from('posts')
      .update({
        ai_tagged: true,
        ai_tagged_date: new Date().toISOString(),
      })
      .eq('id', postId);

    return NextResponse.json({
      success: true,
      post_id: postId,
      category_id: result.category_id,
      keywords: result.keywords,
    });
  } catch (error) {
    console.error('AI tagging error:', error);
    return NextResponse.json(
      { error: 'AI自動タグ付けに失敗しました' },
      { status: 500 }
    );
  }
}

// OpenAI APIで投稿を分析
async function analyzePostWithAI(title: string, content: string) {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    return null;
  }

  const openai = new OpenAI({ apiKey: openaiApiKey });

  // 利用可能なカテゴリを取得
  const { data: categories } = await supabase
    .from('keywords')
    .select('id, keyword')
    .eq('keyword_type', 'category')
    .order('keyword');

  const categoryList = categories?.map(c => `${c.id}: ${c.keyword}`).join('\n') || '';

  const prompt = `以下の投稿内容を分析して、最適なカテゴリ1つとキーワード最大5つを抽出してください。

【投稿タイトル】
${title}

【投稿内容】
${content}

【利用可能なカテゴリ】
${categoryList}

以下のJSON形式で出力してください：
{
  "category_id": カテゴリID（数値、最も適切なもの1つ）,
  "keywords": ["キーワード1", "キーワード2", ...] （最大5つ、日本語）
}

※ カテゴリは上記リストから最も適切なものを1つ選択してください
※ キーワードは投稿内容から重要なものを抽出してください`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content;

    if (content) {
      const jsonMatch = content.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          category_id: result.category_id,
          keywords: result.keywords || [],
        };
      }
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
  }

  return null;
}

// カテゴリを割り当て
async function assignCategory(postId: number, categoryId: number) {
  // 既存のカテゴリを削除
  await supabase
    .from('post_categories')
    .delete()
    .eq('post_id', postId);

  // 新しいカテゴリを割り当て
  await supabase
    .from('post_categories')
    .insert({
      post_id: postId,
      category_id: categoryId,
      is_primary: true,
    });
}

// キーワードを割り当て
async function assignKeywords(postId: number, keywords: string[]) {
  // 既存のキーワードを取得または作成
  for (const keyword of keywords.slice(0, 5)) {
    // キーワードが存在するか確認
    let { data: existingKeyword } = await supabase
      .from('keywords')
      .select('id')
      .eq('keyword', keyword)
      .eq('keyword_type', 'tag')
      .single();

    let keywordId: number;

    if (existingKeyword) {
      keywordId = existingKeyword.id;
    } else {
      // 新しいキーワードを作成
      const { data: newKeyword } = await supabase
        .from('keywords')
        .insert({
          keyword: keyword,
          slug: keyword.toLowerCase().replace(/\s+/g, '-'),
          keyword_type: 'tag',
        })
        .select('id')
        .single();

      if (!newKeyword) continue;
      keywordId = newKeyword.id;
    }

    // 投稿とキーワードを関連付け（重複チェック）
    const { data: existing } = await supabase
      .from('post_keywords')
      .select('id')
      .eq('post_id', postId)
      .eq('keyword_id', keywordId)
      .single();

    if (!existing) {
      await supabase
        .from('post_keywords')
        .insert({
          post_id: postId,
          keyword_id: keywordId,
        });
    }

    // キーワードの投稿数を更新
    await supabase.rpc('increment_keyword_post_count', {
      keyword_id: keywordId,
    });
  }
}
