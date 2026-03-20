-- auto_creator_settingsテーブルをキー・バリュー形式に変更するマイグレーション

-- 1. 既存データをバックアップ
CREATE TABLE auto_creator_settings_backup AS SELECT * FROM auto_creator_settings;

-- 2. 既存テーブルを削除
DROP TABLE auto_creator_settings;

-- 3. 新しいキー・バリュー形式のテーブルを作成
CREATE TABLE auto_creator_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLSを有効化
ALTER TABLE auto_creator_settings ENABLE ROW LEVEL SECURITY;

-- 5. 管理者のみアクセス可能なポリシーを作成
CREATE POLICY "管理者のみアクセス可能" ON auto_creator_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.status = 1
    )
  );

-- 6. 既存データを新形式に移行
INSERT INTO auto_creator_settings (setting_key, setting_value, updated_at)
SELECT 'enabled', is_active::text, updated_at FROM auto_creator_settings_backup
UNION ALL
SELECT 'interval', interval_minutes::text, updated_at FROM auto_creator_settings_backup
UNION ALL
SELECT 'interval_variance', '15', updated_at FROM auto_creator_settings_backup
UNION ALL
SELECT 'yahoo_chiebukuro_url', COALESCE(yahoo_chiebukuro_url, ''), updated_at FROM auto_creator_settings_backup
UNION ALL
SELECT 'title_prompt', COALESCE(title_prompt, ''), updated_at FROM auto_creator_settings_backup
UNION ALL
SELECT 'content_prompt', COALESCE(content_prompt, ''), updated_at FROM auto_creator_settings_backup
UNION ALL
SELECT 'max_scraping_items', COALESCE(max_scraping_items::text, '20'), updated_at FROM auto_creator_settings_backup
UNION ALL
SELECT 'category_queue', COALESCE(category_queue::text, '[]'), updated_at FROM auto_creator_settings_backup
UNION ALL
SELECT 'queue_index', COALESCE(queue_index::text, '0'), updated_at FROM auto_creator_settings_backup
UNION ALL
SELECT 'category_weights', COALESCE(category_weights::text, '{}'), updated_at FROM auto_creator_settings_backup
UNION ALL
SELECT 'no_create_start_hour', '0', NOW()
UNION ALL
SELECT 'no_create_end_hour', '6', NOW()
UNION ALL
SELECT 'last_executed_at', updated_at::text, updated_at FROM auto_creator_settings_backup;

-- 7. バックアップテーブルを削除（確認後に実行）
-- DROP TABLE auto_creator_settings_backup;
