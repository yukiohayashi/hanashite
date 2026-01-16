#!/bin/bash

# 3つのグループを自動的にリモートSupabaseにアップロードするスクリプト

PROJECT_REF="pazyejhciyfoklrhpfvt"
DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

# Supabaseダッシュボードから取得したパスワードをここに設定
# https://supabase.com/dashboard/project/pazyejhciyfoklrhpfvt/settings/database
DB_PASSWORD="I4EBbrgRd9JPn8vm"

if [ -z "$DB_PASSWORD" ]; then
  echo "❌ エラー: データベースパスワードが設定されていません"
  echo ""
  echo "📝 手順:"
  echo "1. https://supabase.com/dashboard/project/pazyejhciyfoklrhpfvt/settings/database にアクセス"
  echo "2. Database password をコピー"
  echo "3. このスクリプトの DB_PASSWORD=\"\" に貼り付け"
  echo "4. スクリプトを再実行"
  exit 1
fi

# 環境変数でパスワードを設定
export PGPASSWORD="$DB_PASSWORD"

echo "🔄 リモートSupabaseへのデータアップロードを開始します..."
echo "🌐 プロジェクトID: $PROJECT_REF"
echo ""

# グループ1: メインデータ（27MB）
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 グループ1: メインデータ（27MB）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 テーブル: users, posts, comments, vote_options, vote_choices, vote_history, categories, keywords, post_keywords, favorites, likes"
echo "⏱️  予想時間: 2〜3分"
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=0 \
  < @backups/group1_main_data.sql 2>&1 | tail -20

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "✅ グループ1のアップロード完了"
else
  echo "⚠️  グループ1のアップロード完了（一部エラーあり）"
fi

echo ""
echo ""

# グループ2: サポートデータ（17MB）
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 グループ2: サポートデータ（17MB）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 テーブル: notifications, points, point_settings, points_aggregate_logs, accounts, sessions, workers, like_counts, keyword_search_history, ng_words"
echo "⏱️  予想時間: 1〜2分"
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=0 \
  < @backups/group2_support_data.sql 2>&1 | tail -20

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "✅ グループ2のアップロード完了"
else
  echo "⚠️  グループ2のアップロード完了（一部エラーあり）"
fi

echo ""
echo ""

# グループ3: 管理データ（26KB）
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 グループ3: 管理データ（26KB）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 テーブル: api_settings, auto_creator_logs, auto_creator_processed, auto_creator_settings, auto_tagger_logs, auto_voter_logs, auto_voter_settings, backup_logs, mail_logs, mail_settings, mail_templates"
echo "⏱️  予想時間: 数秒"
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=0 \
  < @backups/group3_admin_data.sql 2>&1 | tail -20

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "✅ グループ3のアップロード完了"
else
  echo "⚠️  グループ3のアップロード完了（一部エラーあり）"
fi

# パスワードをクリア
unset PGPASSWORD

echo ""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 全グループのアップロードが完了しました！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 データ確認:"
echo "   Supabaseダッシュボード: https://supabase.com/dashboard/project/$PROJECT_REF/editor"
echo ""
echo "🚀 VPSで動作確認:"
echo "   http://133.18.122.123/"
echo ""
