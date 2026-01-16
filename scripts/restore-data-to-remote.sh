#!/bin/bash

# ローカルのデータをリモートSupabaseにリストアするスクリプト

# リモートSupabaseの接続情報
PROJECT_REF="pazyejhciyfoklrhpfvt"
DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

# バックアップファイル
BACKUP_FILE="@backups/local_data_full_20260115_131712.sql"

echo "🔄 リモートSupabaseへのデータリストアを開始します..."
echo "📁 バックアップファイル: $BACKUP_FILE"
echo "🌐 プロジェクトID: $PROJECT_REF"
echo "🌐 ホスト: $DB_HOST"
echo ""
echo "⚠️  Supabaseダッシュボードからデータベースパスワードを取得してください"
echo "   Settings > Database > Database password"
echo ""
read -sp "データベースパスワードを入力してください: " DB_PASSWORD
echo ""
echo ""

# 環境変数でパスワードを設定
export PGPASSWORD="$DB_PASSWORD"

echo "📊 リストアを実行中..."
echo ""

# リストア実行
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=0 \
  < "$BACKUP_FILE" 2>&1 | tail -50

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo ""
  echo "✅ リストアが完了しました！"
  echo ""
  echo "📊 データ確認:"
  echo "リモートSupabaseダッシュボード: https://supabase.com/dashboard/project/$PROJECT_REF/editor"
  echo ""
  echo "🚀 VPSで動作確認:"
  echo "http://133.18.122.123/"
else
  echo ""
  echo "⚠️  リストアが完了しましたが、いくつかのエラーがありました"
  echo "   循環参照の警告は無視して構いません"
  echo ""
  echo "📊 データ確認:"
  echo "リモートSupabaseダッシュボード: https://supabase.com/dashboard/project/$PROJECT_REF/editor"
fi
