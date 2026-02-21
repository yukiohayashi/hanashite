-- =============================================
-- ユーザーIDにUUIDデフォルト値を追加
-- 新規ユーザー作成時に自動的にUUIDが生成される
-- =============================================

-- usersテーブルのidカラムにデフォルト値を設定
-- 既存のユーザーには影響しない（デフォルト値は新規レコードのみ適用）
ALTER TABLE users 
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- コメント追加
COMMENT ON COLUMN users.id IS 'ユーザーID（UUIDv4形式、自動生成）';
