import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    console.log('=== AI自動コメント 一括実行開始 ===');
    
    // 設定を取得
    const { data: settingsData } = await supabase
      .from('auto_commenter_liker_settings')
      .select('*');

    const settings: Record<string, string> = {};
    settingsData?.forEach((item) => {
      settings[item.setting_key] = item.setting_value;
    });

    // 実行間隔チェック
    const interval = parseInt(settings.interval || '12');
    const intervalVariance = parseInt(settings.interval_variance || '5');
    
    const { data: lastExecutedData } = await supabase
      .from('auto_commenter_liker_settings')
      .select('setting_value')
      .eq('setting_key', 'last_executed_at')
      .maybeSingle();
    
    if (lastExecutedData?.setting_value) {
      const lastExecutionTime = new Date(lastExecutedData.setting_value);
      const now = new Date();
      
      // 次回実行予定時刻を取得または生成
      const { data: nextExecData } = await supabase
        .from('auto_commenter_liker_settings')
        .select('setting_value')
        .eq('setting_key', 'next_execution_time')
        .maybeSingle();
      
      let nextExecutionTime: Date;
      
      if (nextExecData?.setting_value) {
        nextExecutionTime = new Date(nextExecData.setting_value);
      } else {
        // 次回実行予定時刻が設定されていない場合は、ゆらぎを適用して生成
        const minInterval = interval - intervalVariance;
        const maxInterval = interval + intervalVariance;
        const randomInterval = minInterval + Math.random() * (maxInterval - minInterval);
        nextExecutionTime = new Date(lastExecutionTime.getTime() + randomInterval * 60 * 1000);
        
        // 次回実行予定時刻を保存
        await supabase
          .from('auto_commenter_liker_settings')
          .upsert({
            setting_key: 'next_execution_time',
            setting_value: nextExecutionTime.toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'setting_key'
          });
      }
      
      // 次回実行予定時刻になっていない場合はスキップ
      if (now < nextExecutionTime) {
        const remainingMinutes = Math.ceil((nextExecutionTime.getTime() - now.getTime()) / (1000 * 60));
        console.log(`次回実行予定時刻まで待機: あと${remainingMinutes}分`);
        return NextResponse.json({
          success: false,
          message: `次回実行予定時刻まで待機（あと${remainingMinutes}分）`,
          skipped: true,
          nextExecutionTime: nextExecutionTime.toISOString(),
        });
      }
    }

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
    const aiMemberProbability = parseInt(settings.ai_member_probability || '70');
    const postLikeProbability = parseInt(settings.post_like_probability || '50');
    const likeProbability = parseInt(settings.like_probability || '40');
    const commentsPerRun = parseInt(settings.comments_per_run || '1');
    const maxCommentsPerPost = parseInt(settings.max_comments_per_post || '20');
    const maxCommentsVariance = parseInt(settings.max_comments_variance || '10');
    const commentPrompt = settings.comment_prompt || '';
    const replyPrompt = settings.reply_prompt || '';

    console.log('コメントプロンプト:', commentPrompt ? `設定済み (${commentPrompt.length}文字)` : '未設定');
    console.log('返信プロンプト:', replyPrompt ? `設定済み (${replyPrompt.length}文字)` : '未設定');

    // API設定を取得
    const { data: apiSettings, error: apiError } = await supabase
      .from('api_settings')
      .select('api_key')
      .eq('api_name', 'OpenAI')
      .single();
    
    console.log('API設定取得結果:', { apiSettings, apiError });
    
    const openaiApiKey = apiSettings?.api_key || process.env.OPENAI_API_KEY;
    
    console.log('OpenAI APIキー:', openaiApiKey ? `設定済み (${openaiApiKey.substring(0, 10)}...)` : '未設定');
    
    if (!openaiApiKey) {
      console.error('OpenAI APIキーが設定されていません');
    }

    console.log('実行パラメータ:', {
      postsPerRun,
      aiMemberProbability,
      postLikeProbability,
      likeProbability,
      commentsPerRun,
      maxCommentsPerPost,
      maxCommentsVariance,
    });

    // カテゴリごとの設定
    const categorySettings: Record<number, { target_days: number }> = {
      1: { target_days: 180 },   // アニメ・漫画
      2: { target_days: 180 },   // エンタメ
      3: { target_days: 180 },   // お受験
      4: { target_days: 180 },   // クレカ・電子マネー
      5: { target_days: 180 },   // ゲーム
      6: { target_days: 180 },   // ジャニーズ
      7: { target_days: 180 },   // ファッション
      8: { target_days: 180 },   // ペット
      10: { target_days: 180 },  // 住まい・不動産
      11: { target_days: 180 },  // 保険
      12: { target_days: 180 },  // 医療費
      13: { target_days: 180 },  // 婚活・結婚
      14: { target_days: 180 },  // 就職・転職
      15: { target_days: 180 },  // 恋愛
      16: { target_days: 180 },  // 投資・貯蓄
      17: { target_days: 180 },  // 整形・脱毛
      18: { target_days: 180 },  // 料理・グルメ
      19: { target_days: 180 },  // 旅行・ホテル
      20: { target_days: 180 },  // 税金・年金
      21: { target_days: 180 },  // 競馬・ギャンブル
      22: { target_days: 180 },  // 美容・コスメ
      23: { target_days: 180 },  // 育児
      24: { target_days: 180 },  // 雑談
      25: { target_days: 180 },  // ニュース・話題
    };

    const prioritizeRecentPosts = settings.prioritize_recent_posts === '1';
    const priorityDays = parseInt(settings.priority_days || '3');
    const priorityWeight = parseInt(settings.priority_weight || '5');

    console.log('優先設定:', {
      prioritizeRecentPosts,
      priorityDays,
      priorityWeight,
    });

    // 対象記事を取得（コメント数を含める）
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        id, 
        title, 
        content, 
        category_id, 
        created_at, 
        user_id, 
        best_answer_id,
        comments:comments!comments_post_id_fkey(count)
      `)
      .eq('status', 'published')
      .neq('user_id', 1) // 管理者投稿を除外
      .order('created_at', { ascending: false })
      .limit(200); // 取得件数を増やして選択肢を広げる

    if (postsError) {
      console.error('記事取得エラー:', postsError);
    }
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

    // カテゴリ設定に基づいてフィルタリング & ベストアンサー有りは除外
    const filteredPosts = posts.filter(post => {
      // ベストアンサーが設定されている投稿は除外
      if (post.best_answer_id) {
        return false;
      }
      
      const categorySetting = categorySettings[post.category_id] || { target_days: 180 };
      const postDate = new Date(post.created_at);
      const daysDiff = Math.floor((Date.now() - postDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysDiff <= categorySetting.target_days;
    });

    // 優先度を計算（新ルール）
    const postsWithPriority = filteredPosts.map(post => {
      const postDate = new Date(post.created_at);
      const hoursDiff = (Date.now() - postDate.getTime()) / (1000 * 60 * 60);
      const commentCount = Array.isArray(post.comments) ? post.comments.length : ((post.comments as any)?.[0]?.count || 0);
      
      let priority = 0;
      
      // 1. コメント0件の投稿に最高優先度を付与
      if (commentCount === 0) {
        priority += 1000;
      }
      
      // 2. 日付の最新度による優先度
      if (prioritizeRecentPosts) {
        if (hoursDiff <= 24) {
          priority += priorityWeight * 10; // 24時間以内: +50
        } else if (hoursDiff <= 48) {
          priority += priorityWeight * 6;  // 48時間以内: +30
        } else if (hoursDiff <= priorityDays * 24) {
          priority += priorityWeight * 3;  // 3日以内: +15
        } else {
          priority += priorityWeight;      // それ以降: +5
        }
      }
      
      // 3. コメント数が少ないほど優先度を上げる（コメント0件以外）
      if (commentCount > 0) {
        const maxComments = parseInt(settings.max_comments_per_post || '50');
        const commentPenalty = (commentCount / maxComments) * 100;
        priority -= commentPenalty; // コメントが多いほど優先度が下がる
      }
      
      return { ...post, priority, commentCount };
    });

    // 優先度でソート（高い順）
    postsWithPriority.sort((a, b) => b.priority - a.priority);

    console.log('優先度トップ5:', postsWithPriority.slice(0, 5).map(p => ({
      id: p.id,
      title: p.title.substring(0, 30),
      priority: p.priority,
      commentCount: p.commentCount,
      hoursDiff: Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60))
    })));

    // 処理する記事を選択（優先度順）
    // commentsPerRunの数だけコメントを投稿するため、複数の投稿を対象にする
    const postsToProcess = postsWithPriority.slice(0, Math.max(postsPerRun, commentsPerRun * 2));
    let totalComments = 0;
    let totalPostLikes = 0;
    let totalCommentLikes = 0;
    const processedPostsDetails: Array<{
      post_id: number;
      title: string;
      category_id: number;
      comments_added: number;
      post_likes_added: number;
      comment_likes_added: number;
      priority: number;
      comment_errors?: string[];
    }> = [];

    for (const post of postsToProcess) {
      // commentsPerRunに達したら終了
      if (totalComments >= commentsPerRun) {
        break;
      }
      // 投稿いいね処理
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
      
      console.log(`\n=== 記事ID ${post.id} のコメント投稿処理開始 ===`);
      
      // 記事の既存コメントを取得
      const { data: existingComments, count: currentCommentCount } = await supabase
        .from('comments')
        .select('id, user_id, content, parent_id', { count: 'exact' })
        .eq('post_id', post.id)
        .order('created_at', { ascending: false });
      
      console.log(`既存コメント数: ${currentCommentCount}`);
      
      // 記事ごとの最大コメント数を超えないようにチェック
      const maxCommentsForThisPost = maxCommentsPerPost + Math.floor(Math.random() * (maxCommentsVariance * 2 + 1)) - maxCommentsVariance;
      const remainingComments = Math.max(0, maxCommentsForThisPost - (currentCommentCount || 0));
      
      console.log(`最大コメント数: ${maxCommentsForThisPost}, 残り: ${remainingComments}`);
      console.log(`commentPrompt存在: ${!!commentPrompt}`);
      
      // コメントが存在しない場合: 新規コメント投稿 → コメントいいね
      // コメントが存在する場合: 新規コメント投稿 OR コメント返信 OR 投稿者返信 のいずれか1つ
      
      if (currentCommentCount === 0) {
        console.log('コメントがない場合の処理開始');
        // コメントがない場合: 新規コメント投稿のみ
        if (remainingComments > 0 && commentPrompt) {
          console.log('新規コメント投稿を実行');
          try {
            // AI会員（status: 4）のみを使用
            const { data: users } = await supabase
              .from('users')
              .select('id')
              .eq('status', 4)
              .limit(50);

            console.log(`取得したユーザー数: ${users?.length || 0} (status: 4)`);

            if (users && users.length > 0) {
              const randomUser = users[Math.floor(Math.random() * users.length)];
              console.log(`選択したユーザーID: ${randomUser.id}`);

              // 投票選択肢を取得
              const { data: voteChoices } = await supabase
                .from('vote_choices')
                .select('choice')
                .eq('post_id', post.id)
                .order('id', { ascending: true });
              
              const choicesText = voteChoices?.map(vc => `「${vc.choice}」`).join('、') || '';
              console.log(`投票選択肢: ${choicesText}`);

              // ChatGPTでコメント生成（投稿本文と選択肢を含める）
              const prompt = commentPrompt
                .replace('{$question}', post.title)
                .replace('{$content}', post.content || '')
                .replace('{$choices}', choicesText);
              
              console.log(`プロンプト生成完了 (${prompt.length}文字)`);
              
              if (!openaiApiKey) {
                const errorMsg = 'OpenAI APIキーが設定されていません';
                console.error(errorMsg);
                commentErrors.push(errorMsg);
              } else {
              console.log('OpenAI APIを呼び出し中...');

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
              
              console.log(`OpenAI APIレスポンス受信 (status: ${response.status})`);
              
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
              console.log(`生成されたコメント: ${commentText}`);

              if (!commentText) {
                const errorMsg = 'コメントテキストが空です';
                console.error(errorMsg);
                commentErrors.push(errorMsg);
                continue;
              }

              if (commentText) {
                console.log('コメントをデータベースに挿入中...');
                const { data: comment, error: insertError } = await supabase
                  .from('comments')
                  .insert({
                    post_id: post.id,
                    user_id: randomUser.id,
                    content: commentText,
                    status: 'approved',
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
                  console.log(`✅ コメント挿入成功 (ID: ${comment.id})`);
                  totalComments++;
                  commentsAddedForThisPost++;

                  // コメントいいね処理（新規コメント投稿時のみ）
                  if (Math.random() * 100 <= likeProbability) {
                    const { data: likeUsers } = await supabase
                      .from('users')
                      .select('id')
                      .eq('status', 4)
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
            }
          } catch (error) {
            console.error(`コメント投稿エラー (記事ID: ${post.id}):`, error);
          }
        }
      } else if (existingComments && existingComments.length > 0) {
        console.log('既存コメントがある場合の処理開始');
        // コメントが既に存在する場合: 新規コメント OR コメント返信 OR 投稿者返信 のいずれか1つ
        const actions = [];
        
        // 新規コメント投稿の選択肢
        if (remainingComments > 0 && commentPrompt) {
          actions.push('new_comment');
          console.log('アクション追加: new_comment');
        }
        
        // コメント返信の選択肢（親コメントのみ対象）
        const parentComments = existingComments.filter(c => !c.parent_id);
        console.log(`親コメント数: ${parentComments.length}, replyPrompt存在: ${!!replyPrompt}`);
        if (parentComments.length > 0 && replyPrompt) {
          actions.push('user_reply');
          actions.push('author_reply');
          console.log('アクション追加: user_reply, author_reply');
        }
        
        console.log(`利用可能なアクション: ${actions.join(', ')}`);
        
        if (actions.length === 0) {
          console.log('⚠️ 実行可能なアクションがないためスキップ');
          // 実行可能なアクションがない場合はスキップ
          continue;
        }
        
        // ランダムに1つのアクションを選択
        const selectedAction = actions[Math.floor(Math.random() * actions.length)];
        console.log(`選択されたアクション: ${selectedAction}`);
        
        try {
          if (selectedAction === 'new_comment') {
            console.log('新規コメント投稿処理開始（既存コメントあり）');
            // AI会員（status: 4）のみを使用
            const { data: users } = await supabase
              .from('users')
              .select('id')
              .eq('status', 4)
              .limit(50);

            console.log(`取得したユーザー数: ${users?.length || 0} (status: 4)`);

            if (users && users.length > 0) {
              const randomUser = users[Math.floor(Math.random() * users.length)];
              console.log(`選択したユーザーID: ${randomUser.id}`);
              
              // 投票選択肢を取得
              const { data: voteChoices } = await supabase
                .from('vote_choices')
                .select('choice')
                .eq('post_id', post.id)
                .order('id', { ascending: true });
              
              const choicesText = voteChoices?.map(vc => `「${vc.choice}」`).join('、') || '';
              console.log(`投票選択肢: ${choicesText}`);
              
              const prompt = commentPrompt
                .replace('{$question}', post.title)
                .replace('{$content}', post.content || '')
                .replace('{$choices}', choicesText);
              
              console.log(`プロンプト生成完了 (${prompt.length}文字)`);
              
              if (!openaiApiKey) {
                const errorMsg = 'OpenAI APIキーが設定されていません';
                console.error(errorMsg);
                commentErrors.push(errorMsg);
                continue;
              }

              console.log('OpenAI APIを呼び出し中...');
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
              console.log(`OpenAI APIレスポンス受信 (status: ${response.status})`);
              
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
              console.log(`生成されたコメント: ${commentText}`);

              if (!commentText) {
                const errorMsg = 'コメントテキストが空です';
                console.error(errorMsg);
                commentErrors.push(errorMsg);
                continue;
              }

              console.log('コメントをデータベースに挿入中...');
              const { data: comment, error: insertError } = await supabase
                .from('comments')
                .insert({
                  post_id: post.id,
                  user_id: randomUser.id,
                  content: commentText,
                  status: 'approved',
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
                console.log(`✅ コメント挿入成功 (ID: ${comment.id})`);
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
        comments_added: commentsAddedForThisPost,
        post_likes_added: postLikesAddedForThisPost,
        comment_likes_added: commentLikesAddedForThisPost,
        priority: post.priority,
        comment_errors: commentErrors.length > 0 ? commentErrors : undefined,
      });
    }

    // 次回実行予定時刻を計算して保存
    const executionTime = new Date();
    const minInterval = interval - intervalVariance;
    const maxInterval = interval + intervalVariance;
    const randomInterval = minInterval + Math.random() * (maxInterval - minInterval);
    const nextExecutionTime = new Date(executionTime.getTime() + randomInterval * 60 * 1000);

    await supabase
      .from('auto_commenter_liker_settings')
      .upsert({
        setting_key: 'last_executed_at',
        setting_value: executionTime.toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_key'
      });

    await supabase
      .from('auto_commenter_liker_settings')
      .upsert({
        setting_key: 'next_execution_time',
        setting_value: nextExecutionTime.toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_key'
      });

    console.log(`次回実行予定時刻を設定: ${nextExecutionTime.toISOString()} (${Math.round(randomInterval)}分後)`);

    const result = {
      success: true,
      message: `${postsToProcess.length}件の記事に${totalComments}件のコメント、${totalPostLikes}件の投稿いいね、${totalCommentLikes}件のコメントいいねを追加しました`,
      details: {
        processed_posts: postsToProcess.length,
        total_comments: totalComments,
        total_post_likes: totalPostLikes,
        total_comment_likes: totalCommentLikes,
        posts_details: processedPostsDetails,
        settings_used: {
          posts_per_run: postsPerRun,
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
