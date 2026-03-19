-- AI自動投稿の設定を確認
SELECT id, is_active, interval_minutes, updated_at, created_at
FROM auto_creator_settings
WHERE id = 1;
