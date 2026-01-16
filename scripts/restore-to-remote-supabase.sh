#!/bin/bash

# ローカルのバックアップをリモートSupabaseにリストアするスクリプト

# リモートSupabaseの接続情報
REMOTE_HOST="aws-0-ap-northeast-1.pooler.supabase.com"
REMOTE_PORT="6543"
REMOTE_DB="postgres"
REMOTE_USER="postgres.pazyejhciyfoklrhpfvt"
REMOTE_PASSWORD="Anke@2026!SecureDB#"

# バックアップファイル
BACKUP_FILE="@backups/db_full_20260115_123115.sql"

echo "🔄 リモートSupabaseへのリストアを開始します..."
echo "📁 バックアップファイル: $BACKUP_FILE"
echo "🌐 リモートホスト: $REMOTE_HOST"
echo ""

# リストア実行
PGPASSWORD="$REMOTE_PASSWORD" psql \
  -h "$REMOTE_HOST" \
  -p "$REMOTE_PORT" \
  -U "$REMOTE_USER" \
  -d "$REMOTE_DB" \
  < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ リストアが完了しました！"
else
  echo ""
  echo "❌ リストアに失敗しました"
  exit 1
fi
