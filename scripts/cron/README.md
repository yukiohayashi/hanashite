# CRON自動実行スクリプト

カゴヤVPSでAI自動投稿生成を定期実行するためのスクリプト群です。

## ファイル構成

```
scripts/cron/
├── env.cron.example      # 環境変数テンプレート
├── .env.cron            # 環境変数（本番用、Gitにコミットしない）
├── auto-creator.sh      # AI自動投稿生成スクリプト
├── crontab.txt          # crontab設定例
└── README.md            # このファイル
```

## セットアップ手順

### 1. 環境変数ファイルの作成

```bash
cd /var/www/anke-nextjs/scripts/cron
cp env.cron.example .env.cron
nano .env.cron
```

`.env.cron`の内容を編集：

```bash
API_URL=http://localhost:3000
API_SECRET=your-actual-secret-key
LOG_DIR=/var/log/anke
```

### 2. スクリプトに実行権限を付与

```bash
chmod +x auto-creator.sh
```

### 3. ログディレクトリを作成

```bash
sudo mkdir -p /var/log/anke
sudo chown $USER:$USER /var/log/anke
```

### 4. crontabに登録

```bash
crontab -e
```

`crontab.txt`の内容を貼り付け（パスは実際の環境に合わせて調整）

### 5. 動作確認

手動実行でテスト：

```bash
./auto-creator.sh
```

ログを確認：

```bash
tail -f /var/log/anke/auto-creator.log
tail -f /var/log/anke/auto-creator-error.log
```

crontabの確認：

```bash
crontab -l
```

## 実行制御

### 開始/停止

管理画面（http://your-domain/admin/auto-creator/settings）の「開始/停止」ボタンで制御できます。

- **開始**: `is_enabled = true` に設定され、CRON実行時にAPIが処理を実行
- **停止**: `is_enabled = false` に設定され、CRON実行時にAPIがスキップ

### 実行間隔の変更

管理画面で「実行間隔」と「実行ゆらぎ」を設定できます。

crontabの実行頻度は、設定した間隔の最小値以下にしてください。
例: 間隔60分 ± 15分 → crontabは1時間ごと

## ログローテーション

ログが肥大化しないよう、logrotateを設定することを推奨します。

`/etc/logrotate.d/anke`を作成：

```
/var/log/anke/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 your-user your-user
}
```

## トラブルシューティング

### CRONが実行されない

1. crontabが正しく登録されているか確認
   ```bash
   crontab -l
   ```

2. スクリプトに実行権限があるか確認
   ```bash
   ls -la auto-creator.sh
   ```

3. 環境変数ファイルが存在するか確認
   ```bash
   ls -la .env.cron
   ```

### APIエラーが発生する

1. Next.jsが起動しているか確認
   ```bash
   pm2 status
   ```

2. API_SECRETが一致しているか確認
   - `.env.cron`のAPI_SECRET
   - `.env.local`のAPI_SECRET

3. エラーログを確認
   ```bash
   tail -n 50 /var/log/anke/auto-creator-error.log
   ```

### 自動作成が実行されない

1. 管理画面で「有効」になっているか確認
2. 「作成しない時間帯」に該当していないか確認
3. スクレイピングURLが設定されているか確認
4. 未処理の記事があるか確認

## セキュリティ

- `.env.cron`は絶対にGitにコミットしないでください
- `API_SECRET`は十分に長くランダムな文字列を使用してください
- ログファイルのパーミッションを適切に設定してください
