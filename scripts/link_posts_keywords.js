const { createClient } = require('@supabase/supabase-js');

// ローカルSupabaseに接続
const supabaseUrl = 'http://127.0.0.1:54331';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function linkPostsToKeywords() {
  console.log('キーワードを取得中...');
  
  // 全キーワードを取得
  const { data: keywords, error: keywordsError } = await supabase
    .from('keywords')
    .select('id, keyword');
  
  if (keywordsError) {
    console.error('キーワード取得エラー:', keywordsError);
    return;
  }
  
  console.log(`${keywords.length}個のキーワードを取得しました`);
  
  // 全投稿を取得
  console.log('投稿を取得中...');
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('id, title, content')
    .in('status', ['publish', 'published']);
  
  if (postsError) {
    console.error('投稿取得エラー:', postsError);
    return;
  }
  
  console.log(`${posts.length}件の投稿を取得しました`);
  
  let totalLinks = 0;
  
  // 各投稿に対してキーワードをチェック
  for (const post of posts) {
    const postText = `${post.title} ${post.content}`.toLowerCase();
    const matchedKeywords = [];
    
    // HTMLタグを除去
    const cleanText = postText.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
    
    // 各キーワードが投稿に含まれているかチェック
    for (const keyword of keywords) {
      if (cleanText.includes(keyword.keyword.toLowerCase())) {
        matchedKeywords.push(keyword.id);
      }
    }
    
    // マッチしたキーワードを紐付け
    if (matchedKeywords.length > 0) {
      for (const keywordId of matchedKeywords) {
        const { error: linkError } = await supabase
          .from('post_keywords')
          .upsert(
            { post_id: post.id, keyword_id: keywordId },
            { onConflict: 'post_id,keyword_id', ignoreDuplicates: true }
          );
        
        if (!linkError) {
          totalLinks++;
        }
      }
      
      console.log(`投稿ID ${post.id}: ${matchedKeywords.length}個のキーワードを紐付けました`);
    }
  }
  
  console.log(`\n完了: 合計${totalLinks}個のキーワードリンクを作成しました`);
}

linkPostsToKeywords().catch(console.error);
