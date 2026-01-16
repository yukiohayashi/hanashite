#!/bin/bash

# アンケNext.js VPSデプロイスクリプト
# 使用方法: ./scripts/deploy.sh [--full]

set -e  # エラーが発生したら停止

echo "🚀 デプロイを開始します..."

# VPSに接続してデプロイ
ssh -i ~/.ssh/anke-nextjs.key ubuntu@133.18.122.123 << 'ENDSSH'
cd /var/www/anke-nextjs

echo "📦 アプリケーションを停止..."
pm2 stop anke-nextjs

echo "📥 最新のコードを取得..."
git pull origin main

echo "📦 依存関係を確認..."
npm install

# フルビルドオプション（引数で--fullが渡された場合）
if [ "$1" = "--full" ]; then
  echo "🗑️  ビルドキャッシュをクリア..."
  rm -rf .next
fi

echo "🔨 本番ビルド..."
npm run build

echo "🔄 アプリケーションを再起動..."
pm2 restart anke-nextjs

echo "✅ ステータス確認..."
pm2 status

echo ""
echo "🎉 デプロイ完了！"
echo "📍 https://anke.jp"
ENDSSH

echo ""
echo "✅ デプロイが正常に完了しました"
