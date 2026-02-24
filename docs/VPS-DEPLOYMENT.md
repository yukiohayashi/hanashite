# ハナシテ VPSデプロイガイド

## サーバー情報

- **IPアドレス**: `133.18.125.19`
- **ホスト名**: `dokujo.com`
- **SSH鍵**: `~/.ssh/hanashite.key`
- **ユーザー**: `ubuntu`
- **プロジェクトパス**: `/home/ubuntu/hanashite`

## SSH接続

```bash
ssh -i ~/.ssh/hanashite.key ubuntu@133.18.125.19
```

## デプロイ方法

### 1. 自動デプロイスクリプトを使用（推奨）

```bash
# 通常デプロイ
./scripts/deploy.sh

# フルビルド（キャッシュクリア）
./scripts/deploy.sh --full
```

### 2. 手動デプロイ

```bash
# VPSに接続
ssh -i ~/.ssh/hanashite.key ubuntu@133.18.125.19

# プロジェクトディレクトリに移動
cd /home/ubuntu/hanashite

# アプリケーションを停止
pm2 stop hanashite

# 最新のコードを取得
git pull origin main

# 依存関係をインストール
npm install

# ビルド
npm run build

# 静的ファイルをコピー
cp -r .next/static .next/standalone/.next/
cp -r public/* .next/standalone/public/

# アプリケーションを再起動
pm2 restart hanashite

# ステータス確認
pm2 status
```

## PM2コマンド

```bash
# ステータス確認
pm2 status

# ログ確認
pm2 logs hanashite

# 再起動
pm2 restart hanashite

# 停止
pm2 stop hanashite

# 起動
pm2 start hanashite
```

## 環境変数

環境変数は `/home/ubuntu/hanashite/.env.local` に設定されています。

```bash
# 環境変数を編集
sudo nano /home/ubuntu/hanashite/.env.local

# 変更後は必ず再起動
pm2 restart hanashite
```

## トラブルシューティング

### デプロイが失敗する場合

```bash
# ログを確認
pm2 logs hanashite --lines 100

# エラーログのみ確認
pm2 logs hanashite --err

# ビルドキャッシュをクリアして再デプロイ
./scripts/deploy.sh --full
```

### SSH接続できない場合

```bash
# SSH鍵のパーミッションを確認
chmod 600 ~/.ssh/hanashite.key

# SSH接続をデバッグモードで実行
ssh -v -i ~/.ssh/hanashite.key ubuntu@133.18.125.19
```

### アプリケーションが起動しない場合

```bash
# PM2プロセスを完全に削除して再起動
pm2 delete hanashite
pm2 start ecosystem.config.js

# またはnpmスクリプトから起動
cd /var/www/hanashite
npm run start
```

## Nginxの設定

Nginxの設定ファイル: `/etc/nginx/sites-available/hanashite`

```bash
# Nginx設定を編集
sudo nano /etc/nginx/sites-available/hanashite

# 設定をテスト
sudo nginx -t

# Nginxを再起動
sudo systemctl reload nginx
```

## SSL証明書の更新

Let's Encryptの証明書は自動更新されますが、手動で更新する場合：

```bash
# 証明書を更新
sudo certbot renew

# Nginxを再起動
sudo systemctl reload nginx
```

## データベースマイグレーション

```bash
# VPSに接続
ssh -i ~/.ssh/hanashite.key ubuntu@133.18.125.19

# プロジェクトディレクトリに移動
cd /home/ubuntu/hanashite

# マイグレーションを適用
npx supabase db push

# または
npm run db:migrate
```

## バックアップ

```bash
# データベースバックアップ
npm run db:backup

# バックアップファイルは /home/ubuntu/hanashite/backups に保存されます
```

## モニタリング

```bash
# リアルタイムでログを監視
pm2 logs hanashite

# CPU/メモリ使用状況を確認
pm2 monit

# システムリソースを確認
htop
```

## 参考リンク

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)

---

最終更新: 2026年2月24日
