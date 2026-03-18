-- AI自動投稿システム用のカラムを既存テーブルに追加

-- auto_creator_settingsテーブルにmax_scraping_itemsカラムを追加
ALTER TABLE auto_creator_settings 
ADD COLUMN IF NOT EXISTS max_scraping_items INTEGER DEFAULT 20;
