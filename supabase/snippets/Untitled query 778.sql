INSERT INTO auto_voter_settings (setting_key, setting_value, created_at)
VALUES ('last_execution', NULL, NOW())
ON CONFLICT (setting_key) DO NOTHING;