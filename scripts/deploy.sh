#!/bin/bash

# ハナシテ Next.js VPSデプロイスクリプト
# 使用方法: ./scripts/deploy.sh [--full]

set -e  # エラーが発生したら停止

FULL_BUILD="$1"

echo "🚀 デプロイを開始します..."

# VPSに接続してデプロイ
ssh -i ~/.ssh/hanashite.key ubuntu@133.18.125.19 "FULL_BUILD=$FULL_BUILD bash -s" << 'ENDSSH'
cd /home/ubuntu/hanashite

echo "📦 アプリケーションを停止..."
pm2 stop hanashite

echo "📥 最新のコードを取得..."
git pull origin main

echo "📦 依存関係を確認..."
npm install

# フルビルドオプション（引数で--fullが渡された場合）
if [ "$FULL_BUILD" = "--full" ]; then
  echo "🗑️  ビルドキャッシュをクリア..."
  rm -rf .next
fi

echo "🔨 本番ビルド..."
npm run build

echo "📁 静的ファイルをstandaloneにコピー..."
cp -r .next/static .next/standalone/.next/
cp -r public/* .next/standalone/public/

echo "🔄 アプリケーションを再起動..."
pm2 restart hanashite

echo "✅ ステータス確認..."
pm2 status

echo ""
echo "🎉 デプロイ完了！"
echo "📍 https://dokujo.com"
ENDSSH

echo ""
echo "✅ デプロイが正常に完了しました"
