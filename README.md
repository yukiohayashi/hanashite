# Anke Next.js アプリケーション

WordPressからSupabaseへ移行したAnkeアンケートサイトのNext.js実装

## 🎉 データ移行完了

### 移行済みデータ
- **投稿**: 1,000件（wp_anke_postsから、OGP情報含む）
- **ユーザー**: 574件（wp_anke_usersから、重複解決済み）
- **コメント**: 2,642件（wp_anke_commentsから）

### データベース構造
- **Supabase**: PostgreSQL
- **テーブル**: users, posts, comments, vote_options, vote_choices, vote_history, points, likes

---

## 🚀 開発サーバーの起動

```bash
cd /Users/yukki/htdocs/kusanagi_html_anke/anke-nextjs
npm run dev
```

ブラウザで開く: [http://localhost:3000](http://localhost:3000)

---

## 📸 画像表示機能の実装

### 現在の状態
- ✅ Supabaseの`posts`テーブルに`og_image`と`thumbnail_url`カラムあり
- ⚠️ 画像URLがまだ移行されていない（デフォルト画像のみ表示）

### 画像データの移行手順

#### 1. 画像URLを移行
```bash
npx tsx scripts/migrate-post-images.ts
```

このスクリプトは以下を実行します：
- WordPressの`wp_anke_posts`から`thumbnail_id`と`og_image`を取得
- `thumbnail_id`からWordPressメディアライブラリーのURLを生成
- Supabaseの`posts`テーブルに`thumbnail_url`と`og_image`を更新

#### 2. 画像の保存場所
- **WordPress**: `https://anke.jp/wp-content/uploads/YYYY/MM/filename.jpg`
- **Supabase**: URLのみ保存（実際の画像はWordPressサーバーに残る）

#### 3. Next.jsで画像を表示
投稿一覧と詳細ページで以下のように表示：
```tsx
{post.thumbnail_url ? (
  <img src={post.thumbnail_url} alt={post.title} />
) : post.og_image ? (
  <img src={post.og_image} alt={post.title} />
) : (
  <img src="/default-thumbnail.jpg" alt="デフォルト画像" />
)}
```

---

## 🔧 MCP設定（Supabase接続）

### Windsurf MCP
設定ファイル: `/Users/yukki/.windsurf/mcp.json`
```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp",
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_***"
      }
    }
  }
}
```

### Claude CLI MCP
設定ファイル: `/Users/yukki/.claude.json`

使用方法:
```bash
claude
# 「postsテーブルの最新5件を表示して」と質問
```

---

## 📊 データベーススキーマ

### posts テーブル
| カラム | 型 | 説明 |
|--------|-----|------|
| id | BIGSERIAL | 投稿ID |
| user_id | BIGINT | 投稿者ID |
| title | VARCHAR(500) | タイトル |
| content | TEXT | 本文 |
| status | VARCHAR(20) | ステータス |
| view_count | INTEGER | 閲覧数 |
| source_url | VARCHAR(500) | ソースURL |
| og_title | VARCHAR(500) | OGタイトル |
| og_description | TEXT | OG説明文 |
| **og_image** | VARCHAR(500) | **OG画像URL** |
| **thumbnail_url** | VARCHAR(500) | **サムネイル画像URL** |
| auto_created | BOOLEAN | 自動生成フラグ |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 更新日時 |

---

## 🎯 次のステップ

### 画像表示機能を完成させる
1. ✅ 画像移行スクリプトを作成（`scripts/migrate-post-images.ts`）
2. ⏳ 画像URLを移行（実行待ち）
3. ⏳ Next.jsコンポーネントで画像を表示
4. ⏳ デフォルト画像のフォールバック処理

### 実行コマンド
```bash
# 画像URLを移行
npx tsx scripts/migrate-post-images.ts

# 開発サーバーを起動
npm run dev

# ブラウザで確認
open http://localhost:3000
```

---

## 🔄 リモートSupabaseからローカルへのデータ移行

### 環境変数の設定

`.env.local`に以下を追加：
```env
# ローカルSupabase（移行先）
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=***
SUPABASE_SERVICE_ROLE_KEY=***

# リモートSupabase（移行元）
REMOTE_SUPABASE_URL=https://jqfxuqzxvvhbdxqcxpkd.supabase.co
REMOTE_SUPABASE_ANON_KEY=***
REMOTE_SUPABASE_SERVICE_KEY=***
```

### 移行実行手順

1. **環境変数を設定**
   - `.env.local`にリモートSupabaseの接続情報を追加

2. **移行スクリプトを実行**
   ```bash
   npx tsx scripts/migrate-remote-supabase-to-local.ts
   ```

3. **移行対象テーブル（14テーブル）**
   - `users` - ユーザー
   - `accounts` - 認証アカウント
   - `sessions` - セッション
   - `verification_tokens` - 認証トークン
   - `keywords` - キーワード
   - `posts` - 投稿
   - `comments` - コメント
   - `vote_options` - 投票オプション
   - `vote_choices` - 投票選択肢
   - `vote_history` - 投票履歴
   - `favorites` - お気に入り
   - `likes` - いいね
   - `like_counts` - いいね集計
   - `points` - ポイント
   - `keyword_search_history` - 検索履歴

### 移行の特徴
- ✅ 依存関係を考慮した順序で移行
- ✅ バッチ処理（1000件ずつ）
- ✅ upsert方式（既存データは上書き）
- ✅ 詳細な進捗表示とエラーハンドリング
- ✅ 最終レポートで移行結果を確認

---

## 📝 環境変数

`.env.local`に以下を設定：
```env
NEXT_PUBLIC_SUPABASE_URL=https://jqfxuqzxvvhbdxqcxpkd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=***
SUPABASE_SERVICE_ROLE_KEY=***
```
