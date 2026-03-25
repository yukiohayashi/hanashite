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

// 投票実行（投票選択肢は未使用のため、何もしない）
async function executeVote(_postId: number, _userId: number) {
  // 投票選択肢機能は現在未使用のため、スキップ
  return { choiceId: null };
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
    .select('name, profile, status')
    .eq('id', userId)
    .single();

  // コメント設定を取得
  const diversity = parseInt(settings.diversity || '30') / 100;
  const profileWeight = settings.profile_weight || 'medium';
  const contentWeight = settings.content_weight || 'high';

  // 5回に1回の確率で長文コメント（説教じみた）を生成
  // ただし、運営者（status=1）は除外
  const isLongComment = user?.status !== 1 && Math.random() < 0.2; // 20% = 5回に1回
  
  let minLength: number;
  let maxLength: number;
  let longCommentInstruction = '';
  
  if (isLongComment) {
    minLength = 200;
    maxLength = 300;
    longCommentInstruction = `

【重要】今回は長文で説教じみたコメントを生成してください。
- 人生経験を語り、やや上から目線で助言する
- 自分の経験や考えを詳しく述べる
- 「私も若い頃は〜」「結局は〜」「〜だと思います」などの表現を使う
- 必ず200〜300文字で生成してください
- 2〜3文ごとに必ず改行を入れてください
- 短いコメントは絶対に生成しないでください`;
    console.log('🎯 長文コメント生成モード: 200〜300文字（必須・改行あり）');
  } else {
    // 通常コメント（短文）
    minLength = 20;
    maxLength = 80;
    longCommentInstruction = `

【最重要】今回は短文コメントを生成してください。
- 長文コメントは絶対に生成しないでください
- 80文字以内で生成してください（厳守）
- 簡潔で読みやすいコメントを心がけてください`;
    console.log('📝 通常コメント生成モード: 20〜80文字');
  }

  // 既存の親コメント数を取得（返信は除外）
  const { count: commentCount } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)
    .eq('status', 'approved')
    .is('parent_id', null);

  console.log(`投稿ID: ${postId} の既存親コメント数: ${commentCount}`);

  // 既存の長文コメント（200文字以上）を検出し、ツッコミ返信がない場合は50%の確率で追加
  try {
    const { data: longComments } = await supabase
      .from('comments')
      .select('id, content, user_id')
      .eq('post_id', postId)
      .eq('status', 'approved')
      .is('parent_id', null);

    if (longComments && longComments.length > 0) {
      for (const longComment of longComments) {
        // 200文字以上のコメントを長文と判定
        if (longComment.content.length >= 200) {
          // 既にツッコミ返信があるかチェック
          const { data: existingReplies } = await supabase
            .from('comments')
            .select('id')
            .eq('parent_id', longComment.id)
            .eq('status', 'approved');

          if (!existingReplies || existingReplies.length === 0) {
            // 50%の確率でツッコミ返信を投稿
            if (Math.random() < 0.5) {
              console.log(`📢 長文コメント発見（${longComment.content.length}文字）、ツッコミ返信を投稿します...`);
            
              // ツッコミ返信用のユーザーIDを取得
              const { data: replyUsers } = await supabase
                .from('users')
                .select('id, name')
                .neq('id', longComment.user_id)
                .limit(100);

              if (replyUsers && replyUsers.length > 0) {
                const randomReplyUser = replyUsers[Math.floor(Math.random() * replyUsers.length)];
                
                const tsukkomiPrompts = [
                  'もっと端的に言えませんか？長すぎて読むのが大変です汗',
                  '長文すぎて読むのが大変です…要点だけ教えてください',
                  '長い…もう少し簡潔にお願いします💦',
                  '説教じみてますね…もっと短くまとめてください',
                  '長文お疲れ様です。でももう少し短くしてほしいです',
                ];
                const tsukkomiText = tsukkomiPrompts[Math.floor(Math.random() * tsukkomiPrompts.length)];
                
                const { data: tsukkomiComment } = await supabase.from('comments').insert({
                  post_id: postId,
                  parent_id: longComment.id,
                  user_id: randomReplyUser.id,
                  content: tsukkomiText,
                  status: 'approved',
                  created_at: new Date().toISOString(),
                }).select().single();
                
                console.log(`✅ 既存長文へのツッコミ返信投稿完了: ${tsukkomiText}`);
                
                // ツッコミ返信にいいねを付ける（2〜5人）
                if (tsukkomiComment) {
                  const likeCount = Math.floor(Math.random() * 4) + 2;
                  const { data: likeUsers } = await supabase
                    .from('users')
                    .select('id')
                    .not('id', 'in', `(${randomReplyUser.id},${longComment.user_id})`)
                    .limit(100);

                  if (likeUsers && likeUsers.length > 0) {
                    const shuffled = likeUsers.sort(() => 0.5 - Math.random());
                    const selectedUsers = shuffled.slice(0, Math.min(likeCount, likeUsers.length));
                    
                    for (const likeUser of selectedUsers) {
                      await supabase.from('likes').insert({
                        user_id: likeUser.id,
                        like_type: 'comment',
                        target_id: tsukkomiComment.id,
                        created_at: new Date().toISOString(),
                      });
                    }
                    
                    await supabase.from('like_counts').upsert({
                      target_id: tsukkomiComment.id,
                      like_type: 'comment',
                      like_count: selectedUsers.length,
                      updated_at: new Date().toISOString(),
                    });
                    
                    console.log(`👍 既存長文へのツッコミ返信に${selectedUsers.length}人がいいねしました`);
                  }
                }
              }
              
              // 1つの長文にツッコミを入れたら終了
              break;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('既存長文コメントチェックエラー:', error);
    // エラーでも続行
  }

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

  // コメント数に応じた指示を追加
  let commentCountInstruction = '';
  if (commentCount && commentCount >= 5) {
    commentCountInstruction = `

【重要】この投稿には既に${commentCount}件のコメントがあります。
回答やアドバイスではなく、投稿者に寄り添った共感や励ましのコメントを生成してください。
例: 「お気持ちわかります」「辛いですよね」「応援しています」「頑張ってください」など`;
  }

  // プロンプト内のプレースホルダーを置換
  const systemPrompt = `${commentPrompt}

${profileInstruction}
${contentInstruction}${commentCountInstruction}${longCommentInstruction}

コメントは${minLength}文字以上${maxLength}文字以内で生成してください。`
    .replace(/{?\$question}?/g, post.title)
    .replace(/{?\$content}?/g, post.content || '');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `ユーザー名: ${user?.name || '匿名'}\nプロフィール: ${user?.profile || 'なし'}` },
    ],
    temperature: 0.9 + diversity,
    max_tokens: Math.max(200, maxLength * 2),
    presence_penalty: 0.6,
    frequency_penalty: 0.3,
  });

  const commentText = response.choices[0]?.message?.content?.trim() || '';

  if (!commentText) {
    throw new Error('コメント生成に失敗しました');
  }

  // 長文コメントのデバッグログ
  if (isLongComment) {
    console.log(`📝 長文コメント生成完了: ${commentText.length}文字`);
    console.log(`内容: ${commentText}`);
  }

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

  let finalUserId = userId;

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

  // コメントを投稿
  // 長文コメントの場合は5分前の時刻に設定（ツッコミ返信が現在時刻になるように）
  const commentDate = new Date();
  if (isLongComment) {
    commentDate.setMinutes(commentDate.getMinutes() - 5);
  }
  
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
  
  // 長文コメントの場合、すぐにツッコミ返信を投稿
  if (isLongComment && comment) {
    console.log('💬 長文コメントにツッコミ返信を投稿します...');
    try {
      // ツッコミ返信用のユーザーIDを取得（長文コメント投稿者以外）
      const { data: replyUsers } = await supabase
        .from('users')
        .select('id, name')
        .neq('id', finalUserId)
        .limit(100);

      if (replyUsers && replyUsers.length > 0) {
        const randomReplyUser = replyUsers[Math.floor(Math.random() * replyUsers.length)];
        
        // ツッコミコメントを生成
        const tsukkomiPrompts = [
          'もっと端的に言えませんか？長すぎて読むのが大変です汗',
          '長文すぎて読むのが大変です…要点だけ教えてください',
          '長い…もう少し簡潔にお願いします💦',
          '説教じみてますね…もっと短くまとめてください',
          '長文お疲れ様です。でももう少し短くしてほしいです',
        ];
        const tsukkomiText = tsukkomiPrompts[Math.floor(Math.random() * tsukkomiPrompts.length)];
        
        // ツッコミ返信を投稿
        const { data: tsukkomiComment } = await supabase.from('comments').insert({
          post_id: postId,
          parent_id: comment.id,
          user_id: randomReplyUser.id,
          content: tsukkomiText,
          status: 'approved',
          created_at: new Date().toISOString(),
        }).select().single();
        
        console.log(`✅ ツッコミ返信投稿完了: ${tsukkomiText} (ユーザーID: ${randomReplyUser.id})`);
        
        // ツッコミ返信にいいねを付ける（2〜5人）
        if (tsukkomiComment) {
          const likeCount = Math.floor(Math.random() * 4) + 2; // 2〜5人
          const { data: likeUsers } = await supabase
            .from('users')
            .select('id')
            .not('id', 'in', `(${randomReplyUser.id},${finalUserId})`)
            .limit(100);

          if (likeUsers && likeUsers.length > 0) {
            const shuffled = likeUsers.sort(() => 0.5 - Math.random());
            const selectedUsers = shuffled.slice(0, Math.min(likeCount, likeUsers.length));
            
            for (const likeUser of selectedUsers) {
              await supabase.from('likes').insert({
                user_id: likeUser.id,
                like_type: 'comment',
                target_id: tsukkomiComment.id,
                created_at: new Date().toISOString(),
              });
            }
            
            // like_countsテーブルを更新
            await supabase.from('like_counts').upsert({
              target_id: tsukkomiComment.id,
              like_type: 'comment',
              like_count: selectedUsers.length,
              updated_at: new Date().toISOString(),
            });
            
            console.log(`👍 ツッコミ返信に${selectedUsers.length}人がいいねしました`);
          }
        }
      }
    } catch (error) {
      console.error('ツッコミ返信エラー:', error);
      // エラーでもコメント投稿は成功しているので続行
    }
  }
  
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
