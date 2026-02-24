-- post_keywordsテーブルのkeyword_id外部キー制約を追加
-- 既存の制約がある場合はスキップ
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'post_keywords_keyword_id_fkey'
  ) THEN
    ALTER TABLE post_keywords 
    ADD CONSTRAINT post_keywords_keyword_id_fkey 
    FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE;
  END IF;
END $$;
