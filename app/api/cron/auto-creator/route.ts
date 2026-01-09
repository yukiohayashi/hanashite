import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateAnke } from '@/lib/chatgpt';
import Parser from 'rss-parser';

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet?: string;
  content?: string;
  enclosure?: {
    url: string;
  };
}

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

async function isProcessed(articleUrl: string) {
  const { data, error } = await supabase
    .from('auto_creator_processed')
    .select('id')
    .eq('article_url', articleUrl)
    .single();

  return !error && data;
}

async function isBlackoutTime(startHour: number, endHour: number): Promise<boolean> {
  const now = new Date();
  const currentHour = now.getHours();

  if (startHour > endHour) {
    return currentHour >= startHour || currentHour < endHour;
  } else {
    return currentHour >= startHour && currentHour < endHour;
  }
}

async function selectQuestioner(aiProbability: number) {
  const useAI = Math.random() * 100 < aiProbability;
  const status = useAI ? 6 : 2;

  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('status', status)
    .limit(100);

  if (!users || users.length === 0) {
    throw new Error('質問者が見つかりません');
  }

  const randomUser = users[Math.floor(Math.random() * users.length)];
  return randomUser.id;
}

async function logExecution(
  status: string,
  sourceUrl: string,
  articleUrl?: string,
  postId?: number,
  message?: string,
  errorMessage?: string
) {
  await supabase.from('auto_creator_logs').insert({
    execution_type: 'cron',
    status,
    source_url: sourceUrl,
    article_url: articleUrl,
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

    if (settings.is_enabled !== 'true') {
      console.log('自動作成が停止中です');
      return NextResponse.json({
        success: false,
        message: '自動作成が停止中です',
      });
    }

    const startHour = parseInt(settings.no_create_start_hour || '0');
    const endHour = parseInt(settings.no_create_end_hour || '6');

    if (await isBlackoutTime(startHour, endHour)) {
      console.log('作成しない時間帯です');
      return NextResponse.json({
        success: false,
        message: '作成しない時間帯です',
      });
    }

    const scrapingUrls = JSON.parse(settings.scraping_urls || '[]');

    if (scrapingUrls.length === 0) {
      await logExecution('failed', '', undefined, undefined, undefined, 'スクレイピングURLが設定されていません');
      return NextResponse.json({
        success: false,
        error: 'スクレイピングURLが設定されていません',
      });
    }

    const randomUrl = scrapingUrls[Math.floor(Math.random() * scrapingUrls.length)];
    console.log('選択されたURL:', randomUrl);

    const parser = new Parser({
      customFields: {
        item: ['enclosure'],
      },
    });

    const feed = await parser.parseURL(randomUrl);
    const articles: Array<{
      title: string;
      link: string;
      content: string;
      image: string;
    }> = [];

    for (const item of feed.items.slice(0, 10)) {
      const rssItem = item as RSSItem;
      const isAlreadyProcessed = await isProcessed(rssItem.link || '');

      if (!isAlreadyProcessed) {
        articles.push({
          title: rssItem.title || '',
          link: rssItem.link || '',
          content: rssItem.contentSnippet || rssItem.content || '',
          image: rssItem.enclosure?.url || '',
        });
      }
    }

    if (articles.length === 0) {
      await logExecution('failed', randomUrl, undefined, undefined, undefined, '未処理の記事がありません');
      return NextResponse.json({
        success: false,
        message: '未処理の記事がありません',
      });
    }

    const article = articles[0];
    console.log('処理する記事:', article.title);

    const ankeData = await generateAnke({
      title: article.title,
      content: article.content,
      url: article.link,
    });

    const questionerId = await selectQuestioner(parseInt(settings.ai_user_probability || '70'));

    let ogImageUrl = article.image || '';
    let articleDescription = article.content || '';

    if (article.link) {
      try {
        const response = await fetch(article.link);
        const html = await response.text();

        if (!ogImageUrl) {
          const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
          if (ogImageMatch) {
            ogImageUrl = ogImageMatch[1];
          }
        }

        if (!articleDescription) {
          const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
          if (ogDescMatch) {
            articleDescription = ogDescMatch[1];
          }
        }
      } catch (error) {
        console.error('記事ページの取得エラー:', error);
      }
    }

    if (!articleDescription) {
      articleDescription = article.title;
    }

    const contentText = articleDescription.substring(0, 200);

    // カテゴリIDを取得（最初のカテゴリのみ、3段階マッチング）
    let categoryId = null;
    if (ankeData.categories && ankeData.categories.length > 0) {
      const categoryName = ankeData.categories[0];
      console.log('AI生成カテゴリ:', categoryName);
      
      // 1. 完全一致検索
      let { data: category } = await supabase
        .from('categories')
        .select('id, name')
        .eq('name', categoryName)
        .single();
      
      // 2. 部分一致検索
      if (!category) {
        const { data: categories } = await supabase
          .from('categories')
          .select('id, name')
          .ilike('name', `%${categoryName}%`)
          .limit(1);
        
        if (categories && categories.length > 0) {
          category = categories[0];
          console.log('部分一致でカテゴリ発見:', category.name);
        }
      }
      
      // 3. 最初の単語で検索
      if (!category) {
        const firstWord = categoryName.split(/[\s・、,]+/)[0];
        if (firstWord && firstWord.length > 0) {
          const { data: categories } = await supabase
            .from('categories')
            .select('id, name')
            .ilike('name', `%${firstWord}%`)
            .limit(1);
          
          if (categories && categories.length > 0) {
            category = categories[0];
            console.log('最初の単語でカテゴリ発見:', category.name);
          }
        }
      }
      
      if (category) {
        categoryId = category.id;
        console.log('設定されたカテゴリID:', categoryId, 'カテゴリ名:', category.name);
      } else {
        console.log('カテゴリが見つかりませんでした:', categoryName);
      }
    }

    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: questionerId,
        title: ankeData.title,
        content: contentText,
        source_url: article.link,
        thumbnail_url: ogImageUrl || null,
        og_image: ogImageUrl || null,
        category_id: categoryId,
        status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (postError || !post) {
      throw new Error('投稿の作成に失敗しました: ' + postError?.message);
    }

    for (let i = 0; i < ankeData.choices.length; i++) {
      await supabase.from('vote_choices').insert({
        post_id: post.id,
        choice: ankeData.choices[i],
        vote_count: 0,
      });
    }

    // キーワードを保存
    if (ankeData.keywords && ankeData.keywords.length > 0) {
      const maxKeywords = parseInt(settings.max_keywords || '3');
      const keywordsToSave = ankeData.keywords.slice(0, maxKeywords);
      
      for (const keywordName of keywordsToSave) {
        // キーワードを検索または作成
        let { data: keyword } = await supabase
          .from('keywords')
          .select('id')
          .eq('name', keywordName)
          .single();

        if (!keyword) {
          const { data: newKeyword } = await supabase
            .from('keywords')
            .insert({ name: keywordName, created_at: new Date().toISOString() })
            .select()
            .single();
          keyword = newKeyword;
        }

        if (keyword) {
          // post_keywordsテーブルに関連付け
          await supabase.from('post_keywords').insert({
            post_id: post.id,
            keyword_id: keyword.id,
          });
        }
      }
      
      console.log(`キーワードを${keywordsToSave.length}個保存しました:`, keywordsToSave);
    }

    try {
      const taggerResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/posts/${post.id}/ai-tag`, {
        method: 'POST',
      });

      if (taggerResponse.ok) {
        console.log('AI Auto Tagger実行成功');
      }
    } catch (error) {
      console.error('AI Auto Tagger実行エラー:', error);
    }

    await supabase.from('auto_creator_processed').insert({
      source_url: randomUrl,
      article_url: article.link,
      article_title: article.title,
      post_id: post.id,
      created_at: new Date().toISOString(),
    });

    await logExecution(
      'success',
      randomUrl,
      article.link,
      post.id,
      `CRON実行: ${ankeData.title}`
    );

    return NextResponse.json({
      success: true,
      message: 'アンケートを作成しました',
      post_id: post.id,
      post_url: `/posts/${post.id}`,
      article_url: article.link,
    });
  } catch (error) {
    console.error('CRON auto-creator error:', error);
    const errorMessage = error instanceof Error ? error.message : '実行に失敗しました';

    await logExecution('error', '', undefined, undefined, undefined, errorMessage);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
