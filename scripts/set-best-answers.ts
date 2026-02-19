import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// .env.localファイルを読み込む
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setBestAnswers() {
  console.log('受付中の相談を取得中...');
  
  // 受付中の相談をすべて取得（best_answer_idがnull）
  const { data: allPosts, error: postsError } = await supabase
    .from('posts')
    .select('id, title, user_id')
    .is('best_answer_id', null)
    .in('status', ['publish', 'published'])
    .order('created_at', { ascending: false });

  if (postsError) {
    console.error('投稿の取得エラー:', postsError);
    return;
  }

  if (!allPosts || allPosts.length === 0) {
    console.log('受付中の相談が見つかりませんでした');
    return;
  }

  console.log(`受付中の相談: ${allPosts.length}件`);
  
  // 10件を残して、それ以外を処理対象にする
  const posts = allPosts.slice(10);

  if (posts.length === 0) {
    console.log('処理対象の相談がありません（10件以下のため）');
    return;
  }

  console.log(`10件を残して、${posts.length}件の相談を処理します\n`);

  for (const post of posts) {
    console.log(`\n投稿ID: ${post.id} - ${post.title}`);
    console.log(`相談者ID: ${post.user_id}`);

    // この投稿のコメントを取得（相談者以外）
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('id, content, created_at, user_id')
      .eq('post_id', post.id)
      .eq('status', 'approved')
      .neq('user_id', post.user_id); // 相談者以外

    if (commentsError) {
      console.error(`  コメント取得エラー:`, commentsError);
      continue;
    }

    if (!comments || comments.length === 0) {
      console.log('  相談者以外のコメントがありません');
      continue;
    }

    // 最も文字量が多いコメントを見つける
    let longestComment = comments[0];
    let maxLength = comments[0].content.length;

    for (const comment of comments) {
      const length = comment.content.length;
      if (length > maxLength) {
        maxLength = length;
        longestComment = comment;
      }
    }

    console.log(`  最長コメントID: ${longestComment.id}`);
    console.log(`  文字数: ${maxLength}文字`);
    console.log(`  作成日時: ${longestComment.created_at}`);

    // ベストアンサーを設定
    const { error: updateError } = await supabase
      .from('posts')
      .update({
        best_answer_id: longestComment.id,
        best_answer_selected_at: longestComment.created_at
      })
      .eq('id', post.id);

    if (updateError) {
      console.error(`  ベストアンサー設定エラー:`, updateError);
    } else {
      console.log(`  ✓ ベストアンサーを設定しました`);
    }
  }

  console.log('\n\n処理完了');
}

setBestAnswers().catch(console.error);
