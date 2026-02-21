-- =============================================
-- ユーザーIDにUUIDデフォルト値を追加
-- 新規ユーザー作成時に自動的にUUIDが生成される
-- =============================================

-- uuid-ossp拡張機能を有効化（UUIDv4生成用）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- usersテーブルのidカラムにデフォルト値を設定
-- 既存のユーザーには影響しない（デフォルト値は新規レコードのみ適用）
ALTER TABLE users 
  ALTER COLUMN id SET DEFAULT uuid_generate_v4()::text;

-- コメント追加
COMMENT ON COLUMN users.id IS 'ユーザーID（UUIDv4形式、自動生成）';
