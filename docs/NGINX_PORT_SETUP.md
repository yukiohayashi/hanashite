# Nginx リバースプロキシ設定（ポート3000削除）

VPSでNext.jsアプリケーションにポート番号なしでアクセスできるようにするNginx設定手順です。

## 問題

- `http://133.18.122.123:3000` → アプリケーションが表示される
- `http://133.18.122.123` → "Welcome to nginx!" が表示される

## 解決方法

Nginxをリバースプロキシとして設定し、ポート80（HTTP）でリクエストを受け取り、内部的にポート3000のNext.jsアプリケーションに転送します。

---

## 設定手順

### 1. SSH接続

```bash
ssh -i ~/.ssh/anke-nextjs.key ubuntu@133.18.122.123
```

### 2. Nginx設定ファイルを作成

```bash
sudo nano /etc/nginx/sites-available/anke-nextjs
```

以下の内容を貼り付け：

```nginx
server {
    listen 80;
    server_name 133.18.122.123;

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

**保存方法:**
- `Ctrl + X` を押す
- `Y` を押して保存を確認
- `Enter` を押す

### 3. 設定を有効化

```bash
# シンボリックリンクを作成
sudo ln -s /etc/nginx/sites-available/anke-nextjs /etc/nginx/sites-enabled/

# デフォルト設定を削除（Welcome to nginx!ページを無効化）
sudo rm /etc/nginx/sites-enabled/default
```

### 4. 設定をテスト

```bash
sudo nginx -t
```

**期待される出力:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5. Nginxを再起動

```bash
sudo systemctl restart nginx
```

### 6. 動作確認

ブラウザで以下のURLにアクセス：

```
http://133.18.122.123
```

**注意:** ブラウザのキャッシュが残っている場合は、強制リロードしてください：
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

---

## トラブルシューティング

### まだ "Welcome to nginx!" が表示される場合

#### 1. 設定ファイルを確認

```bash
ls -la /etc/nginx/sites-enabled/
```

`anke-nextjs` へのシンボリックリンクが存在することを確認。

#### 2. Nginxを完全に再起動

```bash
sudo systemctl stop nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

`active (running)` と表示されることを確認。

#### 3. エラーログを確認

```bash
sudo tail -20 /var/log/nginx/error.log
```

#### 4. ブラウザのキャッシュをクリア

- シークレットウィンドウで開く
- または、ブラウザのキャッシュを完全にクリア

### Next.jsアプリケーションが起動していない場合

```bash
pm2 status
pm2 logs anke-nextjs --lines 50
```

アプリケーションが `online` 状態であることを確認。

---

## 設定の説明

### proxy_pass
```nginx
proxy_pass http://localhost:3000;
```
- ポート80で受け取ったリクエストをポート3000に転送

### proxy_set_header
```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```
- クライアントの情報をNext.jsアプリケーションに正しく伝える
- IPアドレス、ホスト名などを保持

### WebSocket対応
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
proxy_cache_bypass $http_upgrade;
```
- Next.jsのホットリロード機能に必要
- WebSocket接続をサポート

---

## 設定後の状態

✅ `http://133.18.122.123` でアクセス可能（ポート指定不要）
✅ Next.jsアプリケーションが正常に表示される
✅ "Welcome to nginx!" ページは表示されない

---

## 参考

- [Nginx公式ドキュメント](https://nginx.org/en/docs/)
- [Next.js デプロイメント](https://nextjs.org/docs/deployment)
