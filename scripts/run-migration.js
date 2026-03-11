const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  const migrationFile = path.join(__dirname, '../supabase/migrations/20260311_update_marriage_to_relationship_status.sql');
  const sql = fs.readFileSync(migrationFile, 'utf8');
  
  console.log('マイグレーションを実行中...');
  console.log(sql);
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('エラー:', error);
    process.exit(1);
  }
  
  console.log('✅ マイグレーション完了');
}

runMigration();
