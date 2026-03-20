-- last_executed_atの値を確認
SELECT setting_key, setting_value, updated_at 
FROM auto_commenter_liker_settings 
WHERE setting_key = 'last_executed_at';
