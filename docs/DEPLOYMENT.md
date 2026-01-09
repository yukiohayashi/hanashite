# カゴヤVPSデプロイ手順

Next.js + Supabase + CRON自動化をカゴヤVPSにデプロイする手順です。

## 前提条件

- カゴヤVPS契約済み（推奨: V4-4Gプラン、4コア/4GB/400GB SSD）
- ドメイン取得済み（オプション）
- GitHubアカウント

## 1. VPS初期設定

### 1.1 SSHで接続

```bash
ssh root@your-vps-ip
```

### 1.2 ユーザー作成

```bash
adduser anke
usermod -aG sudo anke
su - anke
```

### 1.3 システムアップデート

```bash
sudo apt update && sudo apt upgrade -y
```

## 2. 必要なソフトウェアのインストール

### 2.1 Node.js 20.x

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # v20.x.x を確認
npm -v
```

### 2.2 Docker & Docker Compose

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
```

### 2.3 PM2（プロセス管理）

```bash
sudo npm install -g pm2
pm2 --version
```

### 2.4 Nginx

```bash
sudo apt install -y nginx
sudo systemctl status nginx
```

## 3. アプリケーションのデプロイ

### 3.1 GitHubからクローン

```bash
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www
cd /var/www
git clone https://github.com/your-username/anke-nextjs.git
cd anke-nextjs
```

### 3.2 依存関係のインストール

```bash
npm install
```

### 3.3 環境変数の設定

```bash
cp .env.example .env.local
nano .env.local
```

必要な環境変数を設定：
- Supabase URL/Keys
- NextAuth設定
- LINE/X OAuth
- OpenAI API Key
- API_SECRET（CRON用）

### 3.4 本番ビルド

```bash
npm run build
```

### 3.5 PM2で起動

```bash
pm2 start npm --name "anke-nextjs" -- start
pm2 save
pm2 startup
# 表示されたコマンドを実行
```

## 4. Supabase Dockerのセットアップ

### 4.1 Supabase起動

```bash
cd /var/www/anke-nextjs
npx supabase start
```

### 4.2 接続情報を確認

```bash
npx supabase status
```

出力された情報を`.env.local`に反映。

## 5. Nginxの設定

### 5.1 設定ファイル作成

```bash
sudo nano /etc/nginx/sites-available/anke-nextjs
```

以下の内容を貼り付け：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5.2 設定を有効化

```bash
sudo ln -s /etc/nginx/sites-available/anke-nextjs /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 6. SSL証明書の設定（Let's Encrypt）

### 6.1 Certbotインストール

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2 証明書取得

```bash
sudo certbot --nginx -d your-domain.com
```

### 6.3 自動更新設定

```bash
sudo systemctl status certbot.timer
```

## 7. CRON自動化の設定

### 7.1 CRON環境変数の設定

```bash
cd /var/www/anke-nextjs/scripts/cron
cp env.cron.example .env.cron
nano .env.cron
```

以下を設定：
```bash
API_URL=http://localhost:3000
API_SECRET=your-actual-secret-key
LOG_DIR=/var/log/anke
```

### 7.2 スクリプトに実行権限を付与

```bash
chmod +x auto-creator.sh
```

### 7.3 ログディレクトリ作成

```bash
sudo mkdir -p /var/log/anke
sudo chown $USER:$USER /var/log/anke
```

### 7.4 crontabに登録

```bash
crontab -e
```

以下を追加：
```cron
# AI自動投稿生成（1時間ごと）
0 * * * * /var/www/anke-nextjs/scripts/cron/auto-creator.sh
```

### 7.5 動作確認

```bash
# 手動実行テスト
./auto-creator.sh

# ログ確認
tail -f /var/log/anke/auto-creator.log
```

## 8. ログローテーション設定

```bash
sudo nano /etc/logrotate.d/anke
```

以下を追加：
```
/var/log/anke/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 anke anke
}
```

## 9. ファイアウォール設定

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

## 10. 動作確認

### 10.1 Next.jsの確認

```bash
pm2 status
pm2 logs anke-nextjs
```

ブラウザで `http://your-domain.com` にアクセス

### 10.2 Supabaseの確認

```bash
npx supabase status
```

### 10.3 CRONの確認

```bash
crontab -l
tail -f /var/log/anke/auto-creator.log
```

管理画面（`http://your-domain.com/admin/auto-creator/settings`）で開始/停止を確認

## 11. 更新手順

### 11.1 コードの更新

```bash
cd /var/www/anke-nextjs
git pull origin main
npm install
npm run build
pm2 restart anke-nextjs
```

### 11.2 Supabaseの更新

```bash
npx supabase db reset
npx supabase start
```

## トラブルシューティング

### Next.jsが起動しない

```bash
pm2 logs anke-nextjs
pm2 restart anke-nextjs
```

### Supabaseに接続できない

```bash
npx supabase status
docker ps
```

### CRONが実行されない

```bash
crontab -l
tail -f /var/log/anke/auto-creator-error.log
```

### Nginxエラー

```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

## セキュリティ対策

1. **SSH鍵認証の設定**
   ```bash
   ssh-keygen -t ed25519
   ssh-copy-id anke@your-vps-ip
   ```

2. **パスワード認証の無効化**
   ```bash
   sudo nano /etc/ssh/sshd_config
   # PasswordAuthentication no
   sudo systemctl restart sshd
   ```

3. **Fail2banのインストール**
   ```bash
   sudo apt install -y fail2ban
   sudo systemctl enable fail2ban
   ```

4. **定期的なアップデート**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

## 監視・メンテナンス

### ディスク使用量の確認

```bash
df -h
du -sh /var/www/anke-nextjs
du -sh /var/log/anke
```

### メモリ使用量の確認

```bash
free -h
pm2 monit
```

### ログの確認

```bash
# Next.jsログ
pm2 logs anke-nextjs

# CRONログ
tail -f /var/log/anke/auto-creator.log

# Nginxログ
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## バックアップ

### データベースバックアップ

```bash
cd /var/www/anke-nextjs
./scripts/backup-supabase.sh
```

### アプリケーションバックアップ

```bash
tar -czf anke-nextjs-backup-$(date +%Y%m%d).tar.gz /var/www/anke-nextjs
```

## サポート

問題が発生した場合は、以下を確認してください：

1. ログファイル
2. PM2ステータス
3. Dockerコンテナステータス
4. Nginxステータス
5. ファイアウォール設定
