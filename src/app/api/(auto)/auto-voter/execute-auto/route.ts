import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    console.log('=== AI自動投票 一括実行開始 ===');
    
    // 設定を取得
    const { data: settingsData } = await supabase
      .from('auto_voter_settings')
      .select('*');

    const settings: Record<string, string> = {};
    settingsData?.forEach((item) => {
      settings[item.setting_key] = item.setting_value;
    });

    // 実行しない時間帯のチェック
    const noRunStart = settings.no_run_start || '00:00';
    const noRunEnd = settings.no_run_end || '06:00';
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (noRunStart && noRunEnd && currentTime >= noRunStart && currentTime < noRunEnd) {
      console.log(`実行しない時間帯です (${noRunStart} - ${noRunEnd}): ${currentTime}`);
      return NextResponse.json({
        success: true,
        message: `実行しない時間帯のためスキップしました (${noRunStart} - ${noRunEnd})`,
        skipped: true,
      });
    }

    const postsPerRun = parseInt(settings.posts_per_run || '1');
    const votesPerRun = parseInt(settings.votes_per_run || '3');
    const votesVariance = parseInt(settings.votes_variance || '2');
    const aiMemberProbability = parseInt(settings.ai_member_probability || '70');
    const postLikeProbability = parseInt(settings.post_like_probability || '50');
    const likeProbability = parseInt(settings.like_probability || '40');
    const commentsPerRun = parseInt(settings.comments_per_run || '1');
    const maxCommentsPerPost = parseInt(settings.max_comments_per_post || '20');
    const maxCommentsVariance = parseInt(settings.max_comments_variance || '10');
    const commentPrompt = settings.comment_prompt || '';
    const replyPrompt = settings.reply_prompt || '';

    // API設定を取得
    const { data: apiSettings } = await supabase
      .from('auto_creator_settings')
      .select('setting_value')
      .eq('setting_key', 'openai_api_key')
      .single();
    
    const openaiApiKey = apiSettings?.setting_value || process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.error('OpenAI APIキーが設定されていません');
    }

    console.log('実行パラメータ:', {
      postsPerRun,
      votesPerRun,
      votesVariance,
      aiMemberProbability,
      postLikeProbability,
      likeProbability,
      commentsPerRun,
      maxCommentsPerPost,
      maxCommentsVariance,
    });

    // カテゴリごとの設定
    const categorySettings: Record<number, { target_days: number; min_votes: number }> = {
      1: { target_days: 10, min_votes: 0 },    // アニメ・漫画
      2: { target_days: 10, min_votes: 0 },    // エンタメ
      3: { target_days: 180, min_votes: 0 },   // お受験
      4: { target_days: 180, min_votes: 0 },   // クレカ・電子マネー
      5: { target_days: 180, min_votes: 0 },   // ゲーム
      6: { target_days: 3, min_votes: 0 },     // ジャニーズ
      7: { target_days: 3, min_votes: 0 },     // ファッション
      8: { target_days: 1000, min_votes: 400 }, // ペット
      10: { target_days: 3, min_votes: 10 },   // 住まい・不動産
      11: { target_days: 3, min_votes: 0 },    // 保険
      12: { target_days: 180, min_votes: 0 },  // 医療費
      13: { target_days: 10, min_votes: 0 },   // 婚活・結婚
      14: { target_days: 180, min_votes: 0 },  // 就職・転職
      15: { target_days: 180, min_votes: 10 }, // 恋愛
      16: { target_days: 180, min_votes: 10 }, // 投資・貯蓄
      17: { target_days: 180, min_votes: 10 }, // 整形・脱毛
      18: { target_days: 180, min_votes: 10 }, // 料理・グルメ
      19: { target_days: 180, min_votes: 10 }, // 旅行・ホテル
      20: { target_days: 180, min_votes: 10 }, // 税金・年金
      21: { target_days: 180, min_votes: 10 }, // 競馬・ギャンブル
      22: { target_days: 180, min_votes: 0 },  // 美容・コスメ
      23: { target_days: 180, min_votes: 0 },  // 育児
      24: { target_days: 180, min_votes: 0 },  // 雑談
      25: { target_days: 10, min_votes: 0 },   // ニュース・話題
    };

    const prioritizeRecentPosts = settings.prioritize_recent_posts === '1';
    const priorityDays = parseInt(settings.priority_days || '3');
    const priorityWeight = parseInt(settings.priority_weight || '5');

    console.log('優先設定:', {
      prioritizeRecentPosts,
      priorityDays,
      priorityWeight,
    });

    // 対象記事を取得（返信生成のため、タイトル、本文、投票選択肢を含める）
    const { data: posts } = await supabase
      .from('posts')
      .select('id, title, content, category_id, created_at, user_id')
      .eq('status', 'published')
      .neq('user_id', 1) // 管理者投稿を除外
      .order('created_at', { ascending: false })
      .limit(100);

    console.log(`取得した記事数: ${posts?.length || 0}件`);

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        success: true,
        message: '対象記事が見つかりませんでした（published状態の記事が存在しません）',
        details: {
          processed_posts: 0,
          total_votes: 0,
          total_comments: 0,
        },
      });
    }

    // カテゴリ設定に基づいてフィルタリング
    const filteredPosts = posts.filter(post => {
      const categorySetting = categorySettings[post.category_id] || { target_days: 180, min_votes: 0 };
      const postDate = new Date(post.created_at);
      const daysDiff = Math.floor((Date.now() - postDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysDiff <= categorySetting.target_days;
    });

    // 優先度を計算
    const postsWithPriority = filteredPosts.map(post => {
      const postDate = new Date(post.created_at);
      const hoursDiff = (Date.now() - postDate.getTime()) / (1000 * 60 * 60);
      
      let priority = 1;
      
      if (prioritizeRecentPosts) {
        if (hoursDiff <= 24) {
          priority = priorityWeight * 2;
        } else if (hoursDiff <= 48) {
          priority = priorityWeight * 1.5;
        } else if (hoursDiff <= priorityDays * 24) {
          priority = priorityWeight;
        }
      }
      
      return { ...post, priority };
    });

    // 優先度でソート（高い順）
    postsWithPriority.sort((a, b) => b.priority - a.priority);

    // 処理する記事を選択（優先度順）
    const postsToProcess = postsWithPriority.slice(0, postsPerRun);
    let totalVotes = 0;
    let totalComments = 0;
    let totalPostLikes = 0;
    let totalCommentLikes = 0;
    const processedPostsDetails: Array<{
      post_id: number;
      title: string;
      category_id: number;
      votes_added: number;
      comments_added: number;
      post_likes_added: number;
      comment_likes_added: number;
      priority: number;
      comment_errors?: string[];
    }> = [];

    for (const post of postsToProcess) {
      // 投票数を計算（ゆらぎを考慮）
      const actualVotes = votesPerRun + Math.floor(Math.random() * (votesVariance * 2 + 1)) - votesVariance;
      let votesAddedForThisPost = 0;

      // 投票実行
      for (let i = 0; i < actualVotes; i++) {
        try {
          // ランダムなユーザーを取得
          const useAiMember = Math.random() * 100 <= aiMemberProbability;
          const status = useAiMember ? 6 : 2;

          const { data: users } = await supabase
            .from('users')
            .select('id')
            .eq('status', status)
            .limit(50);

          if (users && users.length > 0) {
            const randomUser = users[Math.floor(Math.random() * users.length)];

            // 投票選択肢を取得
            const { data: choices } = await supabase
              .from('vote_choices')
              .select('id')
              .eq('post_id', post.id);

            if (choices && choices.length > 0) {
              const randomChoice = choices[Math.floor(Math.random() * choices.length)];

              // 投票履歴に追加
              await supabase.from('vote_history').insert({
                post_id: post.id,
                user_id: randomUser.id,
                choice_id: randomChoice.id,
                created_at: new Date().toISOString(),
              });

              // 投票数を更新
              await supabase.rpc('increment_vote_count', {
                choice_id: randomChoice.id,
              });

              totalVotes++;
              votesAddedForThisPost++;
            }
          }
        } catch (error) {
          console.error(`投票エラー (記事ID: ${post.id}):`, error);
        }
      }
      
      // 投票いいね処理
      let postLikesAddedForThisPost = 0;
      if (Math.random() * 100 <= postLikeProbability) {
        try {
          const useAiMember = Math.random() * 100 <= aiMemberProbability;
          const status = useAiMember ? 6 : 2;

          const { data: users } = await supabase
            .from('users')
            .select('id')
            .eq('status', status)
            .limit(50);

          if (users && users.length > 0) {
            const randomUser = users[Math.floor(Math.random() * users.length)];

            await supabase.from('post_likes').insert({
              post_id: post.id,
              user_id: randomUser.id,
              created_at: new Date().toISOString(),
            });

            totalPostLikes++;
            postLikesAddedForThisPost++;
            console.log(`記事ID ${post.id} に投票いいねを追加`);
          }
        } catch (error) {
          console.error(`投票いいねエラー (記事ID: ${post.id}):`, error);
        }
      }

      // コメント投稿処理
      let commentsAddedForThisPost = 0;
      let commentLikesAddedForThisPost = 0;
      const commentErrors: string[] = [];
      
      // 記事の既存コメントを取得
      const { data: existingComments, count: currentCommentCount } = await supabase
        .from('comments')
        .select('id, user_id, content, parent_id', { count: 'exact' })
        .eq('post_id', post.id)
        .order('created_at', { ascending: false });
      
      // 記事ごとの最大コメント数を超えないようにチェック
      const maxCommentsForThisPost = maxCommentsPerPost + Math.floor(Math.random() * (maxCommentsVariance * 2 + 1)) - maxCommentsVariance;
      const remainingComments = Math.max(0, maxCommentsForThisPost - (currentCommentCount || 0));
      
      // コメントが存在しない場合: 新規コメント投稿 → コメントいいね
      // コメントが存在する場合: 新規コメント投稿 OR コメント返信 OR 投稿者返信 のいずれか1つ
      
      if (currentCommentCount === 0) {
        // コメントがない場合: 新規コメント投稿のみ
        if (remainingComments > 0 && commentPrompt) {
          try {
            const useAiMember = Math.random() * 100 <= aiMemberProbability;
            const status = useAiMember ? 6 : 2;

            const { data: users } = await supabase
              .from('users')
              .select('id')
              .eq('status', status)
              .limit(50);

            if (users && users.length > 0) {
              const randomUser = users[Math.floor(Math.random() * users.length)];

              // 投票選択肢を取得
              const { data: voteChoices } = await supabase
                .from('vote_choices')
                .select('choice')
                .eq('post_id', post.id)
                .order('id', { ascending: true });
              
              const choicesText = voteChoices?.map(vc => `「${vc.choice}」`).join('、') || '';

              // ChatGPTでコメント生成（投稿本文と選択肢を含める）
              const prompt = commentPrompt
                .replace('{$question}', post.title)
                .replace('{$content}', post.content || '')
                .replace('{$choices}', choicesText);
              
              if (!openaiApiKey) {
                const errorMsg = 'OpenAI APIキーが設定されていません';
                console.error(errorMsg);
                commentErrors.push(errorMsg);
                break;
              }

              const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${openaiApiKey}`,
                },
                body: JSON.stringify({
                  model: 'gpt-4o-mini',
                  messages: [{ role: 'user', content: prompt }],
                  temperature: 0.9,
                }),
              });

              const data = await response.json();
              
              // エラーチェック
              if (!response.ok || data.error) {
                const errorMsg = `OpenAI APIエラー (status: ${response.status}): ${JSON.stringify(data.error || data)}`;
                console.error(errorMsg);
                commentErrors.push(errorMsg);
                continue;
              }
              
              if (!data.choices || data.choices.length === 0) {
                const errorMsg = `OpenAI APIレスポンスにchoicesがありません`;
                console.error(errorMsg);
                commentErrors.push(errorMsg);
                continue;
              }
              
              const commentText = data.choices[0]?.message?.content?.trim() || '';

              if (!commentText) {
                const errorMsg = 'コメントテキストが空です';
                console.error(errorMsg);
                commentErrors.push(errorMsg);
                continue;
              }

              if (commentText) {
                const { data: comment, error: insertError } = await supabase
                  .from('comments')
                  .insert({
                    post_id: post.id,
                    user_id: randomUser.id,
                    content: commentText,
                    created_at: new Date().toISOString(),
                  })
                  .select()
                  .single();

                if (insertError) {
                  const errorMsg = `コメント挿入エラー: ${insertError.message}`;
                  console.error(errorMsg, insertError);
                  commentErrors.push(errorMsg);
                  continue;
                }

                if (comment) {
                  totalComments++;
                  commentsAddedForThisPost++;

                  // コメントいいね処理（新規コメント投稿時のみ）
                  if (Math.random() * 100 <= likeProbability) {
                    const { data: likeUsers } = await supabase
                      .from('users')
                      .select('id')
                      .eq('status', status)
                      .limit(50);

                    if (likeUsers && likeUsers.length > 0) {
                      const randomLikeUser = likeUsers[Math.floor(Math.random() * likeUsers.length)];

                      await supabase.from('comment_likes').insert({
                        comment_id: comment.id,
                        user_id: randomLikeUser.id,
                        created_at: new Date().toISOString(),
                      });

                      totalCommentLikes++;
                      commentLikesAddedForThisPost++;
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error(`コメント投稿エラー (記事ID: ${post.id}):`, error);
          }
        }
      } else if (existingComments && existingComments.length > 0) {
        // コメントが既に存在する場合: 新規コメント OR コメント返信 OR 投稿者返信 のいずれか1つ
        const actions = [];
        
        // 新規コメント投稿の選択肢
        if (remainingComments > 0 && commentPrompt) {
          actions.push('new_comment');
        }
        
        // コメント返信の選択肢（親コメントのみ対象）
        const parentComments = existingComments.filter(c => !c.parent_id);
        if (parentComments.length > 0 && replyPrompt) {
          actions.push('user_reply');
          actions.push('author_reply');
        }
        
        if (actions.length === 0) {
          // 実行可能なアクションがない場合はスキップ
          continue;
        }
        
        // ランダムに1つのアクションを選択
        const selectedAction = actions[Math.floor(Math.random() * actions.length)];
        
        try {
          if (selectedAction === 'new_comment') {
            // 新規コメント投稿
            const useAiMember = Math.random() * 100 <= aiMemberProbability;
            const status = useAiMember ? 6 : 2;

            const { data: users } = await supabase
              .from('users')
              .select('id')
              .eq('status', status)
              .limit(50);

            if (users && users.length > 0) {
              const randomUser = users[Math.floor(Math.random() * users.length)];
              
              // 投票選択肢を取得
              const { data: voteChoices } = await supabase
                .from('vote_choices')
                .select('choice')
                .eq('post_id', post.id)
                .order('id', { ascending: true });
              
              const choicesText = voteChoices?.map(vc => `「${vc.choice}」`).join('、') || '';
              
              const prompt = commentPrompt
                .replace('{$question}', post.title)
                .replace('{$content}', post.content || '')
                .replace('{$choices}', choicesText);
              
              if (!openaiApiKey) {
                const errorMsg = 'OpenAI APIキーが設定されていません';
                console.error(errorMsg);
                commentErrors.push(errorMsg);
                continue;
              }

              const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${openaiApiKey}`,
                },
                body: JSON.stringify({
                  model: 'gpt-4o-mini',
                  messages: [{ role: 'user', content: prompt }],
                  temperature: 0.9,
                }),
              });

              const data = await response.json();
              
              if (!response.ok || data.error) {
                const errorMsg = `OpenAI APIエラー (status: ${response.status}): ${JSON.stringify(data.error || data)}`;
                console.error(errorMsg);
                commentErrors.push(errorMsg);
                continue;
              }
              
              if (!data.choices || data.choices.length === 0) {
                const errorMsg = `OpenAI APIレスポンスにchoicesがありません`;
                console.error(errorMsg);
                commentErrors.push(errorMsg);
                continue;
              }
              
              const commentText = data.choices[0]?.message?.content?.trim() || '';

              if (!commentText) {
                const errorMsg = 'コメントテキストが空です';
                console.error(errorMsg);
                commentErrors.push(errorMsg);
                continue;
              }

              const { data: comment, error: insertError } = await supabase
                .from('comments')
                .insert({
                  post_id: post.id,
                  user_id: randomUser.id,
                  content: commentText,
                  created_at: new Date().toISOString(),
                })
                .select()
                .single();

              if (insertError) {
                const errorMsg = `コメント挿入エラー: ${insertError.message}`;
                console.error(errorMsg, insertError);
                commentErrors.push(errorMsg);
                continue;
              }

              if (comment) {
                totalComments++;
                commentsAddedForThisPost++;
              }
            }
          } else if (selectedAction === 'user_reply') {
            // コメント返信（一般ユーザー）
            const targetComment = parentComments[Math.floor(Math.random() * parentComments.length)];
            const useAiMember = Math.random() * 100 <= aiMemberProbability;
            const status = useAiMember ? 6 : 2;

            const { data: replyUsers } = await supabase
              .from('users')
              .select('id')
              .eq('status', status)
              .limit(50);

            if (replyUsers && replyUsers.length > 0) {
              const randomReplyUser = replyUsers[Math.floor(Math.random() * replyUsers.length)];
              
              // 投票選択肢を取得
              const { data: voteChoices } = await supabase
                .from('vote_choices')
                .select('choice')
                .eq('post_id', post.id)
                .order('id', { ascending: true });
              
              const choicesText = voteChoices?.map(vc => `「${vc.choice}」`).join('、') || '';
              
              // 投稿情報を含めたプロンプトを生成
              const replyPromptText = replyPrompt
                .replace('{$comment}', targetComment.content)
                .replace('{$question}', post.title)
                .replace('{$content}', post.content || '')
                .replace('{$choices}', choicesText);

              const replyResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${openaiApiKey}`,
                },
                body: JSON.stringify({
                  model: 'gpt-4o-mini',
                  messages: [{ role: 'user', content: replyPromptText }],
                  temperature: 0.9,
                }),
              });

              const replyData = await replyResponse.json();
              if (replyResponse.ok && replyData.choices && replyData.choices.length > 0) {
                const replyText = replyData.choices[0]?.message?.content?.trim() || '';
                if (replyText) {
                  await supabase.from('comments').insert({
                    post_id: post.id,
                    user_id: randomReplyUser.id,
                    parent_id: targetComment.id,
                    content: replyText,
                    created_at: new Date().toISOString(),
                  });
                  totalComments++;
                  commentsAddedForThisPost++;
                }
              }
            }
          } else if (selectedAction === 'author_reply') {
            // 投稿者返信
            const targetComment = parentComments[Math.floor(Math.random() * parentComments.length)];
            
            // 投票選択肢を取得
            const { data: voteChoices } = await supabase
              .from('vote_choices')
              .select('choice')
              .eq('post_id', post.id)
              .order('id', { ascending: true });
            
            const choicesText = voteChoices?.map(vc => `「${vc.choice}」`).join('、') || '';
            
            // 投稿情報を含めたプロンプトを生成
            const authorReplyPromptText = replyPrompt
              .replace('{$comment}', targetComment.content)
              .replace('{$question}', post.title)
              .replace('{$content}', post.content || '')
              .replace('{$choices}', choicesText);

            const authorReplyResponse = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`,
              },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: authorReplyPromptText }],
                temperature: 0.9,
              }),
            });

            const authorReplyData = await authorReplyResponse.json();
            if (authorReplyResponse.ok && authorReplyData.choices && authorReplyData.choices.length > 0) {
              const authorReplyText = authorReplyData.choices[0]?.message?.content?.trim() || '';
              if (authorReplyText) {
                await supabase.from('comments').insert({
                  post_id: post.id,
                  user_id: post.user_id,
                  parent_id: targetComment.id,
                  content: authorReplyText,
                  created_at: new Date().toISOString(),
                });
                totalComments++;
                commentsAddedForThisPost++;
              }
            }
          }
        } catch (error) {
          console.error(`コメント処理エラー (記事ID: ${post.id}, アクション: ${selectedAction}):`, error);
        }
      }
      
      // この記事の処理結果を記録
      processedPostsDetails.push({
        post_id: post.id,
        title: post.title,
        category_id: post.category_id,
        votes_added: votesAddedForThisPost,
        comments_added: commentsAddedForThisPost,
        post_likes_added: postLikesAddedForThisPost,
        comment_likes_added: commentLikesAddedForThisPost,
        priority: post.priority,
        comment_errors: commentErrors.length > 0 ? commentErrors : undefined,
      });
    }

    const result = {
      success: true,
      message: `${postsToProcess.length}件の記事に${totalVotes}票を投票、${totalComments}件のコメント、${totalPostLikes}件の投票いいね、${totalCommentLikes}件のコメントいいねを追加しました`,
      details: {
        processed_posts: postsToProcess.length,
        total_votes: totalVotes,
        total_comments: totalComments,
        total_post_likes: totalPostLikes,
        total_comment_likes: totalCommentLikes,
        posts_details: processedPostsDetails,
        settings_used: {
          posts_per_run: postsPerRun,
          votes_per_run: votesPerRun,
          votes_variance: votesVariance,
          ai_member_probability: aiMemberProbability,
          post_like_probability: postLikeProbability,
          like_probability: likeProbability,
          comments_per_run: commentsPerRun,
          max_comments_per_post: maxCommentsPerPost,
          max_comments_variance: maxCommentsVariance,
        },
      },
    };

    console.log('実行完了:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('一括実行エラー:', error);
    return NextResponse.json(
      {
        success: false,
        message: '実行中にエラーが発生しました',
        error: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
