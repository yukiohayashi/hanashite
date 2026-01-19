# カゴヤVPSデプロイ手順

Next.js + Supabase + CRON自動化をカゴヤVPSにデプロイする手順です。

## 前提条件

- カゴヤVPS契約済み（推奨: V4-4Gプラン、4コア/4GB/400GB SSD）
- ドメイン取得済み（オプション）
- GitHubアカウント
- SSH鍵ファイル（`~/.ssh/anke-nextjs.key`）

---

## 🔑 SSH接続情報（既存VPS）

### VPS情報
- **IPアドレス**: `133.18.122.123`
- **ユーザー名**: `ubuntu`
- **SSH鍵**: `~/.ssh/anke-nextjs.key`
- **アプリケーションパス**: `/var/www/anke-nextjs`

### SSH接続コマンド
```bash
# 鍵認証でSSH接続
ssh -i ~/.ssh/anke-nextjs.key ubuntu@133.18.122.123

# または、~/.ssh/configに設定を追加
# Host anke-vps
#   HostName 133.18.122.123
#   User ubuntu
#   IdentityFile ~/.ssh/anke-nextjs.key
#
# 設定後は以下で接続可能
# ssh anke-vps
```

### SSH鍵の権限設定
```bash
# SSH鍵の権限を正しく設定（重要）
chmod 600 ~/.ssh/anke-nextjs.key
```

---

## 📦 既存VPSの更新手順

既にデプロイ済みのVPSを更新する場合は、以下の手順に従ってください。

### 1. ローカルでの準備

#### 1.1 データベースのバックアップ
```bash
docker exec supabase_db_anke-nextjs-dev pg_dump -U postgres -d postgres --clean --if-exists > @backups/db_full_$(date +%Y%m%d_%H%M%S).sql
```

#### 1.2 GitHubにプッシュ
```bash
git add .
git commit -m "デプロイ準備完了"
git push origin main
```

### 2. VPSでの更新作業

#### 2.1 SSH接続
```bash
ssh -i ~/.ssh/anke-nextjs.key ubuntu@133.18.122.123
```

#### 2.2 作業ディレクトリに移動
```bash
cd /var/www/anke-nextjs
```

#### 2.3 データベースのバックアップ（VPS側）
```bash
docker exec supabase_db_anke-nextjs-dev pg_dump -U postgres -d postgres --clean --if-exists > backup_before_update_$(date +%Y%m%d_%H%M%S).sql
```

#### 2.4 アプリケーションを停止
```bash
pm2 stop anke-nextjs
```

#### 2.5 最新のコードを取得
```bash
git pull origin main
```

#### 2.6 依存関係を更新
```bash
npm install
```

#### 2.7 ビルドキャッシュをクリア
```bash
rm -rf .next
```

#### 2.8 本番ビルド
```bash
npm run build
```

#### 2.9 アプリケーションを再起動
```bash
pm2 restart anke-nextjs
```

#### 2.10 ステータス確認
```bash
pm2 status
pm2 logs anke-nextjs --lines 50
```

### 3. 動作確認
ブラウザで `http://133.18.122.123/` にアクセスして確認

---

## 🆕 新規VPS初期設定

新しいVPSインスタンスにデプロイする場合は、以下の手順に従ってください。

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

### コードが反映されない場合

**症状**: GitHubにプッシュしてデプロイしても、古いコードのまま表示される

**原因**:
1. `git pull`が実行されていない
2. ビルドキャッシュが残っている
3. Nginxのキャッシュが残っている
4. ブラウザキャッシュが残っている

**解決方法**:
```bash
cd /var/www/anke-nextjs

# 1. 最新のコードを強制取得
git fetch origin
git reset --hard origin/main

# 2. ビルドキャッシュを完全削除
pm2 stop anke-nextjs
rm -rf .next
rm -rf node_modules/.cache

# 3. 依存関係を更新
npm install

# 4. クリーンビルド
NODE_ENV=production npm run build

# 5. アプリケーションを再起動
pm2 restart anke-nextjs

# 6. Nginxキャッシュをクリア
sudo rm -rf /var/cache/nginx/*
sudo systemctl restart nginx
```

**ブラウザ側の対応**:
- ハードリフレッシュ: `Ctrl + Shift + R` (Windows) / `Cmd + Shift + R` (Mac)
- プライベートモード/シークレットモードで確認
- 開発者ツールで "Disable cache" を有効化

### 502 Bad Gateway エラー

**症状**: Nginxが502エラーを返す

**原因**: PM2でNext.jsアプリケーションが起動していない、または`.next`ディレクトリがない

**解決方法**:
```bash
cd /var/www/anke-nextjs

# PM2の状態を確認
pm2 status

# ログを確認
pm2 logs anke-nextjs --lines 30

# .nextディレクトリがない場合はビルド
npm run build

# アプリケーションを再起動
pm2 restart anke-nextjs

# それでもダメなら完全に再起動
pm2 delete anke-nextjs
pm2 start npm --name "anke-nextjs" -- start
pm2 save
```

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

## リモートSupabaseへのデータ同期

### ローカルからリモートへのデータエクスポート

ローカルのSupabaseデータをリモートSupabaseに同期する場合：

```bash
# ローカルのデータをエクスポート
docker exec supabase_db_anke-nextjs-dev pg_dump -U postgres -d postgres -t テーブル名 --data-only --column-inserts > /tmp/data.sql

# SQLファイルの内容を確認
cat /tmp/data.sql
```

リモートSupabaseのSQL Editorで実行：
```sql
-- データを挿入（改行を削除して1行にする）
INSERT INTO テーブル名 (カラム1, カラム2, ...) VALUES (...);

-- シーケンスを更新
SELECT setval('テーブル名_id_seq', 最大ID, true);
```

### データが表示されない場合の確認事項

**1. テーブル権限の確認**
```sql
-- anon権限を確認
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'テーブル名' AND grantee = 'anon';

-- 権限を付与
GRANT SELECT ON テーブル名 TO anon, authenticated;
```

**2. RLSの確認**
```sql
-- RLSが有効か確認
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'テーブル名';

-- RLSを無効化（必要に応じて）
ALTER TABLE テーブル名 DISABLE ROW LEVEL SECURITY;
```

**3. Next.jsの静的生成の問題**

ページがビルド時に静的生成される場合、ビルド後にデータを追加しても反映されません。

解決方法：ページを動的レンダリングに変更
```typescript
// ページファイルの先頭に追加
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

その後、再ビルド：
```bash
cd /var/www/anke-nextjs
pm2 stop anke-nextjs
rm -rf .next
npm run build
pm2 start anke-nextjs
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
