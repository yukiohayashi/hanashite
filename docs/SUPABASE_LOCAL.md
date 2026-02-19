# ローカルSupabase接続情報

このプロジェクト専用のSupabase設定です。

## ポート設定

- **Project ID**: `hanashite`
- **API URL**: `http://127.0.0.1:54331`
- **Database Port**: `54332`
- **Studio URL**: `http://127.0.0.1:54333/project/default`

## データベース直接接続

```bash
# PostgreSQL接続
psql postgresql://postgres:postgres@127.0.0.1:54332/postgres

# Supabase CLIでデータベース操作
npx supabase db reset --db-url postgresql://postgres:postgres@127.0.0.1:54332/postgres --linked=false
```

## 重要な注意事項

⚠️ **このプロジェクトのデータベースポートは `54332` です**

他のSupabaseプロジェクトと混同しないよう注意してください：
- デフォルトのSupabaseポート: `54322`
- このプロジェクト: `54332`

## 環境変数

`.env.local`に以下が設定されています：

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Supabase設定ファイル

設定は `supabase/config.toml` で管理されています。
