const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Supabase接続設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

// PHPシリアライズデータからカテゴリIDを抽出
function extractCategoryId(aiTaggerResult) {
  if (!aiTaggerResult) return null;
  
  // パターン: s:2:"id";i:数字;
  const match = aiTaggerResult.match(/s:2:"id";i:(\d+);/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  
  return null;
}

async function migrateCategoriesFromAiTagger() {
  console.log('カテゴリマイグレーション開始...');
  
  // ai_tagger_resultがあるがcategory_idが未設定の投稿を取得
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, ai_tagger_result')
    .is('category_id', null)
    .not('ai_tagger_result', 'is', null)
    .neq('ai_tagger_result', '');
  
  if (error) {
    console.error('投稿取得エラー:', error);
    return;
  }
  
  console.log(`処理対象: ${posts.length}件の投稿`);
  
  let updatedCount = 0;
  let skippedCount = 0;
  
  for (const post of posts) {
    const categoryId = extractCategoryId(post.ai_tagger_result);
    
    if (categoryId) {
      // category_idを更新
      const { error: updateError } = await supabase
        .from('posts')
        .update({ category_id: categoryId })
        .eq('id', post.id);
      
      if (updateError) {
        console.error(`投稿ID ${post.id} の更新エラー:`, updateError);
      } else {
        updatedCount++;
        if (updatedCount % 100 === 0) {
          console.log(`進捗: ${updatedCount}件更新済み`);
        }
      }
    } else {
      skippedCount++;
    }
  }
  
  console.log('\n完了！');
  console.log(`更新: ${updatedCount}件`);
  console.log(`スキップ: ${skippedCount}件`);
}

// 実行
migrateCategoriesFromAiTagger()
  .then(() => {
    console.log('マイグレーション完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('マイグレーションエラー:', error);
    process.exit(1);
  });
