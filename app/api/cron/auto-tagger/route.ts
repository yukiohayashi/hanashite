import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';

async function getSettings() {
  const { data, error } = await supabase
    .from('auto_creator_settings')
    .select('*');

  if (error) {
    throw new Error('設定の取得に失敗しました');
  }

  const settings: Record<string, string> = {};
  data?.forEach((item) => {
    settings[item.setting_key] = item.setting_value;
  });

  return settings;
}

async function analyzePostWithAI(title: string, content: string, openaiApiKey: string) {
  const openai = new OpenAI({ apiKey: openaiApiKey });

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('name');

  const categoryList = categories?.map(c => `${c.id}: ${c.name}`).join('\n') || '';

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

    const responseContent = completion.choices[0]?.message?.content;

    if (responseContent) {
      const jsonMatch = responseContent.match(/\{[^}]+\}/);
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

async function assignCategory(postId: number, categoryId: number) {
  await supabase
    .from('post_categories')
    .delete()
    .eq('post_id', postId);

  await supabase
    .from('post_categories')
    .insert({
      post_id: postId,
      category_id: categoryId,
      is_primary: true,
    });
}

async function assignKeywords(postId: number, keywords: string[]) {
  for (const keyword of keywords.slice(0, 5)) {
    const { data: existingKeyword } = await supabase
      .from('keywords')
      .select('id')
      .eq('name', keyword)
      .single();

    let keywordId: number;

    if (existingKeyword) {
      keywordId = existingKeyword.id;
    } else {
      const { data: newKeyword } = await supabase
        .from('keywords')
        .insert({
          name: keyword,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (!newKeyword) continue;
      keywordId = newKeyword.id;
    }

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
  }
}

async function logExecution(
  status: string,
  postId?: number,
  message?: string,
  errorMessage?: string
) {
  await supabase.from('auto_tagger_logs').insert({
    execution_type: 'cron',
    status,
    post_id: postId,
    message,
    error_message: errorMessage,
    executed_at: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('x-api-secret');
    if (authHeader !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getSettings();

    if (settings.auto_tagger_enabled !== 'true') {
      console.log('AI自動タグ付けが停止中です');
      return NextResponse.json({
        success: false,
        message: 'AI自動タグ付けが停止中です',
      });
    }

    // 実行間隔チェック（ゆらぎを含む）
    const executionInterval = 30; // 30分固定
    const executionVariance = 10; // ±10分
    
    const { data: lastExecution } = await supabase
      .from('auto_tagger_logs')
      .select('executed_at')
      .eq('status', 'success')
      .order('executed_at', { ascending: false })
      .limit(1)
      .single();

    if (lastExecution) {
      const lastExecutedAt = new Date(lastExecution.executed_at);
      const now = new Date();
      const minutesSinceLastExecution = (now.getTime() - lastExecutedAt.getTime()) / 60000;
      
      const randomVariance = Math.floor(Math.random() * (executionVariance * 2 + 1)) - executionVariance;
      const requiredInterval = executionInterval + randomVariance;
      
      console.log(`最終実行: ${lastExecutedAt.toLocaleString('ja-JP')}`);
      console.log(`経過時間: ${minutesSinceLastExecution.toFixed(1)}分`);
      console.log(`必要間隔: ${requiredInterval}分 (基本${executionInterval}分 + ゆらぎ${randomVariance}分)`);
      
      if (minutesSinceLastExecution < requiredInterval) {
        console.log('まだ実行間隔に達していません');
        return NextResponse.json({
          success: false,
          message: `次回実行まで${(requiredInterval - minutesSinceLastExecution).toFixed(1)}分`,
        });
      }
    }

    console.log('実行間隔チェック通過 - AI自動タグ付けを開始します');

    if (settings.auto_tagger_enabled !== 'true') {
      console.log('AI自動タグ付けが停止中です（再チェック）');
      return NextResponse.json({
        success: false,
        message: 'AI自動タグ付けが停止中です',
      });
    }

    const { data: untaggedPosts } = await supabase
      .from('posts')
      .select('id, title, content')
      .or('ai_tagged.is.null,ai_tagged.eq.false')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!untaggedPosts || untaggedPosts.length === 0) {
      console.log('未タグ付け投稿がありません');
      return NextResponse.json({
        success: false,
        message: '未タグ付け投稿がありません',
      });
    }

    const openaiApiKey = settings.openai_api_key || process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      await logExecution('failed', undefined, undefined, 'OpenAI APIキーが設定されていません');
      return NextResponse.json({
        success: false,
        error: 'OpenAI APIキーが設定されていません',
      });
    }

    let taggedCount = 0;
    const maxPerRun = parseInt(settings.auto_tagger_posts_per_run || '5');

    for (const post of untaggedPosts.slice(0, maxPerRun)) {
      try {
        const result = await analyzePostWithAI(post.title, post.content || '', openaiApiKey);

        if (result && result.category_id) {
          await assignCategory(post.id, result.category_id);
        }

        if (result && result.keywords && result.keywords.length > 0) {
          await assignKeywords(post.id, result.keywords);
        }

        await supabase
          .from('posts')
          .update({
            ai_tagged: true,
            ai_tagged_date: new Date().toISOString(),
          })
          .eq('id', post.id);

        await logExecution('success', post.id, `タグ付け完了: ${post.title}`);
        taggedCount++;

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Post ${post.id} tagging error:`, error);
        await logExecution('error', post.id, undefined, error instanceof Error ? error.message : 'タグ付けエラー');
      }
    }

    return NextResponse.json({
      success: true,
      message: `${taggedCount}件の投稿にタグ付けしました`,
      tagged_count: taggedCount,
    });
  } catch (error) {
    console.error('CRON auto-tagger error:', error);
    const errorMessage = error instanceof Error ? error.message : '実行に失敗しました';

    await logExecution('error', undefined, undefined, errorMessage);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
