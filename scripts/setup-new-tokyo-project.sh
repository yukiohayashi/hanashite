#!/bin/bash

# 新しいSupabaseプロジェクト（東京）にスキーマとデータをセットアップするスクリプト

# 新しいプロジェクト情報
PROJECT_REF="btjwtqkwigunbmklsgpj"  # Project Reference ID
DB_PASSWORD="mfT9BeG0MfC1dW3f"
DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

# バックアップファイル
SCHEMA_FILE="@backups/schema_only_20260115_134935.sql"
DATA_GROUP1="@backups/group1_main_data.sql"
DATA_GROUP2="@backups/group2_support_data.sql"
DATA_GROUP3="@backups/group3_admin_data.sql"

# 環境変数でパスワードを設定
export PGPASSWORD="$DB_PASSWORD"

echo "🚀 新しいSupabaseプロジェクト（東京）のセットアップを開始します..."
echo "🌐 プロジェクトID: $PROJECT_REF"
echo "🌐 リージョン: 東京（ap-northeast-1）"
echo ""

# ステップ1: スキーマを作成
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 ステップ1: スキーマ（テーブル構造）を作成"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏱️  予想時間: 数秒"
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=0 \
  < "$SCHEMA_FILE" 2>&1 | tail -20

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "✅ スキーマの作成完了"
else
  echo "⚠️  スキーマの作成完了（一部エラーあり）"
fi

echo ""
echo ""

# ステップ2: グループ1のデータをアップロード
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 ステップ2: グループ1（メインデータ 27MB）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 テーブル: users, posts, comments, vote_options, vote_choices, vote_history, categories, keywords, post_keywords, favorites, likes"
echo "⏱️  予想時間: 2〜3分"
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=0 \
  < "$DATA_GROUP1" 2>&1 | tail -20

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "✅ グループ1のアップロード完了"
else
  echo "⚠️  グループ1のアップロード完了（一部エラーあり）"
fi

echo ""
echo ""

# ステップ3: グループ2のデータをアップロード
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 ステップ3: グループ2（サポートデータ 17MB）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 テーブル: notifications, points, point_settings, points_aggregate_logs, accounts, sessions, workers, like_counts, keyword_search_history, ng_words"
echo "⏱️  予想時間: 1〜2分"
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=0 \
  < "$DATA_GROUP2" 2>&1 | tail -20

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "✅ グループ2のアップロード完了"
else
  echo "⚠️  グループ2のアップロード完了（一部エラーあり）"
fi

echo ""
echo ""

# ステップ4: グループ3のデータをアップロード
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 ステップ4: グループ3（管理データ 26KB）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 テーブル: api_settings, auto_creator_logs, auto_creator_processed, auto_creator_settings, auto_tagger_logs, auto_voter_logs, auto_voter_settings, backup_logs, mail_logs, mail_settings, mail_templates"
echo "⏱️  予想時間: 数秒"
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=0 \
  < "$DATA_GROUP3" 2>&1 | tail -20

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
echo "✅ 新しいプロジェクトのセットアップが完了しました！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 データ確認:"
echo "   Supabaseダッシュボード: https://supabase.com/dashboard/project/$PROJECT_REF/editor"
echo ""
echo "🔄 次のステップ:"
echo "   1. Supabaseダッシュボードで Settings > API から接続情報を取得"
echo "   2. ローカルの .env.local を更新"
echo "   3. VPSの .env.local を更新"
echo "   4. VPSでアプリケーションを再起動"
echo ""
