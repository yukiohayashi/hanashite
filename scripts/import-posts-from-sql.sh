#!/bin/bash

# SQLファイルからpostsデータを抽出してSupabaseに移行

echo "=== SQLファイルからpostsデータを抽出中 ==="

# wp_postsのINSERT文を抽出してCSV形式に変換
grep -A 50000 "INSERT INTO \`wp_posts\`" "/Users/yukki/htdocs/kusanagi_html_anke/anke_db (1).sql" | \
  sed -n '/INSERT INTO/,/;$/p' | \
  grep -oP '\([^)]+\)' | \
  sed 's/^(//' | \
  sed 's/)$//' > /tmp/wp_posts_raw.txt

echo "抽出完了。データを処理中..."

# 一時的なSQLファイルを作成
cat > /tmp/import_posts.sql << 'EOSQL'
-- postsテーブルへのデータインポート

-- 一時テーブルを作成
CREATE TEMP TABLE temp_wp_posts (
  id BIGINT,
  post_author BIGINT,
  post_date TEXT,
  post_date_gmt TEXT,
  post_content TEXT,
  post_title TEXT,
  post_excerpt TEXT,
  post_status TEXT,
  comment_status TEXT,
  ping_status TEXT,
  post_password TEXT,
  post_name TEXT,
  to_ping TEXT,
  pinged TEXT,
  post_modified TEXT,
  post_modified_gmt TEXT,
  post_content_filtered TEXT,
  post_parent BIGINT,
  guid TEXT,
  menu_order INT,
  post_type TEXT,
  post_mime_type TEXT,
  comment_count INT
);

-- CSVファイルからインポート（後で手動で実行）
-- \COPY temp_wp_posts FROM '/tmp/wp_posts_data.csv' WITH (FORMAT csv, DELIMITER ',', QUOTE '''');

-- postsテーブルに移行（post_type='post' AND post_status='publish'のみ）
INSERT INTO posts (id, user_id, title, content, status, created_at, updated_at)
SELECT 
  id,
  post_author,
  post_title,
  post_content,
  'published',
  post_date_gmt::timestamptz,
  post_modified_gmt::timestamptz
FROM temp_wp_posts
WHERE post_type = 'post' AND post_status = 'publish'
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  status = EXCLUDED.status,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

EOSQL

echo "SQLファイルを作成しました: /tmp/import_posts.sql"
echo ""
echo "次のステップ:"
echo "1. SQLファイルを確認してください"
echo "2. データを手動でインポートしてください"
