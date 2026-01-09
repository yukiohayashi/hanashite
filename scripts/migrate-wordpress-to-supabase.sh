#!/bin/bash

# WordPressからSupabaseへのデータ移行スクリプト

echo "=== WordPressからSupabaseへのデータ移行 ==="

# 1. postsテーブルの移行
echo ""
echo "1. postsテーブルを移行中..."

ssh anke_new "mysql -u root anke_db -N -e \"
SELECT 
  ID,
  post_author,
  post_title,
  post_content,
  'published',
  post_date_gmt,
  post_modified_gmt
FROM wp_posts 
WHERE post_type = 'post' 
AND post_status = 'publish'
ORDER BY ID;
\" | sed 's/\t/|/g'" | while IFS='|' read -r id user_id title content status created_at updated_at; do
  
  # エスケープ処理
  title_escaped=$(echo "$title" | sed "s/'/''/g")
  content_escaped=$(echo "$content" | sed "s/'/''/g")
  
  # Supabaseに挿入
  docker exec -i supabase_db_anke-nextjs psql -U postgres -d postgres << EOF
INSERT INTO posts (id, user_id, title, content, status, created_at, updated_at)
VALUES (
  $id,
  $user_id,
  '$title_escaped',
  '$content_escaped',
  '$status',
  '$created_at',
  '$updated_at'
)
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  status = EXCLUDED.status,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;
EOF

  echo "Migrated post ID: $id"
done

echo ""
echo "=== 移行完了 ==="
