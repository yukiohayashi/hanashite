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

async function getRandomUser(aiProbability: number) {
  const useAI = Math.random() * 100 < aiProbability;
  const status = useAI ? 6 : 2;

  const { data: users } = await supabase
    .from('users')
    .select('id, name, profile')
    .eq('status', status)
    .limit(100);

  if (!users || users.length === 0) {
    throw new Error('ユーザーが見つかりません');
  }

  const randomUser = users[Math.floor(Math.random() * users.length)];
  return randomUser;
}

async function executeVote(postId: number, userId: number) {
  const { data: choices } = await supabase
    .from('vote_choices')
    .select('id')
    .eq('post_id', postId);

  if (!choices || choices.length === 0) {
    throw new Error('投票選択肢が見つかりません');
  }

  const randomChoice = choices[Math.floor(Math.random() * choices.length)];

  await supabase.from('vote_history').insert({
    post_id: postId,
    user_id: userId,
    choice_id: randomChoice.id,
    created_at: new Date().toISOString(),
  });

  const { data: currentChoice } = await supabase
    .from('vote_choices')
    .select('vote_count')
    .eq('id', randomChoice.id)
    .single();

  await supabase
    .from('vote_choices')
    .update({ vote_count: (currentChoice?.vote_count || 0) + 1 })
    .eq('id', randomChoice.id);

  return { choiceId: randomChoice.id };
}

async function executeComment(postId: number, userId: number, userName: string, userProfile: string, openaiApiKey: string, commentPrompt: string) {
  const { data: post } = await supabase
    .from('posts')
    .select('title, content')
    .eq('id', postId)
    .single();

  if (!post) {
    throw new Error('投稿が見つかりません');
  }

  const openai = new OpenAI({ apiKey: openaiApiKey });

  const prompt = commentPrompt || `アンケート「${post.title}」に対するコメントを生成してください。
ユーザー名: ${userName}
プロフィール: ${userProfile || 'なし'}

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

  await executeVote(postId, userId);

  const { data: comment } = await supabase
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

  return { commentId: comment?.id, commentText };
}

async function executeLikePost(postId: number, userId: number) {
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

  await supabase.from('likes').insert({
    user_id: userId,
    like_type: 'post',
    target_id: postId,
    created_at: new Date().toISOString(),
  });

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

async function logExecution(
  status: string,
  message?: string,
  errorMessage?: string,
  actionType?: string,
  postId?: number,
  userId?: number
) {
  await supabase.from('auto_voter_logs').insert({
    execution_type: 'cron',
    status,
    message,
    error_message: errorMessage,
    action_type: actionType,
    post_id: postId,
    user_id: userId,
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

    if (settings.auto_voter_enabled !== 'true') {
      console.log('自動投票・コメント・いいねが停止中です');
      return NextResponse.json({
        success: false,
        message: '自動投票・コメント・いいねが停止中です',
      });
    }

    // 実行間隔チェック（ゆらぎを含む）
    const executionInterval = 120; // 2時間固定
    const executionVariance = 30; // ±30分
    
    const { data: lastExecution } = await supabase
      .from('auto_voter_logs')
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

    console.log('実行間隔チェック通過 - 自動投票・コメント・いいねを開始します');

    if (settings.auto_voter_enabled !== 'true') {
      console.log('自動投票・コメント・いいねが停止中です（再チェック）');
      return NextResponse.json({
        success: false,
        message: '自動アクションが停止中です',
      });
    }

    const { data: recentPosts } = await supabase
      .from('posts')
      .select('id, title')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!recentPosts || recentPosts.length === 0) {
      return NextResponse.json({
        success: false,
        message: '対象投稿がありません',
      });
    }

    const randomPost = recentPosts[Math.floor(Math.random() * recentPosts.length)];
    const aiProbability = parseInt(settings.ai_user_probability || '70');
    const user = await getRandomUser(aiProbability);

    const actions = ['vote', 'comment', 'like_post'];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];

    let result;
    let message = '';

    switch (randomAction) {
      case 'vote':
        result = await executeVote(randomPost.id, user.id);
        message = `投票を実行しました（選択肢ID: ${result.choiceId}）`;
        break;

      case 'comment':
        const openaiApiKey = settings.openai_api_key || process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
          throw new Error('OpenAI APIキーが設定されていません');
        }
        result = await executeComment(
          randomPost.id,
          user.id,
          user.name,
          user.profile || '',
          openaiApiKey,
          settings.comment_prompt || ''
        );
        message = `コメントを投稿しました: ${result.commentText}`;
        break;

      case 'like_post':
        result = await executeLikePost(randomPost.id, user.id);
        message = '投稿にいいねしました';
        break;
    }

    await logExecution('success', randomPost.id, randomAction, message);

    return NextResponse.json({
      success: true,
      message,
      post_id: randomPost.id,
      action_type: randomAction,
      user_id: user.id,
    });
  } catch (error) {
    console.error('CRON auto-voter error:', error);
    const errorMessage = error instanceof Error ? error.message : '実行に失敗しました';

    await logExecution('error', undefined, undefined, undefined, errorMessage);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
