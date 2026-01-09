const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSequence() {
  console.log('pointsテーブルのIDシーケンスをリセットします...');
  
  // 最大IDを取得
  const { data: maxData, error: maxError } = await supabase
    .from('points')
    .select('id')
    .order('id', { ascending: false })
    .limit(1);

  if (maxError) {
    console.error('最大ID取得エラー:', maxError);
    process.exit(1);
  }

  const maxId = maxData && maxData.length > 0 ? maxData[0].id : 0;
  console.log('現在の最大ID:', maxId);

  // シーケンスをリセット
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `SELECT setval('points_id_seq', ${maxId});`
  });

  if (error) {
    console.error('シーケンスリセットエラー:', error);
    console.log('\n手動でSupabaseダッシュボードから以下のSQLを実行してください:');
    console.log(`SELECT setval('points_id_seq', (SELECT MAX(id) FROM points));`);
    process.exit(1);
  }

  console.log('シーケンスリセット成功:', data);
  console.log('次のIDは', maxId + 1, 'から採番されます');
}

fixSequence();
