#!/bin/bash

# グループ1のデータをリモートSupabaseにアップロードするスクリプト

PROJECT_REF="pazyejhciyfoklrhpfvt"
BACKUP_FILE="@backups/group1_main_data.sql"

echo "🔄 グループ1（メインデータ）をリモートSupabaseにアップロード中..."
echo "📁 ファイル: $BACKUP_FILE (27MB)"
echo "📊 テーブル: users, posts, comments, vote_options, vote_choices, vote_history, categories, keywords, post_keywords, favorites, likes"
echo ""
echo "⏱️  予想時間: 2〜3分"
echo ""

# データベースパスワードを入力
read -sp "Supabaseデータベースパスワードを入力してください: " DB_PASSWORD
echo ""
echo ""

# 環境変数でパスワードを設定
export PGPASSWORD="$DB_PASSWORD"

# psqlで直接アップロード
psql -h "db.${PROJECT_REF}.supabase.co" \
  -p 5432 \
  -U postgres \
  -d postgres \
  -v ON_ERROR_STOP=0 \
  < "$BACKUP_FILE"

EXIT_CODE=$?

# パスワードをクリア
unset PGPASSWORD

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "✅ グループ1のアップロードが完了しました！"
  echo ""
  echo "📊 次のステップ: グループ2をアップロード"
  echo "   ./scripts/upload-group2.sh"
else
  echo ""
  echo "❌ アップロードに失敗しました"
  exit 1
fi
