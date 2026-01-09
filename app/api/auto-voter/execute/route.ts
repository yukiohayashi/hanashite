import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';

// ランダムなAI会員または編集者を取得
async function getRandomUser(aiMemberProbability: number = 70): Promise<number> {
  const useAiMember = Math.random() * 100 <= aiMemberProbability;
  const status = useAiMember ? 6 : 2; // 6: AI会員, 2: 編集者

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
    .select('id')
    .eq('post_id', postId);

  if (!choices || choices.length === 0) {
    throw new Error('投票選択肢が見つかりません');
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
async function executeComment(postId: number, userId: number, openaiApiKey: string, commentPrompt: string) {
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

  // OpenAI APIでコメント生成
  const openai = new OpenAI({ apiKey: openaiApiKey });

  const prompt = commentPrompt || `アンケート「${post.title}」に対するコメントを生成してください。
ユーザー名: ${user?.name || '匿名'}
プロフィール: ${user?.profile || 'なし'}

要件:
- 10〜60文字程度
- 自然な口調
- プロフィールを考慮した内容`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'あなたはアンケートサイトのユーザーです。' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.8,
    max_tokens: 100,
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

// 返信生成・投稿
async function executeReply(postId: number, userId: number, openaiApiKey: string, replyPrompt: string) {
  // ランダムなコメントを取得（parent_idが0またはNULL）
  const { data: parentComment } = await supabase
    .from('comments')
    .select('id, user_id, content')
    .eq('post_id', postId)
    .eq('status', 'approved')
    .or('parent_id.eq.0,parent_id.is.null')
    .limit(100);

  if (!parentComment || parentComment.length === 0) {
    throw new Error('返信対象のコメントが見つかりません');
  }

  const randomComment = parentComment[Math.floor(Math.random() * parentComment.length)];

  // ユーザー情報を取得
  const { data: user } = await supabase
    .from('users')
    .select('name, profile')
    .eq('id', userId)
    .single();

  // OpenAI APIで返信生成
  const openai = new OpenAI({ apiKey: openaiApiKey });

  const prompt = replyPrompt || `コメント「${randomComment.content}」に対する返信を生成してください。
ユーザー名: ${user?.name || '匿名'}
プロフィール: ${user?.profile || 'なし'}

要件:
- 10〜60文字程度
- 自然な口調
- プロフィールを考慮した内容`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'あなたはアンケートサイトのユーザーです。' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.8,
    max_tokens: 100,
  });

  const replyText = response.choices[0]?.message?.content?.trim() || '';

  if (!replyText) {
    throw new Error('返信生成に失敗しました');
  }

  // 返信を投稿
  const { data: reply } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: userId,
      parent_id: randomComment.id,
      content: replyText,
      status: 'approved',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  return { replyId: reply?.id, replyText, parentCommentId: randomComment.id };
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
      .from('auto_creator_settings')
      .select('*');

    const settings: Record<string, string> = {};
    settingsData?.forEach((item) => {
      settings[item.setting_key] = item.setting_value;
    });

    const openaiApiKey = settings.openai_api_key || '';
    const aiMemberProbability = parseInt(settings.ai_member_probability || '70');
    const commentPrompt = settings.comment_prompt || '';
    const replyPrompt = settings.reply_prompt || '';

    // ランダムなユーザーを取得
    const userId = await getRandomUser(aiMemberProbability);

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
        result = await executeComment(post_id, userId, openaiApiKey, commentPrompt);
        message = `コメントを投稿しました: ${result.commentText}`;
        break;

      case 'reply':
        if (!openaiApiKey) {
          throw new Error('OpenAI APIキーが設定されていません');
        }
        result = await executeReply(post_id, userId, openaiApiKey, replyPrompt);
        message = `返信を投稿しました: ${result.replyText}`;
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
