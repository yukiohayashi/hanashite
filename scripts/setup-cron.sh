#!/bin/bash

# AI自動投稿とYahoo知恵袋自動取得のCRON設定スクリプト

echo "=== CRON設定スクリプト ==="

# CRONがインストールされているか確認
if ! command -v crontab &> /dev/null; then
    echo "CRONがインストールされていません。インストールします..."
    sudo apt-get update
    sudo apt-get install -y cron
    sudo systemctl enable cron
    sudo systemctl start cron
else
    echo "CRONは既にインストールされています"
fi

# プロジェクトのベースURL
BASE_URL="https://dokujo.com"

# 既存のcrontabをバックアップ
crontab -l > /tmp/crontab_backup_$(date +%Y%m%d_%H%M%S).txt 2>/dev/null || true

# 新しいcrontab設定を作成
cat > /tmp/new_crontab << 'EOF'
# ハナシテ AI自動投稿システム

# Yahoo知恵袋から質問を取得（毎日 9:00, 15:00, 21:00 JST = 0:00, 6:00, 12:00 UTC）
0 0,6,12 * * * curl -X POST https://dokujo.com/api/auto-creator/fetch-yahoo-chiebukuro >> /home/ubuntu/hanashite/logs/fetch-yahoo.log 2>&1

# AI自動投稿を実行（10分ごと）
*/10 * * * * curl -X POST https://dokujo.com/api/auto-creator/execute >> /home/ubuntu/hanashite/logs/auto-post.log 2>&1

# ログファイルのローテーション（毎週日曜日 0:00）
0 0 * * 0 find /home/ubuntu/hanashite/logs -name "*.log" -mtime +30 -delete

EOF

# crontabを設定
crontab /tmp/new_crontab

echo ""
echo "=== CRON設定完了 ==="
echo ""
echo "設定内容:"
crontab -l
echo ""
echo "=== ログディレクトリを作成 ==="
mkdir -p /home/ubuntu/hanashite/logs
echo ""
echo "=== CRON設定が完了しました ==="
echo ""
echo "Yahoo知恵袋取得: 毎日 9:00, 15:00, 21:00"
echo "AI自動投稿: 10分ごと"
echo ""
echo "ログファイル:"
echo "  - Yahoo知恵袋取得: /home/ubuntu/hanashite/logs/fetch-yahoo.log"
echo "  - AI自動投稿: /home/ubuntu/hanashite/logs/auto-post.log"
