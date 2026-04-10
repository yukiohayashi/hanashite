import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import OpenAI from 'openai';
import { 
  generateStructuredPrompt, 
  shouldAddEmoji, 
  selectEmoji, 
  analyzeEmotion,
  applyNaturalErrors
} from '@/lib/commentPromptHelper';

// ランダムなAI会員またはゲスト（user_id NULL）を取得
// aiMemberProbability: AI会員の確率（残りはゲスト投稿）
async function getRandomUser(aiMemberProbability: number = 70): Promise<number | null> {
  // aiMemberProbability%の確率でAI会員、残りはゲスト投稿（user_id NULL）
  const useAiMember = Math.random() * 100 <= aiMemberProbability;
  
  if (!useAiMember) {
    // ゲスト投稿（user_id NULL）
    return null;
  }

  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('status', 4) // AI会員のみ
    .limit(100);

  if (!data || data.length === 0) {
    // AI会員がいない場合はゲスト投稿にフォールバック
    return null;
  }

  const randomIndex = Math.floor(Math.random() * data.length);
  return data[randomIndex].id;
}

// 投票実行（投票選択肢は未使用のため、何もしない）
async function executeVote(_postId: number, _userId: number) {
  // 投票選択肢機能は現在未使用のため、スキップ
  return { choiceId: null };
}

// コメント生成・投稿
async function executeComment(
  postId: number, 
  userId: number | null, 
  openaiApiKey: string
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

  // ユーザー情報を取得（ゲスト投稿の場合はnull）
  let user: { 
    name: string; 
    profile: string | null; 
    status: number;
    gender: string | null;
    age: number | null;
    marriage: string | null;
  } | null = null;
  
  if (userId !== null) {
    const { data: userData } = await supabase
      .from('users')
      .select('name, profile, status, gender, age, marriage')
      .eq('id', userId)
      .single();
    user = userData;
  }

  // 構造化プロンプトを生成（ユーザープロフィールを渡す）
  const { prompt: structuredPrompt, persona, pattern, targetLength } = generateStructuredPrompt(
    post.title,
    post.content || '',
    user ? {
      gender: user.gender,
      age: user.age,
      marriage: user.marriage
    } : undefined
  );

  console.log(`📝 コメント生成: ${persona.name} / ${pattern.name} / 目標${targetLength}文字`);
  if (user) {
    console.log(`👤 ユーザー情報: 性別=${user.gender || '未設定'}, 年齢=${user.age || '未設定'}, 身分=${user.marriage || '未設定'}`);
  }

  // 既存の親コメント数を取得（返信は除外）
  const { count: commentCount } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)
    .eq('status', 'approved')
    .is('parent_id', null);

  console.log(`投稿ID: ${postId} の既存親コメント数: ${commentCount}`);

  // OpenAI APIでコメント生成
  const openai = new OpenAI({ apiKey: openaiApiKey });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: structuredPrompt },
    ],
    temperature: 1.0,
    max_tokens: Math.max(200, targetLength * 3),
    presence_penalty: 0.7,
    frequency_penalty: 0.5,
  });

  let commentText = response.choices[0]?.message?.content?.trim() || '';

  if (!commentText) {
    throw new Error('コメント生成に失敗しました');
  }

  // 15%の確率で自然な誤り（ら抜き・い抜き等）を適用
  commentText = applyNaturalErrors(commentText);

  // 25%の確率で絵文字を追加
  if (shouldAddEmoji()) {
    const emotion = analyzeEmotion(post.title, post.content || '');
    const emoji = selectEmoji(emotion);
    commentText = `${commentText}${emoji}`;
    console.log(`✨ 絵文字追加: ${emoji} (感情: ${emotion})`);
  }

  let finalUserId: number | null = userId;

  // ゲスト投稿（user_id NULL）の場合は重複チェックと投票をスキップ
  if (userId !== null) {
    // まず投票を実行
    await executeVote(postId, userId);

    // 同じユーザーが同じ投稿に既に親コメントを投稿していないかチェック
    const { data: existingParentComment } = await supabase
      .from('comments')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .is('parent_id', null)
      .single();

    if (existingParentComment) {
      console.log(`⚠️ ユーザーID: ${userId} は既に親コメントを投稿済み。他のユーザーIDを探します...`);
      
      // 既に親コメントを投稿したユーザーIDを取得
      const { data: existingUserIds } = await supabase
        .from('comments')
        .select('user_id')
        .eq('post_id', postId)
        .is('parent_id', null);

      const usedUserIds = existingUserIds?.map(c => c.user_id) || [];
      
      // 利用可能なユーザーIDを取得（既に投稿していないユーザー）
      const { data: availableUsers } = await supabase
        .from('users')
        .select('id')
        .not('id', 'in', `(${usedUserIds.join(',')})`)
        .limit(100);

      if (!availableUsers || availableUsers.length === 0) {
        console.log('❌ 利用可能なユーザーIDがありません');
        throw new Error('このユーザーは既にこの投稿にコメントしています');
      }

      // ランダムに1人選択
      const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
      finalUserId = randomUser.id;
      console.log(`✅ 新しいユーザーID: ${finalUserId} を使用します`);
    }
  } else {
    console.log('👤 ゲスト投稿（user_id NULL）としてコメントを投稿します');
  }

  // コメントを投稿
  // コメント日時を設定
  const commentDate = new Date();
  
  console.log('コメント挿入開始:', { postId, userId: finalUserId, commentText });
  const { data: comment, error: commentError } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: finalUserId,
      content: commentText,
      status: 'approved',
      created_at: commentDate.toISOString(),
    })
    .select()
    .single();

  if (commentError) {
    console.error('コメント挿入エラー:', commentError);
    throw new Error(`コメント挿入失敗: ${commentError.message}`);
  }

  console.log('コメント挿入成功:', comment);
  
  // ゲスト投稿の場合はいいね処理をスキップ
  if (finalUserId !== null) {
    // 自分のコメント以外のランダムなコメントにいいね（必ず実行）
    try {
      const { data: otherComments } = await supabase
        .from('comments')
        .select('id')
        .eq('post_id', postId)
        .eq('status', 'approved')
        .neq('user_id', finalUserId)
        .limit(100);

      if (otherComments && otherComments.length > 0) {
        const randomComment = otherComments[Math.floor(Math.random() * otherComments.length)];
        
        // 既にいいね済みかチェック
        const { data: existingLike } = await supabase
          .from('likes')
          .select('id')
          .eq('user_id', finalUserId)
          .eq('like_type', 'comment')
          .eq('target_id', randomComment.id)
          .single();

        if (!existingLike) {
          // いいねを追加
          await supabase.from('likes').insert({
            user_id: finalUserId,
            like_type: 'comment',
            target_id: randomComment.id,
            created_at: new Date().toISOString(),
          });

          // like_countsテーブルを更新
          const { data: currentCount } = await supabase
            .from('like_counts')
            .select('like_count')
            .eq('target_id', randomComment.id)
            .eq('like_type', 'comment')
            .single();

          const newCount = (currentCount?.like_count || 0) + 1;

          await supabase
            .from('like_counts')
            .upsert({
              target_id: randomComment.id,
              like_type: 'comment',
              like_count: newCount,
              updated_at: new Date().toISOString(),
            });
          
          console.log(`💚 コメントにいいねしました（コメントID: ${randomComment.id}）`);
        }
      }
    } catch (error) {
      console.error('コメントいいねエラー:', error);
      // エラーでもコメント投稿は成功しているので続行
    }
  }
  
  return { commentId: comment?.id, commentText };
}

// 投稿者返信
async function executeAuthorReply(postId: number, openaiApiKey: string, settings: Record<string, string>) {
  // 投稿者返信確率をチェック
  const posterReplyProbability = parseInt(settings.author_reply_probability || '0');
  console.log(`投稿者返信確率: ${posterReplyProbability}%`);
  
  const randomValue = Math.random() * 100;
  console.log(`ランダム値: ${randomValue.toFixed(2)} (${randomValue <= posterReplyProbability ? '実行' : 'スキップ'})`);
  
  if (posterReplyProbability === 0 || randomValue > posterReplyProbability) {
    console.log('投稿者返信はスキップされました');
    return { success: false, message: '投稿者返信はスキップされました' };
  }

  try {
    // 投稿情報と投稿者を取得
    const { data: post } = await supabase
      .from('posts')
      .select('user_id, title')
      .eq('id', postId)
      .single();

    if (!post || !post.user_id) {
      return { success: false, message: '投稿が見つかりません' };
    }

    console.log(`投稿者ID: ${post.user_id} による返信コメント生成開始`);
    
    // 投稿者が既に返信したコメントIDを取得
    const { data: authorReplies } = await supabase
      .from('comments')
      .select('parent_id')
      .eq('post_id', postId)
      .eq('user_id', post.user_id)
      .not('parent_id', 'is', null);

    const repliedCommentIds = authorReplies?.map(r => r.parent_id).filter(Boolean) || [];
    
    // 他のユーザーのコメントを取得（投稿者自身のコメントと既に返信済みのコメントを除外）
    let query = supabase
      .from('comments')
      .select('id, content')
      .eq('post_id', postId)
      .eq('status', 'approved')
      .neq('user_id', post.user_id)
      .limit(100);
    
    if (repliedCommentIds.length > 0) {
      query = query.not('id', 'in', `(${repliedCommentIds.join(',')})`);
    }
    
    const { data: otherComments } = await query;

    if (!otherComments || otherComments.length === 0) {
      console.log('投稿者返信: 返信対象のコメントがありません');
      return { success: false, message: '返信対象のコメントがありません' };
    }

    // ランダムにコメントを選択
    const targetComment = otherComments[Math.floor(Math.random() * otherComments.length)];
    
    // 投稿者情報を取得
    const { data: posterUser } = await supabase
      .from('users')
      .select('name, profile')
      .eq('id', post.user_id)
      .single();

    console.log(`投稿者名: ${posterUser?.name || '匿名'}, 返信対象コメントID: ${targetComment.id}`);

    // 返信プロンプト
    const commentLength = targetComment.content.length;
    const isLongComment = commentLength > 100;
    
    const replyPrompt = `あなたは投稿者として、コメントに対して返信してください。

投稿タイトル: ${post.title}
コメント: ${targetComment.content}
コメント文字数: ${commentLength}文字

【返信ルール】
- **口調**: 常に丁寧語（ですます調）を使用
- **文字数**: 20〜40文字
- **内容のバリエーション**:
  - 共感を示す（「そうですよね」「本当にそう思います」）
  - 気づきを得た（「確かに、日中の方が冷静に話せそうですね」）
  - 参考になった（「参考になります」「その視点は考えていませんでした」）
  - たまに感謝の気持ち（5回に1回程度「ありがとうございます」を含める）
  ${isLongComment ? '- **長文コメントへのツッコミ（10回に1回程度）**: 「もっと端的にお願いします」「長文すぎて読むのが大変です汗」などと優しくツッコむ' : ''}
- **禁止事項**: 
  - 「コメントありがとうございます」を毎回使わない
  - 過度な感謝表現を避ける

【返信例】
- そうですよね。日中の方が冷静に話せそうです。
- 確かに、日中の方がお互い落ち着いて話せますね。
- その視点は考えていませんでした。参考になります。
- 本当にそう思います。夜は感情的になりがちですよね。
- ありがとうございます。日中に話してみます。
${isLongComment ? '- もっと端的にお願いします汗\n- 長文すぎて読むのが大変です…要点だけ教えてください' : ''}

返信内容のみを出力してください（前置きや説明は不要）`;

    const replyOpenai = new OpenAI({ apiKey: openaiApiKey });
    const replyResponse = await replyOpenai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: replyPrompt },
        { role: 'user', content: `投稿者名: ${posterUser?.name || '匿名'}` },
      ],
      temperature: 1.2,
      max_tokens: 100,
      presence_penalty: 0.8,
      frequency_penalty: 0.5,
    });

    const replyText = replyResponse.choices[0]?.message?.content?.trim() || '';

    if (!replyText) {
      return { success: false, message: '返信テキストの生成に失敗しました' };
    }

    // 投稿者として返信コメントを投稿
    const { data: replyComment, error: replyError } = await supabase.from('comments').insert({
      post_id: postId,
      user_id: post.user_id,
      content: replyText,
      parent_id: targetComment.id,
      status: 'approved',
      created_at: new Date().toISOString(),
    }).select().single();

    if (replyError) {
      console.error('投稿者返信の挿入エラー:', replyError);
      return { success: false, message: `投稿者返信の挿入エラー: ${replyError.message}` };
    }

    console.log(`✅ 投稿者返信を作成しました (投稿者ID: ${post.user_id}, コメントID: ${replyComment?.id}, 返信先: ${targetComment.id}): ${replyText}`);
    return { success: true, message: `投稿者返信を作成しました: ${replyText}`, replyText };
  } catch (error) {
    console.error('投稿者返信エラー:', error);
    return { success: false, message: `投稿者返信エラー: ${error}` };
  }
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

    // ランダムなAI会員を取得（手動実行時は常にAI会員を使用）
    const userId = await getRandomUser(100);

    let result;
    let message = '';

    // アクション実行
    switch (action_type) {
      case 'vote':
        if (userId === null) {
          throw new Error('投票にはユーザーIDが必要です');
        }
        result = await executeVote(post_id, userId);
        message = `投票を実行しました（選択肢ID: ${result.choiceId}）`;
        break;

      case 'comment':
        if (!openaiApiKey) {
          throw new Error('OpenAI APIキーが設定されていません');
        }
        result = await executeComment(post_id, userId, openaiApiKey);
        message = `コメントを投稿しました: ${result.commentText}`;
        break;

      case 'like_post':
        if (userId === null) {
          throw new Error('いいねにはユーザーIDが必要です');
        }
        result = await executeLikePost(post_id, userId);
        message = '投稿にいいねしました';
        break;

      case 'like_comment':
        if (userId === null) {
          throw new Error('いいねにはユーザーIDが必要です');
        }
        result = await executeLikeComment(post_id, userId);
        message = `コメントにいいねしました（コメントID: ${result.commentId}）`;
        break;

      case 'author_reply':
        if (!openaiApiKey) {
          throw new Error('OpenAI APIキーが設定されていません');
        }
        result = await executeAuthorReply(post_id, openaiApiKey, settings);
        message = result.message;
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
