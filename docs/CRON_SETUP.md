# CRON設定ガイド（ローカルとVPSの違い）

Next.jsアプリケーションでCRONジョブを設定する方法と、ローカル開発環境とVPS本番環境の違いについて

---

## 📋 目次

1. [概要](#概要)
2. [ローカル開発環境でのCRON](#ローカル開発環境でのcron)
3. [VPS本番環境でのCRON](#vps本番環境でのcron)
4. [CRON設定手順（VPS）](#cron設定手順vps)
5. [動作確認](#動作確認)
6. [トラブルシューティング](#トラブルシューティング)

---

## 概要

このアプリケーションでは、以下のCRONジョブを使用しています：

### **1. AI自動投票・コメント・いいね**
- **エンドポイント**: `/api/cron/auto-voter-commenter-liker`
- **実行間隔**: 5分ごと
- **機能**: 
  - 投稿に自動投票
  - 投稿に自動コメント
  - 投稿に自動いいね

### **2. AI自動投稿作成**
- **エンドポイント**: `/api/cron/toggle-auto-creator`
- **実行間隔**: 10分ごと
- **機能**: RSSフィードから投稿を自動作成

---

## ローカル開発環境でのCRON

### **特徴**

- ✅ **手動実行**: 管理画面から手動で実行
- ✅ **テスト用**: 開発・デバッグに最適
- ❌ **自動実行なし**: CRONジョブは設定しない

### **実行方法**

#### **AI自動投票・コメント・いいね**
1. http://localhost:3000/admin/auto-voter-commenter-liker/settings にアクセス
2. 「手動実行」ボタンをクリック

#### **AI自動投稿作成**
1. http://localhost:3000/admin/auto-creator にアクセス
2. 「手動実行」ボタンをクリック

### **認証**

ローカル環境では`CRON_SECRET`は不要です。

---

## VPS本番環境でのCRON

### **特徴**

- ✅ **自動実行**: システムCRONで定期実行
- ✅ **本番運用**: 24時間365日自動実行
- ✅ **認証必須**: `CRON_SECRET`で保護

### **システム構成**

```
Linux CRON (crontab)
  ↓
  curl コマンド
  ↓
  Next.js API エンドポイント
  ↓
  データベース処理
```

### **セキュリティ**

- **CRON_SECRET**: ランダムな32文字の文字列
- **Authorization Header**: `Bearer {CRON_SECRET}`
- **ローカルホスト**: `http://localhost:3000`（外部からアクセス不可）

---

## CRON設定手順（VPS）

### **ステップ1: CRON_SECRETを生成**

```bash
# ローカルで実行
./scripts/setup-vps-cron.sh
```

このスクリプトは以下を行います：
1. ランダムな`CRON_SECRET`を生成
2. VPSにCRONジョブを設定
3. 設定内容を表示

### **ステップ2: VPSの.env.localにCRON_SECRETを追加**

```bash
# VPSにSSH接続
ssh -i ~/.ssh/anke-nextjs.key ubuntu@133.18.122.123

# 作業ディレクトリに移動
cd /var/www/anke-nextjs

# .env.localを編集
nano .env.local
```

以下を追加：
```env
# CRON認証シークレット
CRON_SECRET=your-generated-secret-here
```

保存して終了：
- `Ctrl + O` → Enter（保存）
- `Ctrl + X`（終了）

### **ステップ3: アプリケーションを再起動**

```bash
# PM2で再起動
pm2 restart anke-nextjs

# ログを確認
pm2 logs anke-nextjs --lines 50
```

### **ステップ4: CRONジョブの確認**

```bash
# crontabを確認
crontab -l
```

以下のような出力が表示されます：
```
# AI自動投票・コメント・いいね（5分ごと）
*/5 * * * * curl -X GET -H "Authorization: Bearer YOUR_SECRET" http://localhost:3000/api/cron/auto-voter-commenter-liker >> /var/log/anke-cron.log 2>&1

# AI自動投稿作成（10分ごと）
*/10 * * * * curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_SECRET" -d '{"enabled":true}' http://localhost:3000/api/cron/toggle-auto-creator >> /var/log/anke-cron.log 2>&1
```

---

## 動作確認

### **1. CRONログを確認**

```bash
# VPSで実行
tail -f /var/log/anke-cron.log
```

正常に動作している場合、以下のようなログが表示されます：
```json
{"success":true,"message":"AI自動投票を実行しました","result":{...}}
{"success":true,"message":"自動作成を開始しました","enabled":true}
```

### **2. データベースログを確認**

#### **AI自動投票ログ**
http://133.18.122.123/admin/auto-voter-commenter-liker/settings

「実行ログ」セクションで最新の実行履歴を確認

#### **AI自動投稿ログ**
http://133.18.122.123/admin/auto-creator

「実行ログ」セクションで最新の実行履歴を確認

### **3. 手動テスト**

```bash
# VPSで実行
curl -X GET \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/auto-voter-commenter-liker
```

正常に動作している場合、JSONレスポンスが返されます。

---

## トラブルシューティング

### **エラー: 認証に失敗しました**

**原因**: `CRON_SECRET`が間違っている、または設定されていない

**対処法**:
1. VPSの`.env.local`に`CRON_SECRET`が設定されているか確認
2. crontabの`Authorization`ヘッダーが正しいか確認
3. アプリケーションを再起動

```bash
# .env.localを確認
cat /var/www/anke-nextjs/.env.local | grep CRON_SECRET

# crontabを確認
crontab -l

# 再起動
pm2 restart anke-nextjs
```

---

### **エラー: CRONジョブが実行されない**

**原因**: crontabが正しく設定されていない

**対処法**:
1. crontabを確認
2. CRONログを確認
3. システムログを確認

```bash
# crontabを確認
crontab -l

# CRONログを確認
tail -50 /var/log/anke-cron.log

# システムログを確認
sudo tail -50 /var/log/syslog | grep CRON
```

---

### **エラー: Connection refused**

**原因**: Next.jsアプリケーションが起動していない

**対処法**:
1. PM2のステータスを確認
2. アプリケーションを再起動

```bash
# PM2ステータスを確認
pm2 status

# 再起動
pm2 restart anke-nextjs

# ログを確認
pm2 logs anke-nextjs
```

---

### **CRONジョブが実行されているが、処理がスキップされる**

**原因**: 設定で無効化されている、または実行間隔が短すぎる

**対処法**:
1. 管理画面で設定を確認
2. ログで詳細を確認

#### **AI自動投票の場合**
http://133.18.122.123/admin/auto-voter-commenter-liker/settings

- 「有効化」がONになっているか確認
- 「実行間隔」が適切か確認
- 「実行禁止時間帯」が適切か確認

#### **AI自動投稿の場合**
http://133.18.122.123/admin/auto-creator/settings

- 「自動作成を有効化」がONになっているか確認
- RSSフィードが正しく設定されているか確認

---

## ローカルとVPSの違いまとめ

| 項目 | ローカル開発環境 | VPS本番環境 |
|------|-----------------|------------|
| **CRON実行** | 手動実行のみ | 自動実行（システムCRON） |
| **CRON_SECRET** | 不要 | 必須 |
| **実行間隔** | 任意（手動） | 5分・10分（自動） |
| **ログ** | ブラウザコンソール | `/var/log/anke-cron.log` |
| **認証** | なし | Bearer Token |
| **エンドポイント** | `http://localhost:3000` | `http://localhost:3000` |
| **設定ファイル** | なし | `/etc/crontab` または `crontab -e` |
| **監視** | 不要 | PM2 + システムログ |

---

## CRONジョブの編集

### **CRONジョブを追加・編集**

```bash
# VPSで実行
crontab -e
```

### **CRONジョブを削除**

```bash
# VPSで実行
crontab -r
```

### **CRONジョブを一時停止**

特定のジョブをコメントアウト：
```bash
crontab -e

# 以下のように行頭に # を追加
# */5 * * * * curl -X GET ...
```

---

## 📝 チェックリスト

VPSでCRONを設定する際の確認事項：

- [ ] `CRON_SECRET`を生成
- [ ] VPSの`.env.local`に`CRON_SECRET`を追加
- [ ] crontabにCRONジョブを設定
- [ ] アプリケーションを再起動
- [ ] CRONログを確認（`/var/log/anke-cron.log`）
- [ ] データベースログを確認（管理画面）
- [ ] 手動テストで動作確認
- [ ] 5分後・10分後に自動実行されることを確認

---

## 参考資料

- [Linux Cron](https://man7.org/linux/man-pages/man8/cron.8.html)
- [Crontab Guru](https://crontab.guru/) - CRON式のテスト
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
