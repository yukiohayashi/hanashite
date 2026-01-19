# デプロイガイド

## デプロイの基本フロー

### 重要な注意事項

**デプロイスクリプト（`./scripts/deploy.sh --full`）はGitHubへのプッシュを含みません。**

デプロイスクリプトは以下の処理のみを行います：

1. VPSサーバーに接続
2. `git pull origin main`（GitHubから最新コードを取得）
3. `npm run build`（Next.jsアプリケーションをビルド）
4. `pm2 restart anke-nextjs`（アプリケーションを再起動）

### 正しいデプロイ手順

#### 1. ローカルで変更をコミット・プッシュ

```bash
# 変更をステージング
git add .

# コミット
git commit -m "fix: 変更内容の説明"

# GitHubにプッシュ（必須）
git push origin main
```

#### 2. デプロイスクリプトを実行

```bash
# VPSで最新コードを取得してデプロイ
./scripts/deploy.sh --full
```

## よくある問題と解決方法

### 問題1: デプロイしても変更が反映されない

**原因**: ローカルの変更がGitHubにプッシュされていない

**解決方法**:
```bash
# 変更状況を確認
git status

# 変更がある場合、コミット・プッシュ
git add .
git commit -m "変更内容"
git push origin main

# その後、デプロイスクリプトを実行
./scripts/deploy.sh --full
```

### 問題2: ブラウザで変更が反映されない

**原因**: ブラウザのキャッシュ

**解決方法**:
- **スーパーリロード**: `Ctrl + Shift + R`（Windows）または `Cmd + Shift + R`（Mac）
- **開発者ツールでキャッシュ無効化**: F12 → Network → Disable cache

### 問題3: セッション情報が更新されない

**原因**: NextAuth.jsのセッションは既存のログインセッションに反映されない

**解決方法**:
1. ログアウト
2. 再ログイン
3. セッション情報が更新される

## デプロイ確認チェックリスト

デプロイ後、以下を確認してください：

- [ ] VPSでファイルが更新されているか確認
  ```bash
  ssh -i ~/.ssh/anke-nextjs.key ubuntu@133.18.122.123
  cd /var/www/anke-nextjs
  git log -1  # 最新のコミットを確認
  ```

- [ ] PM2が正常に動作しているか確認
  ```bash
  pm2 status
  pm2 logs anke-nextjs --lines 50
  ```

- [ ] ブラウザでスーパーリロード（`Ctrl + Shift + R`）

- [ ] 変更箇所が正しく表示されているか確認

## 手動デプロイ手順

デプロイスクリプトを使わない場合の手順：

```bash
# 1. VPSに接続
ssh -i ~/.ssh/anke-nextjs.key ubuntu@133.18.122.123

# 2. プロジェクトディレクトリに移動
cd /var/www/anke-nextjs

# 3. アプリケーションを停止
pm2 stop anke-nextjs

# 4. 最新コードを取得
git pull origin main

# 5. 依存関係を更新（必要な場合）
npm install

# 6. ビルド
npm run build

# 7. アプリケーションを起動
pm2 start anke-nextjs

# 8. ステータス確認
pm2 status
```

## トラブルシューティング

### ビルドエラーが発生した場合

```bash
# ログを確認
pm2 logs anke-nextjs --lines 100

# キャッシュをクリア
rm -rf .next
npm run build

# node_modulesを再インストール
rm -rf node_modules
npm install
npm run build
```

### PM2が起動しない場合

```bash
# PM2のプロセスを確認
pm2 list

# PM2を完全に再起動
pm2 delete anke-nextjs
pm2 start npm --name "anke-nextjs" -- start

# または、ecosystem.config.jsを使用
pm2 start ecosystem.config.js
```

## まとめ

**デプロイの基本原則:**

1. **必ずGitHubにプッシュしてからデプロイスクリプトを実行**
2. **ブラウザのキャッシュをクリア**
3. **セッション情報の変更は再ログインが必要**

これらを守ることで、スムーズなデプロイが可能になります。
