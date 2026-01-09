const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrateCategories() {
  try {
    console.log('カテゴリ移行を開始します...');

    // CSVファイルを読み込み
    const csvPath = '/Users/yukki/htdocs/kusanagi_html_anke/anke_db/wp_anke_post_categories.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    // ヘッダー行をスキップ
    const dataLines = lines.slice(1).filter(line => line.trim());
    console.log(`CSVから${dataLines.length}件のレコードを読み込みました`);

    // データをパース（セミコロン区切り）
    const categories = dataLines.map(line => {
      const [id, post_id, category_id, is_primary, created_at] = line.split(';');
      return {
        post_id: parseInt(post_id),
        category_id: parseInt(category_id)
      };
    });

    console.log(`パース完了: ${categories.length}件`);

    // 既存のcategory_idをクリア
    console.log('既存のカテゴリ割り当てをクリアしています...');
    const { error: clearError } = await supabase
      .from('posts')
      .update({ category_id: null })
      .neq('id', 0); // 全レコード対象

    if (clearError) {
      console.error('クリアエラー:', clearError);
    } else {
      console.log('クリア完了');
    }

    // バッチ処理で更新（100件ずつ）
    const batchSize = 100;
    let updated = 0;
    let notFound = 0;
    let errors = 0;

    for (let i = 0; i < categories.length; i += batchSize) {
      const batch = categories.slice(i, i + batchSize);
      
      // 各投稿を個別に更新
      for (const item of batch) {
        try {
          const { data, error } = await supabase
            .from('posts')
            .update({ category_id: item.category_id })
            .eq('id', item.post_id);

          if (error) {
            errors++;
            if (errors <= 10) {
              console.error(`エラー (post_id: ${item.post_id}):`, error.message);
            }
          } else {
            updated++;
          }
        } catch (e) {
          errors++;
          if (errors <= 10) {
            console.error(`例外 (post_id: ${item.post_id}):`, e.message);
          }
        }
      }

      // 進捗表示
      const progress = Math.min(i + batchSize, categories.length);
      console.log(`処理中: ${progress} / ${categories.length} (${Math.round(progress / categories.length * 100)}%)`);
    }

    console.log('\n移行完了！');
    console.log(`更新件数: ${updated}件`);
    console.log(`エラー件数: ${errors}件`);

    // 結果を確認
    console.log('\nカテゴリごとの投稿数を確認しています...');
    const { data: result, error: resultError } = await supabase
      .from('posts')
      .select('category_id')
      .in('status', ['publish', 'published'])
      .not('category_id', 'is', null);

    if (resultError) {
      console.error('確認エラー:', resultError);
    } else {
      const counts = {};
      result.forEach(row => {
        counts[row.category_id] = (counts[row.category_id] || 0) + 1;
      });

      console.log('\nカテゴリID | 投稿数');
      console.log('----------+-------');
      Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([categoryId, count]) => {
          console.log(`${categoryId.toString().padStart(9)} | ${count.toString().padStart(6)}`);
        });
    }

    console.log('\n完了しました！');
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  }
}

migrateCategories();
