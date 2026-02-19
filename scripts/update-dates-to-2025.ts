import { createClient } from '@supabase/supabase-js';

// ローカルSupabaseを使用（このプロジェクト専用のポート）
const supabaseUrl = 'http://127.0.0.1:54331';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateDatesTo2025() {
  console.log('日付を2025年に更新開始...\n');

  try {
    // 1. すべての投稿を取得（ページネーションなしで全件取得）
    let allPosts: any[] = [];
    let offset = 0;
    const limit = 1000;
    
    while (true) {
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, created_at, updated_at')
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (postsError) {
        console.error('投稿の取得エラー:', postsError);
        return;
      }

      if (!posts || posts.length === 0) break;
      
      allPosts = allPosts.concat(posts);
      console.log(`投稿取得中: ${allPosts.length}件`);
      
      if (posts.length < limit) break;
      offset += limit;
    }

    console.log(`\n取得した投稿総数: ${allPosts.length}\n`);

    // 2. すべてのコメントを取得
    let allComments: any[] = [];
    offset = 0;
    
    while (true) {
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('id, post_id, created_at')
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (commentsError) {
        console.error('コメントの取得エラー:', commentsError);
        return;
      }

      if (!comments || comments.length === 0) break;
      
      allComments = allComments.concat(comments);
      console.log(`コメント取得中: ${allComments.length}件`);
      
      if (comments.length < limit) break;
      offset += limit;
    }

    console.log(`\n取得したコメント総数: ${allComments.length}\n`);

    // 3. 投稿の日付を2025年に変更
    let updatedPostsCount = 0;
    for (const post of allPosts || []) {
      const oldDate = new Date(post.created_at);
      const newDate = new Date(oldDate);
      newDate.setFullYear(2025);

      const oldUpdatedAt = post.updated_at ? new Date(post.updated_at) : null;
      const newUpdatedAt = oldUpdatedAt ? new Date(oldUpdatedAt) : null;
      if (newUpdatedAt) {
        newUpdatedAt.setFullYear(2025);
      }

      const { error } = await supabase
        .from('posts')
        .update({
          created_at: newDate.toISOString(),
          updated_at: newUpdatedAt ? newUpdatedAt.toISOString() : newDate.toISOString()
        })
        .eq('id', post.id);

      if (error) {
        console.error(`投稿ID ${post.id} の更新エラー:`, error);
      } else {
        updatedPostsCount++;
        if (updatedPostsCount % 100 === 0) {
          console.log(`投稿更新進捗: ${updatedPostsCount}/${allPosts.length}`);
        }
      }
    }

    console.log(`\n投稿の更新完了: ${updatedPostsCount}件\n`);

    // 4. コメントの日付を2025年に変更
    // 投稿日付より新しくならないように、投稿の日付を取得
    const postDatesMap = new Map<number, Date>();
    for (const post of allPosts || []) {
      const newDate = new Date(post.created_at);
      newDate.setFullYear(2025);
      postDatesMap.set(post.id, newDate);
    }

    let updatedCommentsCount = 0;
    for (const comment of allComments || []) {
      const oldDate = new Date(comment.created_at);
      const newDate = new Date(oldDate);
      newDate.setFullYear(2025);

      // 投稿の日付を取得
      const postDate = postDatesMap.get(comment.post_id);
      
      // コメント日付が投稿日付より新しい場合のみ更新
      // コメント日付が投稿日付より古い場合は、投稿日付と同じにする
      let finalDate = newDate;
      if (postDate && newDate < postDate) {
        finalDate = new Date(postDate.getTime() + 1000); // 投稿日付の1秒後
      }

      const { error } = await supabase
        .from('comments')
        .update({
          created_at: finalDate.toISOString()
        })
        .eq('id', comment.id);

      if (error) {
        console.error(`コメントID ${comment.id} の更新エラー:`, error);
      } else {
        updatedCommentsCount++;
        if (updatedCommentsCount % 100 === 0) {
          console.log(`コメント更新進捗: ${updatedCommentsCount}/${allComments.length}`);
        }
      }
    }

    console.log(`\nコメントの更新完了: ${updatedCommentsCount}件`);
    console.log('\nすべての日付を2025年に更新しました！');

  } catch (error) {
    console.error('エラー:', error);
  }
}

updateDatesTo2025();
