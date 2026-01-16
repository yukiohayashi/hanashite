#!/bin/bash

# VPSにCRONジョブを設定するスクリプト

echo "🔄 VPSにCRONジョブを設定します..."
echo ""

# CRON_SECRETを生成（ランダムな32文字の文字列）
CRON_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

echo "📝 生成されたCRON_SECRET:"
echo "$CRON_SECRET"
echo ""
echo "このシークレットを .env.local に追加してください："
echo "CRON_SECRET=$CRON_SECRET"
echo ""

# VPSのホスト名
VPS_HOST="133.18.122.123"
VPS_USER="ubuntu"
SSH_KEY="$HOME/.ssh/anke-nextjs.key"

echo "🌐 VPS: $VPS_HOST"
echo ""

# CRONジョブの内容
CRON_JOBS="# AI自動投票・コメント・いいね（5分ごと）
*/5 * * * * curl -X GET -H \"Authorization: Bearer $CRON_SECRET\" http://localhost:3000/api/cron/auto-voter-commenter-liker >> /var/log/anke-cron.log 2>&1

# AI自動投稿作成（10分ごと）
*/10 * * * * curl -X POST -H \"Content-Type: application/json\" -H \"Authorization: Bearer $CRON_SECRET\" -d '{\"enabled\":true}' http://localhost:3000/api/cron/toggle-auto-creator >> /var/log/anke-cron.log 2>&1
"

echo "📋 設定するCRONジョブ:"
echo "$CRON_JOBS"
echo ""

read -p "VPSにCRONジョブを設定しますか？ (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 VPSにCRONジョブを設定中..."
    
    # VPSに接続してCRONジョブを設定
    ssh -i "$SSH_KEY" "$VPS_USER@$VPS_HOST" << EOF
# 既存のcrontabを取得（存在しない場合は空）
crontab -l > /tmp/current_cron 2>/dev/null || true

# 新しいCRONジョブを追加
cat >> /tmp/current_cron << 'CRONEOF'
$CRON_JOBS
CRONEOF

# crontabを更新
crontab /tmp/current_cron

# 一時ファイルを削除
rm /tmp/current_cron

# crontabを確認
echo "✅ CRONジョブが設定されました："
crontab -l

# ログファイルを作成
sudo touch /var/log/anke-cron.log
sudo chown $VPS_USER:$VPS_USER /var/log/anke-cron.log
EOF

    echo ""
    echo "✅ VPSにCRONジョブが設定されました！"
    echo ""
    echo "📝 次のステップ:"
    echo "1. VPSの .env.local に CRON_SECRET を追加"
    echo "   ssh -i ~/.ssh/anke-nextjs.key ubuntu@$VPS_HOST"
    echo "   cd /var/www/anke-nextjs"
    echo "   nano .env.local"
    echo "   # 以下を追加："
    echo "   CRON_SECRET=$CRON_SECRET"
    echo ""
    echo "2. アプリケーションを再起動"
    echo "   pm2 restart anke-nextjs"
    echo ""
    echo "3. CRONログを確認"
    echo "   tail -f /var/log/anke-cron.log"
else
    echo "❌ キャンセルされました"
fi
