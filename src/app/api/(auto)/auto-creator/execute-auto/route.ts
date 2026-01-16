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
  console.log('Fetching settings from Supabase...');
  console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  const { data: settings, error } = await supabase
    .from('auto_creator_settings')
    .select('setting_key, setting_value')
    .in('setting_key', [
      'is_active', 
      'is_enabled',
      'scraping_urls', 
      'ai_user_probability', 
      'max_posts_per_execution',
      'execution_interval',
      'execution_variance',
      'no_create_start_hour',
      'no_create_end_hour'
    ]);

  if (error) {
    console.error('Supabase error:', error);
    throw new Error(`Supabase error: ${error.message}`);
  }
  
  console.log('Fetched settings:', settings);

  const settingsMap: Record<string, string> = {};
  settings?.forEach(s => {
    settingsMap[s.setting_key] = s.setting_value;
  });
  
  console.log('Settings map:', settingsMap);

  return {
    isActive: settingsMap.is_active === 'true' || settingsMap.is_enabled === 'true',
    scrapingUrls: JSON.parse(settingsMap.scraping_urls || '[]'),
    aiUserProbability: parseInt(settingsMap.ai_user_probability || '70'),
    maxPostsPerExecution: parseInt(settingsMap.max_posts_per_execution || '5'),
    executionInterval: parseInt(settingsMap.execution_interval || '60'),
    executionVariance: parseInt(settingsMap.execution_variance || '15'),
    noCreateStartHour: parseInt(settingsMap.no_create_start_hour || '0'),
    noCreateEndHour: parseInt(settingsMap.no_create_end_hour || '6'),
  };
}

async function isProcessed(articleUrl: string): Promise<boolean> {
  // postsテーブルのsource_urlのみをチェック（過去の投稿との重複を防ぐ）
  const { data: postsData } = await supabase
    .from('posts')
    .select('id')
    .eq('source_url', articleUrl)
    .limit(1);

  return !!(postsData && postsData.length > 0);
}

async function selectQuestioner(aiUserProbability: number) {
  const useAI = Math.random() * 100 < aiUserProbability;

  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('status', useAI ? 6 : 2)
    .limit(100);

  if (!users || users.length === 0) {
    throw new Error('質問者が見つかりません');
  }

  const randomUser = users[Math.floor(Math.random() * users.length)];
  return randomUser.id;
}

async function getCategoryId(categoryName: string): Promise<number> {
  // カテゴリ名からカテゴリIDを取得
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('name', categoryName)
    .single();

  if (category) {
    return category.id;
  }

  // カテゴリが見つからない場合はデフォルトで「ニュース・話題」(ID: 25)を返す
  return 25;
}

async function logExecution(
  status: string,
  articleUrl: string,
  postId?: number,
  message?: string,
  errorMessage?: string
) {
  await supabase.from('auto_creator_logs').insert({
    execution_type: 'auto',
    status,
    article_url: articleUrl,
    post_id: postId,
    message,
    error_message: errorMessage,
    executed_at: new Date().toISOString(),
  });
}

export async function POST() {
  try {
    const settings = await getSettings();
    
    console.log('Settings:', JSON.stringify(settings, null, 2));

    if (!settings.isActive) {
      console.log('AI自動投稿が無効です。isActive:', settings.isActive);
      return NextResponse.json({
        success: false,
        message: 'AI自動投稿は無効になっています',
        debug: {
          isActive: settings.isActive,
          scrapingUrlsCount: settings.scrapingUrls.length,
        }
      });
    }

    // 実行間隔チェック
    const { data: lastLog } = await supabase
      .from('auto_creator_logs')
      .select('executed_at')
      .eq('execution_type', 'auto')
      .eq('status', 'success')
      .order('executed_at', { ascending: false })
      .limit(1)
      .single();

    if (lastLog) {
      const lastExecutionTime = new Date(lastLog.executed_at);
      const now = new Date();
      const minutesSinceLastExecution = (now.getTime() - lastExecutionTime.getTime()) / 1000 / 60;
      
      // 最小実行間隔を計算（間隔 - ゆらぎ）
      const minInterval = settings.executionInterval - settings.executionVariance;
      
      if (minutesSinceLastExecution < minInterval) {
        console.log(`実行間隔が短すぎます: ${minutesSinceLastExecution}分 < ${minInterval}分`);
        return NextResponse.json({
          success: false,
          message: `実行間隔が短すぎます（${Math.round(minutesSinceLastExecution)}分 < ${minInterval}分）`,
          skipped: true,
        });
      }
    }

    // 作成しない時間帯チェック
    const currentHour = new Date().getHours();
    if (settings.noCreateStartHour < settings.noCreateEndHour) {
      // 例: 0時～6時
      if (currentHour >= settings.noCreateStartHour && currentHour < settings.noCreateEndHour) {
        console.log(`作成しない時間帯です: ${currentHour}時`);
        return NextResponse.json({
          success: false,
          message: `作成しない時間帯です（${settings.noCreateStartHour}時～${settings.noCreateEndHour}時）`,
          skipped: true,
        });
      }
    } else if (settings.noCreateStartHour > settings.noCreateEndHour) {
      // 例: 22時～6時（日をまたぐ）
      if (currentHour >= settings.noCreateStartHour || currentHour < settings.noCreateEndHour) {
        console.log(`作成しない時間帯です: ${currentHour}時`);
        return NextResponse.json({
          success: false,
          message: `作成しない時間帯です（${settings.noCreateStartHour}時～${settings.noCreateEndHour}時）`,
          skipped: true,
        });
      }
    }

    if (settings.scrapingUrls.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'スクレイピングURLが設定されていません',
      });
    }

    const parser = new Parser({
      customFields: {
        item: ['enclosure'],
      },
    });

    let createdCount = 0;
    const results: Array<{ success: boolean; url: string; message: string }> = [];

    for (const url of settings.scrapingUrls) {
      if (createdCount >= settings.maxPostsPerExecution) {
        break;
      }

      try {
        const feed = await parser.parseURL(url);

        for (const item of feed.items) {
          if (createdCount >= settings.maxPostsPerExecution) {
            break;
          }

          const rssItem = item as RSSItem;
          const articleUrl = rssItem.link || '';

          if (!articleUrl) {
            continue;
          }

          // 重複チェック
          if (await isProcessed(articleUrl)) {
            console.log(`スキップ: 既に処理済み - ${articleUrl}`);
            continue;
          }

          try {
            console.log(`処理開始: ${articleUrl}`);

            // ChatGPT APIでアンケート内容を生成
            const ankeData = await generateAnke({
              title: rssItem.title || '',
              content: rssItem.contentSnippet || rssItem.content || '',
              url: articleUrl,
            });

            // カテゴリIDを取得
            const categoryId = ankeData.categories && ankeData.categories.length > 0
              ? await getCategoryId(ankeData.categories[0])
              : 25; // デフォルトは「ニュース・話題」

            console.log(`カテゴリ: ${ankeData.categories?.[0] || 'デフォルト'} (ID: ${categoryId})`);

            // 質問者を選択
            const questionerId = await selectQuestioner(settings.aiUserProbability);

            // 記事ページからOG画像と本文を取得
            let ogImageUrl = rssItem.enclosure?.url || '';
            let articleDescription = rssItem.contentSnippet || rssItem.content || '';

            if (articleUrl) {
              try {
                const response = await fetch(articleUrl);
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
              articleDescription = rssItem.title || '';
            }

            const contentText = articleDescription.substring(0, 200);

            // 最新のpost IDを取得
            const { data: latestPost } = await supabase
              .from('posts')
              .select('id')
              .order('id', { ascending: false })
              .limit(1)
              .single();

            const nextId = latestPost ? latestPost.id + 1 : 1;

            // アンケート投稿を作成
            const { data: post, error: postError } = await supabase
              .from('posts')
              .insert({
                id: nextId,
                user_id: questionerId,
                title: ankeData.title,
                content: contentText,
                category_id: categoryId,
                source_url: articleUrl,
                thumbnail_url: ogImageUrl || null,
                og_image: ogImageUrl || null,
                status: 'published',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (postError || !post) {
              throw new Error('投稿の作成に失敗しました: ' + postError?.message);
            }

            // 投票選択肢を作成
            const { data: latestChoice } = await supabase
              .from('vote_choices')
              .select('id')
              .order('id', { ascending: false })
              .limit(1)
              .single();

            let nextChoiceId = latestChoice ? latestChoice.id + 1 : 1;

            for (const choice of ankeData.choices) {
              await supabase.from('vote_choices').insert({
                id: nextChoiceId,
                post_id: post.id,
                choice: choice,
                vote_count: 0,
              });
              nextChoiceId++;
            }

            // 投票オプションを作成
            await supabase.from('vote_options').insert({
              post_id: post.id,
              multi: false,
              random: false,
              close_at: null
            });

            // カテゴリを設定
            if (ankeData.categories && ankeData.categories.length > 0) {
              const { data: category } = await supabase
                .from('categories')
                .select('id')
                .eq('name', ankeData.categories[0])
                .single();

              if (category) {
                await supabase
                  .from('posts')
                  .update({ category_id: category.id })
                  .eq('id', post.id);
              }
            }

            // キーワードを設定
            for (const keywordName of ankeData.keywords) {
              let { data: keyword } = await supabase
                .from('keywords')
                .select('id')
                .eq('keyword', keywordName)
                .single();

              if (!keyword) {
                const { data: newKeyword } = await supabase
                  .from('keywords')
                  .insert({ 
                    keyword: keywordName,
                    slug: keywordName.toLowerCase().replace(/\s+/g, '-'),
                    created_at: new Date().toISOString()
                  })
                  .select()
                  .single();
                keyword = newKeyword;
              }

              if (keyword) {
                await supabase.from('post_keywords').insert({
                  post_id: post.id,
                  keyword_id: keyword.id,
                });
              }
            }

            // 処理済みレコードにpost_idを更新
            await supabase
              .from('auto_creator_processed')
              .update({ post_id: post.id })
              .eq('article_url', articleUrl);

            await logExecution('success', articleUrl, post.id, 'アンケートを作成しました');

            createdCount++;
            results.push({
              success: true,
              url: articleUrl,
              message: `投稿ID: ${post.id}`,
            });

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await logExecution('failed', articleUrl, undefined, undefined, errorMessage);
            results.push({
              success: false,
              url: articleUrl,
              message: errorMessage,
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching RSS from ${url}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${createdCount}件のアンケートを作成しました`,
      created_count: createdCount,
      results,
    });

  } catch (error) {
    console.error('Error in auto-creator:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'エラーが発生しました',
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
