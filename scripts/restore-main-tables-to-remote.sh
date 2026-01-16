#!/bin/bash

# 主要テーブルのデータをリモートSupabaseにリストアするスクリプト

# リモートSupabaseの接続情報（Supabase Cloudから取得）
PROJECT_REF="pazyejhciyfoklrhpfvt"
DB_PASSWORD="Anke@2026!SecureDB#"
DB_HOST="aws-0-ap-southeast-1.pooler.supabase.com"
DB_PORT="6543"
DB_NAME="postgres"
DB_USER="postgres.${PROJECT_REF}"

# 環境変数でパスワードを設定（URLエンコード不要）
export PGPASSWORD="$DB_PASSWORD"

# バックアップファイル
BACKUP_FILE="@backups/main_tables_data_20260115_130901.sql"

echo "🔄 リモートSupabaseへのデータリストアを開始します..."
echo "📁 バックアップファイル: $BACKUP_FILE"
echo "🌐 プロジェクトID: $PROJECT_REF"
echo ""

# リストア実行
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ リストアが完了しました！"
  echo ""
  echo "📊 データ確認:"
  echo "リモートSupabaseダッシュボード: https://supabase.com/dashboard/project/$PROJECT_REF/editor"
else
  echo ""
  echo "❌ リストアに失敗しました"
  exit 1
fi
