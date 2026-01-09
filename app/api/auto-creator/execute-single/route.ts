import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateAnke } from '@/lib/chatgpt';

async function isProcessed(articleUrl: string) {
  const { data, error } = await supabase
    .from('auto_creator_processed')
    .select('id')
    .eq('article_url', articleUrl)
    .single();

  return !error && data;
}

async function logExecution(
  status: string,
  articleUrl: string,
  postId?: number,
  message?: string,
  errorMessage?: string
) {
  await supabase.from('auto_creator_logs').insert({
    execution_type: 'manual',
    status,
    article_url: articleUrl,
    post_id: postId,
    message,
    error_message: errorMessage,
    executed_at: new Date().toISOString(),
  });
}

async function selectQuestioner() {
  const { data: settings } = await supabase
    .from('auto_creator_settings')
    .select('setting_value')
    .eq('setting_key', 'ai_user_probability')
    .single();

  const aiProbability = parseInt(settings?.setting_value || '70');
  const useAI = Math.random() * 100 < aiProbability;

  // AI会員（status=6）または編集者（status=2）を取得
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

export async function POST(request: Request) {
  try {
    const { article_url, article_title, article_content, article_image } = await request.json();

    if (!article_url || !article_title) {
      return NextResponse.json(
        { success: false, error: '記事URLまたはタイトルが指定されていません' },
        { status: 400 }
      );
    }

    // 重複チェック
    if (await isProcessed(article_url)) {
      await logExecution('failed', article_url, undefined, undefined, 'この記事は既に処理済みです');
      return NextResponse.json(
        { success: false, error: 'この記事は既に処理済みです' },
        { status: 400 }
      );
    }

    // ChatGPT APIでアンケート内容を生成
    const ankeData = await generateAnke({
      title: article_title,
      content: article_content,
      url: article_url,
    });

    console.log('=== AI自動投稿デバッグ ===');
    console.log('記事画像URL:', article_image);
    console.log('生成されたタイトル:', ankeData.title);
    console.log('生成された選択肢:', ankeData.choices);
    console.log('選択肢の数:', ankeData.choices.length);
    console.log('カテゴリ:', ankeData.categories);
    console.log('キーワード:', ankeData.keywords);

    // 質問者を選択
    const questionerId = await selectQuestioner();
    console.log('選択された質問者ID:', questionerId);

    // 記事ページからOG画像と本文を取得
    let ogImageUrl = article_image || '';
    let articleDescription = article_content || '';
    
    if (article_url) {
      try {
        const response = await fetch(article_url);
        const html = await response.text();
        
        // OG画像を取得
        if (!ogImageUrl) {
          const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
          if (ogImageMatch) {
            ogImageUrl = ogImageMatch[1];
            console.log('OG画像を取得:', ogImageUrl);
          }
        }
        
        // OG descriptionを取得（本文として使用）
        if (!articleDescription) {
          const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
          if (ogDescMatch) {
            articleDescription = ogDescMatch[1];
            console.log('OG description取得:', articleDescription.substring(0, 100));
          }
        }
      } catch (error) {
        console.error('記事ページの取得エラー:', error);
      }
    }
    
    // 本文が空の場合はタイトルを使用
    if (!articleDescription) {
      articleDescription = article_title;
    }
    
    // 本文を200文字に制限
    const contentText = articleDescription.substring(0, 200);
    console.log('保存する本文:', contentText);

    // アンケート投稿を作成
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: questionerId,
        title: ankeData.title,
        content: contentText,
        source_url: article_url,
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
    console.log('=== 選択肢保存開始 ===');
    for (let i = 0; i < ankeData.choices.length; i++) {
      console.log(`選択肢${i + 1}を保存:`, ankeData.choices[i]);
      const { data: choiceData, error: choiceError } = await supabase.from('vote_choices').insert({
        post_id: post.id,
        choice: ankeData.choices[i],
        vote_count: 0,
      }).select();
      
      if (choiceError) {
        console.error(`選択肢${i + 1}の保存エラー:`, choiceError);
      } else {
        console.log(`選択肢${i + 1}保存成功:`, choiceData);
      }
    }
    console.log('=== 選択肢保存完了 ===');

    // カテゴリを設定
    for (const categoryName of ankeData.categories) {
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('name', categoryName)
        .single();

      if (category) {
        await supabase.from('post_categories').insert({
          post_id: post.id,
          category_id: category.id,
        });
      }
    }

    // キーワードを設定
    for (const keywordName of ankeData.keywords) {
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
        await supabase.from('post_keywords').insert({
          post_id: post.id,
          keyword_id: keyword.id,
        });
      }
    }

    // AI Auto Taggerでカテゴリとキーワードを自動割り当て
    try {
      const taggerResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/posts/${post.id}/ai-tag`, {
        method: 'POST',
      });
      
      if (taggerResponse.ok) {
        console.log('AI Auto Tagger実行成功');
      } else {
        console.error('AI Auto Tagger実行失敗');
      }
    } catch (error) {
      console.error('AI Auto Tagger実行エラー:', error);
    }

    // 処理済みとして記録
    await supabase.from('auto_creator_processed').insert({
      source_url: 'manual',
      article_url,
      article_title,
      post_id: post.id,
      created_at: new Date().toISOString(),
    });

    // 実行ログを記録
    await logExecution(
      'success',
      article_url,
      post.id,
      `手動実行: ${ankeData.title}`
    );

    return NextResponse.json({
      success: true,
      message: 'アンケートを作成しました',
      post_id: post.id,
      post_url: `/posts/${post.id}`,
      anke_data: ankeData,
    });
  } catch (error) {
    console.error('Execute single error:', error);
    const errorMessage = error instanceof Error ? error.message : '実行に失敗しました';
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
