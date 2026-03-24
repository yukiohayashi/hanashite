import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';

// ランダムなAI会員または編集者を取得
async function getRandomUser(aiMemberProbability: number = 70): Promise<number> {
  const useAiMember = Math.random() * 100 <= aiMemberProbability;
  const status = useAiMember ? 4 : 2; // 4: AI会員, 2: 編集者

  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('status', status)
    .limit(100);

  if (!data || data.length === 0) {
    throw new Error('ユーザーが見つかりません');
  }

  const randomIndex = Math.floor(Math.random() * data.length);
  return data[randomIndex].id;
}

// 投票実行
async function executeVote(postId: number, userId: number) {
  // 投票選択肢を取得
  const { data: choices } = await supabase
    .from('vote_choices')
    .select('id, choice')
    .eq('post_id', postId);

  if (!choices || choices.length === 0) {
    // 選択肢がない場合はスキップ（エラーにしない）
    return { choiceId: null };
  }

  // ランダムな選択肢を選択
  const randomChoice = choices[Math.floor(Math.random() * choices.length)];

  // 投票履歴に追加
  await supabase.from('vote_history').insert({
    post_id: postId,
    user_id: userId,
    choice_id: randomChoice.id,
    created_at: new Date().toISOString(),
  });

  // 投票数を更新
  await supabase.rpc('increment_vote_count', {
    choice_id: randomChoice.id,
  });

  return { choiceId: randomChoice.id };
}

// コメント生成・投稿
async function executeComment(
  postId: number, 
  userId: number, 
  openaiApiKey: string, 
  commentPrompt: string,
  settings: Record<string, string>
) {
  // 投稿情報を取得
  const { data: post } = await supabase
    .from('posts')
    .select('title, content')
    .eq('id', postId)
    .single();

  if (!post) {
    throw new Error('投稿が見つかりません');
  }

  // ユーザー情報を取得
  const { data: user } = await supabase
    .from('users')
    .select('name, profile')
    .eq('id', userId)
    .single();

  // コメント設定を取得
  const minLength = parseInt(settings.min_comment_length || '10');
  const maxLength = parseInt(settings.max_comment_length || '60');
  const diversity = parseInt(settings.diversity || '30') / 100;
  const profileWeight = settings.profile_weight || 'medium';
  const contentWeight = settings.content_weight || 'high';

  // OpenAI APIでコメント生成
  const openai = new OpenAI({ apiKey: openaiApiKey });

  // プロフィール考慮度に応じたプロンプト調整
  let profileInstruction = '';
  if (profileWeight === 'high') {
    profileInstruction = 'ユーザーのプロフィールを強く考慮し、その人物像に合ったコメントを生成してください。';
  } else if (profileWeight === 'medium') {
    profileInstruction = 'ユーザーのプロフィールをある程度考慮してください。';
  } else {
    profileInstruction = 'プロフィールはあまり考慮せず、一般的なコメントを生成してください。';
  }

  // 記事内容考慮度に応じたプロンプト調整
  let contentInstruction = '';
  if (contentWeight === 'high') {
    contentInstruction = '記事の内容を詳しく読み込み、具体的なアドバイスや共感を示してください。';
  } else if (contentWeight === 'medium') {
    contentInstruction = '記事の内容をある程度考慮してコメントしてください。';
  } else {
    contentInstruction = '記事のタイトルを中心に、簡潔なコメントを生成してください。';
  }

  // プロンプト内のプレースホルダーを置換
  const systemPrompt = `${commentPrompt}

${profileInstruction}
${contentInstruction}

コメントは${minLength}文字以上${maxLength}文字以内で生成してください。`
    .replace(/{?\$question}?/g, post.title)
    .replace(/{?\$content}?/g, post.content || '')
    .replace(/{?\$choices}?/g, '');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `ユーザー名: ${user?.name || '匿名'}\nプロフィール: ${user?.profile || 'なし'}` },
    ],
    temperature: 0.5 + diversity,
    max_tokens: Math.max(200, maxLength * 2),
  });

  const commentText = response.choices[0]?.message?.content?.trim() || '';

  if (!commentText) {
    throw new Error('コメント生成に失敗しました');
  }

  // まず投票を実行
  await executeVote(postId, userId);

  // コメントを投稿
  console.log('コメント挿入開始:', { postId, userId, commentText });
  const { data: comment, error: commentError } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: userId,
      content: commentText,
      status: 'approved',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (commentError) {
    console.error('コメント挿入エラー:', commentError);
    throw new Error(`コメント挿入失敗: ${commentError.message}`);
  }

  console.log('コメント挿入成功:', comment);
  return { commentId: comment?.id, commentText };
}

// 投稿いいね
async function executeLikePost(postId: number, userId: number) {
  // 既にいいね済みかチェック
  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('like_type', 'post')
    .eq('target_id', postId)
    .single();

  if (existing) {
    throw new Error('既にいいね済みです');
  }

  // いいねを追加
  await supabase.from('likes').insert({
    user_id: userId,
    like_type: 'post',
    target_id: postId,
    created_at: new Date().toISOString(),
  });

  // like_countsテーブルを更新
  const { data: currentCount } = await supabase
    .from('like_counts')
    .select('like_count')
    .eq('target_id', postId)
    .eq('like_type', 'post')
    .single();

  const newCount = (currentCount?.like_count || 0) + 1;

  await supabase
    .from('like_counts')
    .upsert({
      target_id: postId,
      like_type: 'post',
      like_count: newCount,
      updated_at: new Date().toISOString(),
    });

  return { success: true };
}

// コメントいいね
async function executeLikeComment(postId: number, userId: number) {
  // ランダムなコメントを取得（自分以外）
  const { data: comments } = await supabase
    .from('comments')
    .select('id')
    .eq('post_id', postId)
    .eq('status', 'approved')
    .neq('user_id', userId)
    .limit(100);

  if (!comments || comments.length === 0) {
    throw new Error('いいね対象のコメントが見つかりません');
  }

  const randomComment = comments[Math.floor(Math.random() * comments.length)];

  // 既にいいね済みかチェック
  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('like_type', 'comment')
    .eq('target_id', randomComment.id)
    .single();

  if (existing) {
    throw new Error('既にいいね済みです');
  }

  // いいねを追加
  await supabase.from('likes').insert({
    user_id: userId,
    like_type: 'comment',
    target_id: randomComment.id,
    created_at: new Date().toISOString(),
  });

  return { commentId: randomComment.id };
}

export async function POST(request: NextRequest) {
  try {
    const { post_id, action_type } = await request.json();

    if (!post_id || !action_type) {
      return NextResponse.json(
        { error: 'post_idとaction_typeが必要です' },
        { status: 400 }
      );
    }

    // 設定を取得
    const { data: settingsData } = await supabase
      .from('auto_commenter_liker_settings')
      .select('*');

    const settings: Record<string, string> = {};
    settingsData?.forEach((item) => {
      settings[item.setting_key] = item.setting_value;
    });

    // OpenAI APIキーをapi_settingsテーブルから取得
    const { data: apiSettings } = await supabase
      .from('api_settings')
      .select('api_key')
      .eq('is_active', true)
      .limit(1)
      .single();

    const openaiApiKey = apiSettings?.api_key || '';
    const commentPrompt = settings.comment_prompt || '';

    // ランダムなAI会員を取得（手動実行時は常にAI会員を使用）
    const userId = await getRandomUser(100);

    let result;
    let message = '';

    // アクション実行
    switch (action_type) {
      case 'vote':
        result = await executeVote(post_id, userId);
        message = `投票を実行しました（選択肢ID: ${result.choiceId}）`;
        break;

      case 'comment':
        if (!openaiApiKey) {
          throw new Error('OpenAI APIキーが設定されていません');
        }
        result = await executeComment(post_id, userId, openaiApiKey, commentPrompt, settings);
        message = `コメントを投稿しました: ${result.commentText}`;
        break;

      case 'like_post':
        result = await executeLikePost(post_id, userId);
        message = '投稿にいいねしました';
        break;

      case 'like_comment':
        result = await executeLikeComment(post_id, userId);
        message = `コメントにいいねしました（コメントID: ${result.commentId}）`;
        break;

      default:
        return NextResponse.json(
          { error: '無効なアクションタイプです' },
          { status: 400 }
        );
    }

    // ログを記録
    await supabase.from('auto_voter_logs').insert({
      post_id,
      user_id: userId,
      action_type,
      status: 'success',
      message,
      executed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message,
      userId,
      result,
      comment: action_type === 'comment' && 'commentText' in result ? result.commentText : undefined,
    });
  } catch (error: any) {
    console.error('Execute error:', error);

    // エラーログを記録
    const { post_id, action_type } = await request.json().catch(() => ({}));
    if (post_id && action_type) {
      await supabase.from('auto_voter_logs').insert({
        post_id,
        user_id: 0,
        action_type,
        status: 'error',
        error_message: error.message,
        executed_at: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: error.message || '実行に失敗しました' },
      { status: 500 }
    );
  }
}
