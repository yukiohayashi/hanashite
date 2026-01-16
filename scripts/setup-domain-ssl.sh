#!/bin/bash

# anke.jpドメインとSSL導入スクリプト
# VPS上で実行するコマンドをまとめたスクリプト

set -e

echo "=========================================="
echo "anke.jp ドメインとSSL導入スクリプト"
echo "=========================================="
echo ""

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# VPS情報
VPS_IP="133.18.122.123"
VPS_USER="ubuntu"
SSH_KEY="~/.ssh/anke-nextjs.key"
DOMAIN="anke.jp"

echo -e "${YELLOW}ステップ1: DNS設定の確認${NC}"
echo "現在のDNS設定を確認します..."
echo ""
echo "anke.jp:"
dig anke.jp +short
echo ""
echo "www.anke.jp:"
dig www.anke.jp +short
echo ""

read -p "DNS設定が 133.18.122.123 を指していますか？ (y/n): " dns_ok
if [ "$dns_ok" != "y" ]; then
    echo -e "${RED}DNSレコードを更新してから再度実行してください${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}ステップ2: Nginx設定ファイルをVPSにアップロード${NC}"
echo "Nginx設定ファイルをVPSにコピーします..."
scp -i $SSH_KEY nginx/anke.jp.conf $VPS_USER@$VPS_IP:/tmp/anke.jp.conf

echo ""
echo -e "${YELLOW}ステップ3: VPSでNginx設定を適用${NC}"
ssh -i $SSH_KEY $VPS_USER@$VPS_IP << 'ENDSSH'
    # Nginx設定ファイルを配置
    sudo mv /tmp/anke.jp.conf /etc/nginx/sites-available/anke.jp
    
    # シンボリックリンクを作成
    sudo ln -sf /etc/nginx/sites-available/anke.jp /etc/nginx/sites-enabled/
    
    # Nginx設定をテスト
    echo "Nginx設定をテストします..."
    sudo nginx -t
    
    # Nginxをリロード
    echo "Nginxをリロードします..."
    sudo systemctl reload nginx
    
    echo "Nginx設定が完了しました"
ENDSSH

echo ""
echo -e "${GREEN}✓ Nginx設定が完了しました${NC}"
echo ""

echo -e "${YELLOW}ステップ4: HTTP接続テスト${NC}"
echo "http://anke.jp にアクセスできるか確認します..."
sleep 2
curl -I http://anke.jp 2>/dev/null | head -n 1 || echo "まだアクセスできません（DNS伝播待ち）"

echo ""
echo -e "${YELLOW}ステップ5: Let's Encrypt SSL証明書の取得${NC}"
read -p "SSL証明書を取得しますか？ (y/n): " ssl_ok
if [ "$ssl_ok" = "y" ]; then
    ssh -i $SSH_KEY $VPS_USER@$VPS_IP << 'ENDSSH'
        # Certbotのインストール確認
        if ! command -v certbot &> /dev/null; then
            echo "Certbotをインストールします..."
            sudo apt update
            sudo apt install -y certbot python3-certbot-nginx
        fi
        
        # SSL証明書を取得
        echo "SSL証明書を取得します..."
        sudo certbot --nginx -d anke.jp -d www.anke.jp --non-interactive --agree-tos --email yhayashi@sucmedia.co.jp
        
        # 自動更新のテスト
        echo "SSL証明書の自動更新をテストします..."
        sudo certbot renew --dry-run
        
        echo "SSL証明書の取得が完了しました"
ENDSSH
    
    echo ""
    echo -e "${GREEN}✓ SSL証明書が取得されました${NC}"
    echo ""
    echo "https://anke.jp にアクセスできます"
else
    echo "SSL証明書の取得をスキップしました"
    echo "後で手動で実行する場合："
    echo "  sudo certbot --nginx -d anke.jp -d www.anke.jp"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}ドメイン移行が完了しました！${NC}"
echo "=========================================="
echo ""
echo "次のステップ："
echo "1. https://anke.jp にアクセスして動作確認"
echo "2. 環境変数を更新（NEXT_PUBLIC_APP_URL=https://anke.jp）"
echo "3. アプリケーションを再起動"
echo ""
