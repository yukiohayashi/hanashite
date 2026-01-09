const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase設定
const supabaseUrl = 'https://yukohayashi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1a29oYXlhc2hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI2MDk1NjksImV4cCI6MjA0ODE4NTU2OX0.vqXkJYWmQUDLxvYMJMUJZOSGxXqXNRJYXFcqJLCOqWI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function importVoteChoices() {
  console.log('=== Supabaseに投票選択肢データをインポート ===\n');

  // CSVファイルを読み込む
  const csvPath = path.join(__dirname, 'vote_choices_import.csv');
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  
  // CSVをパース（ヘッダー行をスキップ）
  const lines = csvData.split('\n').slice(1).filter(line => line.trim());
  
  console.log(`読み込んだデータ件数: ${lines.length}件\n`);

  // バッチサイズ（Supabaseの制限に合わせて調整）
  const batchSize = 1000;
  let successCount = 0;
  let errorCount = 0;

  // バッチごとに処理
  for (let i = 0; i < lines.length; i += batchSize) {
    const batch = lines.slice(i, i + batchSize);
    const records = [];

    for (const line of batch) {
      // CSVの各行をパース（ダブルクォートで囲まれた値を処理）
      const matches = line.match(/"([^"]*)"/g);
      if (matches && matches.length === 4) {
        const [id, post_id, choice, vote_count] = matches.map(m => m.replace(/"/g, ''));
        records.push({
          id: parseInt(id),
          post_id: parseInt(post_id),
          choice: choice,
          vote_count: parseInt(vote_count)
        });
      }
    }

    if (records.length > 0) {
      console.log(`バッチ ${Math.floor(i / batchSize) + 1}: ${records.length}件をインポート中...`);
      
      const { data, error } = await supabase
        .from('vote_choices')
        .upsert(records, { onConflict: 'id' });

      if (error) {
        console.error(`エラー:`, error.message);
        errorCount += records.length;
      } else {
        successCount += records.length;
        console.log(`✓ 成功: ${successCount}件\n`);
      }
    }
  }

  console.log('\n=== インポート完了 ===');
  console.log(`成功: ${successCount}件`);
  console.log(`エラー: ${errorCount}件`);
  console.log('\n次のステップ:');
  console.log('http://localhost:3000/posts/561578 で投票選択肢が表示されることを確認してください');
}

importVoteChoices().catch(console.error);
