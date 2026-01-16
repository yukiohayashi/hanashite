#!/bin/bash

# アンケNext.js プッシュ&デプロイスクリプト
# 使用方法: ./scripts/push-and-deploy.sh "コミットメッセージ" [--full]

set -e  # エラーが発生したら停止

# コミットメッセージのチェック
if [ -z "$1" ]; then
  echo "❌ エラー: コミットメッセージを指定してください"
  echo "使用方法: ./scripts/push-and-deploy.sh \"コミットメッセージ\" [--full]"
  exit 1
fi

COMMIT_MESSAGE="$1"
FULL_BUILD="$2"

echo "📝 コミットメッセージ: $COMMIT_MESSAGE"
echo ""

# ステップ1: GitHubにプッシュ
echo "🔄 ステップ1: GitHubにプッシュ..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

git add .
git commit -m "$COMMIT_MESSAGE"
git push origin main

echo "✅ GitHubへのプッシュ完了"
echo ""

# ステップ2: VPSにデプロイ
echo "🚀 ステップ2: VPSにデプロイ..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh -i ~/.ssh/anke-nextjs.key ubuntu@133.18.122.123 << ENDSSH
cd /var/www/anke-nextjs

echo "📦 アプリケーションを停止..."
pm2 stop anke-nextjs

echo "📥 最新のコードを取得..."
git pull origin main

echo "📦 依存関係を確認..."
npm install

# フルビルドオプション
if [ "$FULL_BUILD" = "--full" ]; then
  echo "🗑️  ビルドキャッシュをクリア..."
  rm -rf .next
fi

echo "🔨 本番ビルド..."
npm run build

echo "🔄 アプリケーションを再起動..."
pm2 restart anke-nextjs

echo ""
echo "✅ ステータス確認..."
pm2 status

echo ""
echo "🎉 デプロイ完了！"
echo "📍 https://anke.jp"
ENDSSH

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ すべての処理が正常に完了しました"
echo "📍 本番URL: https://anke.jp"
echo "📍 管理画面: https://anke.jp/admin"
