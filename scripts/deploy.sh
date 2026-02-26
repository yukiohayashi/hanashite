#!/bin/bash

# ハナシテ Next.js VPSデプロイスクリプト（ローカルビルド → VPS転送方式）
# 使用方法: ./scripts/deploy.sh

set -e  # エラーが発生したら停止

VPS_USER="ubuntu"
VPS_HOST="133.18.125.19"
SSH_KEY="$HOME/.ssh/hanashite.key"
PROJECT_DIR="/home/ubuntu/hanashite/.next/standalone"
SSH_CMD="ssh -i ${SSH_KEY} ${VPS_USER}@${VPS_HOST}"

echo "� デプロイを開始します..."

# 1. ローカルでビルド（.env.localを退避させて本番環境変数を使用）
echo "🔨 ローカルで本番ビルドを実行..."
if [ -f .env.local ]; then
  mv .env.local .env.local.bak
fi
npm run build
if [ -f .env.local.bak ]; then
  mv .env.local.bak .env.local
fi

# 2. サーバー上のPM2プロセスを停止・削除
echo "📦 サーバー上のPM2プロセスを停止..."
${SSH_CMD} "pm2 delete hanashite 2>/dev/null || true"

# 3. サーバー上の古いstandaloneを完全削除
echo "🗑️  サーバー上の古いビルドを削除..."
${SSH_CMD} "rm -rf /home/ubuntu/hanashite/.next/standalone"

# 4. standaloneディレクトリを転送
echo "� standaloneを転送..."
rsync -az --delete -e "ssh -i ${SSH_KEY}" .next/standalone/ ${VPS_USER}@${VPS_HOST}:${PROJECT_DIR}/

# 5. staticディレクトリを転送（standaloneに含まれないため別途）
echo "� 静的ファイルを転送..."
rsync -az --delete -e "ssh -i ${SSH_KEY}" .next/static/ ${VPS_USER}@${VPS_HOST}:${PROJECT_DIR}/.next/static/

# 6. publicディレクトリを転送
echo "📤 publicディレクトリを転送..."
rsync -az --delete -e "ssh -i ${SSH_KEY}" public/ ${VPS_USER}@${VPS_HOST}:${PROJECT_DIR}/public/

# 7. PM2を起動
echo "🔄 アプリケーションを起動..."
${SSH_CMD} "cd ${PROJECT_DIR} && pm2 start server.js --name hanashite && pm2 save"

echo "✅ ステータス確認..."
${SSH_CMD} "pm2 status"

echo ""
echo "🎉 デプロイ完了！"
echo "📍 https://dokujo.com"

echo ""
echo "✅ デプロイが正常に完了しました"
