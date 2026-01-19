# アンケ新システム構成図（WordPress移行）

## 🏗️ anke.jp サイト構成

### ■ フロント・バックエンド
- **採用技術**: Next.js
- **役割**: ユーザーインターフェースおよびAPIロジックの構築

### ■ データベース・認証
- **採用技術**: Supabase
- **役割**: データの保存、ユーザー認証、リアルタイム機能の提供

### ■ インフラ基盤
- **採用技術**: カゴヤVPS (Ubuntu)
- **役割**: アプリケーションをホストする国内の高速サーバー環境

### ■ Webサーバー
- **採用技術**: Nginx
- **役割**: リバースプロキシとして外部リクエストを適切に転送

### ■ プロセス管理
- **採用技術**: PM2
- **役割**: Next.jsアプリの常時起動と、異常終了時の自動再起動

### ■ 環境管理
- **採用技術**: Docker
- **役割**: 開発・本番環境の共通化と、各機能のコンテナ分離

### ■ タスクスケジューラ
- **採用技術**: CRON (Crontab)
- **役割**: AI自動投稿機能などの定期的なバッチ処理の実行

---

## 📊 システム全体構成

```
アンケ新システム（WordPress移行）
├── フロントエンド
│   ├── Next.js 16.1.0（App Router / SSR / API Routes）
│   ├── React 19
│   └── スタイリング
│       ├── Tailwind CSS
│       └── shadcn/ui（コンポーネントライブラリ）
│
├── データベース層
│   ├── Supabase（PostgreSQL 17）
│   │   ├── データベース（ローカル: 127.0.0.1:54322）
│   │   ├── Storage（ファイルストレージ）
│   │   ├── Realtime（リアルタイム通信）
│   │   └── REST API / GraphQL
│   └── ※Prisma ORM（今後導入予定）
│       ├── 型安全なクエリ
│       └── マイグレーション管理
│
├── 認証
│   ├── NextAuth.js v5（現在実装中）
│   │   ├── セッション管理
│   │   ├── ユーザー認証
│   │   └── ロール管理（status: 0-6）
│   └── ※Better Auth.js（今後検討）
│
├── CMS（管理画面）
│   ├── オリジナル開発（WordPress風UI）
│   │   ├── /admin - ダッシュボード
│   │   ├── /admin/users - ユーザー管理
│   │   ├── /admin/posts - 投稿管理
│   │   └── /admin/comments - コメント管理
│   └── ※shadcn/ui+（今後拡張予定）
│
└── 外部サーバー【別管理】
    └── 独自VPS（anke.jp - 133.18.234.69）
        ├── CRON（定期実行タスク）
        ├── バッチ処理
        └── API連携
```

---

## 🗄️ データベース構成

### Supabase PostgreSQL テーブル

#### 1. ユーザー関連
- **users** (578件)
  - NextAuth.js用ユーザーテーブル
  - フィールド: id, name, email, status, is_banned, created_at

- **accounts** (NextAuth.jsアカウント連携)
- **sessions** (セッション管理)
- **verification_tokens** (認証トークン)

#### 2. コンテンツ関連
- **posts** (12,856件)
  - 投稿データ
  - フィールド: id, title, content, status, user_id, created_at

- **comments** (85,135件)
  - コメントデータ
  - フィールド: id, post_id, content, user_id, created_at

- **keywords** (1,886件)
  - キーワード・タグ
  - フィールド: id, keyword, slug, keyword_type, post_count

#### 3. インタラクション関連
- **likes** (8,968件)
  - いいね機能
  
- **like_counts**
  - いいね集計

- **favorites**
  - お気に入り

- **points**
  - ポイントシステム

#### 4. 投票関連
- **vote_options**
  - 投票設定

- **vote_choices**
  - 投票選択肢

- **vote_history**
  - 投票履歴

#### 5. 検索関連
- **keyword_search_history**
  - キーワード検索履歴

---

## 🔐 認証・認可システム

### ユーザーロール（status）

| status | 役割 | 権限 |
|--------|------|------|
| 0 | 一般ユーザー | 閲覧、コメント |
| 1 | メンバー | 投稿作成 |
| 2 | 編集者 | 投稿編集、コメント管理 |
| 3 | 管理者 | 全機能アクセス |
| 6 | AIエディター | AI自動投稿 |

### 管理画面アクセス制御
- `/admin/*` - status >= 2（編集者以上）
- 現在は user_id = 33 で一時的にアクセス許可

---

## 🚀 開発環境

### ローカル環境
- **Next.js開発サーバー**: http://localhost:3000
- **Supabase Studio**: http://127.0.0.1:54323
- **Supabase API**: http://127.0.0.1:54321
- **PostgreSQL**: postgresql://postgres:postgres@127.0.0.1:54322/postgres

### 本番環境（予定）
- **フロントエンド**: Vercel / Netlify
- **データベース**: Supabase Cloud
- **VPS**: anke.jp (133.18.234.69)

---

## 📦 主要パッケージ

```json
{
  "dependencies": {
    "next": "16.1.0",
    "react": "^19.0.0",
    "next-auth": "^5.0.0-beta.25",
    "@supabase/supabase-js": "^2.47.10",
    "tailwindcss": "^3.4.17",
    "lucide-react": "^0.468.0"
  }
}
```

---

## 🔄 データ移行状況

### 完了
- ✅ MacBook（旧）からSupabaseデータ復元完了
  - posts: 12,856件
  - comments: 85,135件
  - users: 578件
  - keywords: 1,886件
  - likes: 8,968件

### 今後の予定
- [ ] リモートSupabaseへのデプロイ
- [ ] Prisma ORMの導入
- [ ] Better Auth.jsへの移行検討
- [ ] shadcn/ui+によるCMS拡張

---

## 🎯 WordPress移行の進捗

### 移行済み機能
- ✅ 投稿管理（CRUD）
- ✅ コメント管理（CRUD）
- ✅ ユーザー管理（CRUD）
- ✅ キーワード・タグ管理
- ✅ いいね機能
- ✅ 投票機能
- ✅ 検索履歴

### 未移行機能
- [ ] メディアライブラリ（Supabase Storage使用予定）
- [ ] プラグイン機能
- [ ] テーマカスタマイズ
- [ ] SEO設定
- [ ] サイトマップ生成

---

## 📝 開発メモ

### 技術的な決定事項
1. **Next.js App Router採用**: SSR/SSG/ISRの柔軟な選択
2. **Supabase採用**: PostgreSQL + リアルタイム機能
3. **Tailwind CSS採用**: 高速な開発とカスタマイズ性
4. **shadcn/ui採用**: 再利用可能なコンポーネント

### パフォーマンス最適化
- N+1クエリ問題の解決（バッチ取得 + Map）
- 表示件数制限（10/50/100件）
- Supabase count機能による効率的な集計

### セキュリティ
- RLS（Row Level Security）無効化（開発環境のみ）
- 本番環境ではRLS有効化予定
- NextAuth.jsによるセッション管理

---

**最終更新**: 2026年1月7日
**バージョン**: 1.0.0
**ステータス**: 開発中
