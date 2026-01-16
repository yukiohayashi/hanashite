# Supabaseプロジェクト作成とデータ同期ガイド

ローカルDockerSupabaseのデータを新しいSupabase Cloudプロジェクトに移行する完全ガイド

---

## 📋 目次

1. [概要](#概要)
2. [前提条件](#前提条件)
3. [ステップ1: ローカルデータのバックアップ](#ステップ1-ローカルデータのバックアップ)
4. [ステップ2: 新しいSupabaseプロジェクトの作成](#ステップ2-新しいsupabaseプロジェクトの作成)
5. [ステップ3: スキーマとデータのアップロード](#ステップ3-スキーマとデータのアップロード)
6. [ステップ4: 環境変数の更新](#ステップ4-環境変数の更新)
7. [ステップ5: 動作確認](#ステップ5-動作確認)
8. [トラブルシューティング](#トラブルシューティング)

---

## 概要

このガイドでは、以下の作業を行います：

1. ローカルDockerSupabaseからスキーマとデータをダンプ
2. 新しいSupabase Cloudプロジェクトを作成（推奨リージョン: 東京）
3. スキーマとデータを新しいプロジェクトにアップロード
4. ローカルとVPSの環境変数を更新
5. アプリケーションの再起動と動作確認

---

## 前提条件

### **必要なツール**
- Docker（ローカルSupabaseが起動している）
- `psql`（PostgreSQLクライアント）
- SSH鍵（VPS接続用）

### **確認事項**
```bash
# ローカルSupabaseが起動していることを確認
docker ps | grep supabase

# psqlがインストールされていることを確認
psql --version
```

---

## ステップ1: ローカルデータのバックアップ

### **1-1. スキーマのダンプ**

```bash
# スキーマ（テーブル構造）のみをダンプ
docker exec supabase_db_anke-nextjs-dev pg_dump \
  -U postgres \
  -d postgres \
  --schema-only \
  --no-owner \
  --no-acl \
  > @backups/schema_only_$(date +%Y%m%d_%H%M%S).sql
```

### **1-2. データのダンプ（3グループに分割）**

大量のデータを効率的にアップロードするため、3つのグループに分割します。

#### **グループ1: メインデータ（27MB）**
```bash
docker exec supabase_db_anke-nextjs-dev pg_dump \
  -U postgres \
  -d postgres \
  --data-only \
  --no-owner \
  --no-acl \
  --disable-triggers \
  --table=public.users \
  --table=public.posts \
  --table=public.comments \
  --table=public.vote_options \
  --table=public.vote_choices \
  --table=public.vote_history \
  --table=public.categories \
  --table=public.keywords \
  --table=public.post_keywords \
  --table=public.favorites \
  --table=public.likes \
  > @backups/group1_main_data.sql
```

#### **グループ2: サポートデータ（17MB）**
```bash
docker exec supabase_db_anke-nextjs-dev pg_dump \
  -U postgres \
  -d postgres \
  --data-only \
  --no-owner \
  --no-acl \
  --disable-triggers \
  --table=public.notifications \
  --table=public.points \
  --table=public.point_settings \
  --table=public.points_aggregate_logs \
  --table=public.accounts \
  --table=public.sessions \
  --table=public.workers \
  --table=public.like_counts \
  --table=public.keyword_search_history \
  --table=public.ng_words \
  > @backups/group2_support_data.sql
```

#### **グループ3: 管理データ（26KB）**
```bash
docker exec supabase_db_anke-nextjs-dev pg_dump \
  -U postgres \
  -d postgres \
  --data-only \
  --no-owner \
  --no-acl \
  --disable-triggers \
  --table=public.api_settings \
  --table=public.auto_creator_logs \
  --table=public.auto_creator_processed \
  --table=public.auto_creator_settings \
  --table=public.auto_tagger_logs \
  --table=public.auto_voter_logs \
  --table=public.auto_voter_settings \
  --table=public.backup_logs \
  --table=public.mail_logs \
  --table=public.mail_settings \
  --table=public.mail_templates \
  > @backups/group3_admin_data.sql
```

### **1-3. バックアップファイルの確認**
```bash
ls -lh @backups/
```

以下のファイルが作成されていることを確認：
- `schema_only_YYYYMMDD_HHMMSS.sql`（約200KB）
- `group1_main_data.sql`（約27MB）
- `group2_support_data.sql`（約17MB）
- `group3_admin_data.sql`（約26KB）

---

## ステップ2: 新しいSupabaseプロジェクトの作成

### **2-1. Supabaseダッシュボードにアクセス**
https://supabase.com/dashboard/projects

### **2-2. 新しいプロジェクトを作成**

1. **「New project」ボタンをクリック**

2. **プロジェクト情報を入力**
   - **Name**: `anke`（または任意の名前）
   - **Database Password**: 強力なパスワードを生成（必ず保存）
   - **Region**: **Northeast Asia (Tokyo)** を選択（推奨）
   - **Pricing Plan**: Free（または必要に応じて）

3. **「Create new project」をクリック**

⏱️ **プロジェクト作成時間**: 約2〜3分

### **2-3. プロジェクト情報を取得**

プロジェクトが作成されたら、以下の情報を取得してメモしてください：

#### **Project Reference ID**
- **Settings > General > Reference ID**
- 例: `btjwtqkwigunbmklsgpj`

#### **Database Password**
- プロジェクト作成時に設定したパスワード
- 例: `mfT9BeG0MfC1dW3f`

#### **API Keys**
- **Settings > API > Publishable and secret API keys**
- **Publishable Key**: `sb_publishable_...`
- **Secret Key**: `sb_secret_...`

---

## ステップ3: スキーマとデータのアップロード

### **3-1. アップロードスクリプトの作成**

`scripts/setup-new-project.sh` を作成：

```bash
#!/bin/bash

# 新しいSupabaseプロジェクトにスキーマとデータをセットアップするスクリプト

# 新しいプロジェクト情報（ここに取得した情報を入力）
PROJECT_REF="btjwtqkwigunbmklsgpj"  # Project Reference ID
DB_PASSWORD="mfT9BeG0MfC1dW3f"      # Database Password
DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

# バックアップファイル（実際のファイル名に置き換える）
SCHEMA_FILE="@backups/schema_only_20260115_134935.sql"
DATA_GROUP1="@backups/group1_main_data.sql"
DATA_GROUP2="@backups/group2_support_data.sql"
DATA_GROUP3="@backups/group3_admin_data.sql"

# 環境変数でパスワードを設定
export PGPASSWORD="$DB_PASSWORD"

echo "🚀 新しいSupabaseプロジェクトのセットアップを開始します..."
echo "🌐 プロジェクトID: $PROJECT_REF"
echo ""

# ステップ1: スキーマを作成
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 ステップ1: スキーマ（テーブル構造）を作成"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏱️  予想時間: 数秒"
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=0 \
  < "$SCHEMA_FILE" 2>&1 | tail -20

echo "✅ スキーマの作成完了"
echo ""

# ステップ2: グループ1のデータをアップロード
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 ステップ2: グループ1（メインデータ 27MB）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏱️  予想時間: 2〜3分"
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=0 \
  < "$DATA_GROUP1" 2>&1 | tail -20

echo "✅ グループ1のアップロード完了"
echo ""

# ステップ3: グループ2のデータをアップロード
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 ステップ3: グループ2（サポートデータ 17MB）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏱️  予想時間: 1〜2分"
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=0 \
  < "$DATA_GROUP2" 2>&1 | tail -20

echo "✅ グループ2のアップロード完了"
echo ""

# ステップ4: グループ3のデータをアップロード
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 ステップ4: グループ3（管理データ 26KB）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏱️  予想時間: 数秒"
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=0 \
  < "$DATA_GROUP3" 2>&1 | tail -20

echo "✅ グループ3のアップロード完了"

# パスワードをクリア
unset PGPASSWORD

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 新しいプロジェクトのセットアップが完了しました！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 データ確認:"
echo "   https://supabase.com/dashboard/project/$PROJECT_REF/editor"
echo ""
```

### **3-2. スクリプトの実行**

```bash
# 実行権限を付与
chmod +x scripts/setup-new-project.sh

# スクリプトを実行
./scripts/setup-new-project.sh
```

⏱️ **合計所要時間**: 約3〜5分

---

## ステップ4: 環境変数の更新

### **4-1. ローカルの.env.localを更新**

```bash
# ファイルを開く
open -a "TextEdit" .env.local
```

以下の3行を更新：

```env
# 変更前（ローカルDockerSupabase）
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 変更後（新しいSupabase Cloud）
NEXT_PUBLIC_SUPABASE_URL=https://btjwtqkwigunbmklsgpj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_0nT0Dx3CW2yrjwatqhr-9g_rfSL7pUU
SUPABASE_SERVICE_ROLE_KEY=sb_secret_ryPCDMeATXBj-vt7FJdT7g_zA9J0TwD
```

保存してください。

### **4-2. VPSの.env.localを更新**

```bash
# SSH接続
ssh -i ~/.ssh/anke-nextjs.key ubuntu@133.18.122.123

# 作業ディレクトリに移動
cd /var/www/anke-nextjs

# .env.localを編集
nano .env.local
```

同じ3行を更新：

```env
NEXT_PUBLIC_SUPABASE_URL=https://btjwtqkwigunbmklsgpj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_0nT0Dx3CW2yrjwatqhr-9g_rfSL7pUU
SUPABASE_SERVICE_ROLE_KEY=sb_secret_ryPCDMeATXBj-vt7FJdT7g_zA9J0TwD
```

保存して終了：
- `Ctrl + O` → Enter（保存）
- `Ctrl + X`（終了）

### **4-3. VPSでビルド＆再起動**

```bash
# ビルドキャッシュをクリア
rm -rf .next

# 本番ビルド
npm run build

# PM2で再起動
pm2 restart anke-nextjs

# ログを確認
pm2 logs anke-nextjs --lines 50
```

SSH接続を終了：
```bash
exit
```

---

## ステップ5: 動作確認

### **5-1. Supabaseダッシュボードで確認**

https://supabase.com/dashboard/project/btjwtqkwigunbmklsgpj/editor

以下のテーブルのデータ件数を確認：
- `users`: 575件
- `posts`: 12,494件
- `comments`: 84,533件

### **5-2. VPSアプリケーションで確認**

http://133.18.122.123/

ブラウザでアクセスして、以下を確認：
- ✅ ページが正常に表示される
- ✅ ログインできる
- ✅ 投稿が表示される
- ✅ コメントが表示される

### **5-3. ローカル開発環境で確認**

```bash
# ローカルのDockerSupabaseを停止（新しいリモートSupabaseを使用するため）
npx supabase stop

# 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000 にアクセスして確認

---

## トラブルシューティング

### **エラー: relation "xxx_id_seq" does not exist**

**原因**: シーケンスが存在しないエラー

**対処法**: このエラーは無視して問題ありません。データは正常にインポートされており、新しいレコード挿入時にシーケンスは自動的に作成されます。

---

### **エラー: password authentication failed**

**原因**: データベースパスワードが間違っている

**対処法**:
1. Supabaseダッシュボードで正しいパスワードを確認
2. スクリプトの`DB_PASSWORD`を更新
3. スクリプトを再実行

---

### **エラー: could not translate host name**

**原因**: Project Reference IDが間違っている

**対処法**:
1. Supabaseダッシュボードで Settings > General > Reference ID を確認
2. スクリプトの`PROJECT_REF`を更新
3. スクリプトを再実行

---

### **データが表示されない**

**原因**: スキーマが作成されていない、または環境変数が更新されていない

**対処法**:
1. Supabaseダッシュボードでテーブルが存在することを確認
2. `.env.local`の`NEXT_PUBLIC_SUPABASE_URL`が正しいことを確認
3. アプリケーションを再起動

---

## 📝 チェックリスト

作業完了後、以下を確認してください：

- [ ] ローカルデータのバックアップ完了（スキーマ + 3グループ）
- [ ] 新しいSupabaseプロジェクト作成完了
- [ ] Project Reference IDとパスワードを取得
- [ ] スキーマとデータのアップロード完了
- [ ] ローカルの.env.local更新完了
- [ ] VPSの.env.local更新完了
- [ ] VPSでビルド＆再起動完了
- [ ] Supabaseダッシュボードでデータ確認完了
- [ ] VPSアプリケーションで動作確認完了
- [ ] ローカル開発環境で動作確認完了

---

## 🗑️ 古いプロジェクトの削除

全ての動作確認が完了したら、古いプロジェクトを削除できます：

1. https://supabase.com/dashboard/projects にアクセス
2. 古いプロジェクトを選択
3. Settings > General > Danger Zone
4. **Delete project** をクリック

---

## 📚 関連ドキュメント

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL psql](https://www.postgresql.org/docs/current/app-psql.html)
