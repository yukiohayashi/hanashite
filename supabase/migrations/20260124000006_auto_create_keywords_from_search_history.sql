-- keyword_search_historyで5回以上検索されたキーワードを自動的にkeywordsテーブルに追加し、
-- そのキーワードを含む投稿と紐付ける関数

CREATE OR REPLACE FUNCTION auto_create_keywords_from_search_history()
RETURNS void AS $$
DECLARE
  search_keyword_text TEXT;
  search_count INTEGER;
  new_keyword_id INTEGER;
  post_record RECORD;
BEGIN
  -- keyword_search_historyから検索キーワードを集計
  FOR search_keyword_text, search_count IN
    SELECT search_keyword, COUNT(*) as count
    FROM keyword_search_history
    GROUP BY search_keyword
    HAVING COUNT(*) >= 5
  LOOP
    -- keywordsテーブルに既に存在するか確認
    SELECT id INTO new_keyword_id
    FROM keywords
    WHERE keyword = search_keyword_text;
    
    -- 存在しない場合は新規作成
    IF new_keyword_id IS NULL THEN
      INSERT INTO keywords (keyword, keyword_type, is_featured)
      VALUES (search_keyword_text, 'tag', false)
      RETURNING id INTO new_keyword_id;
      
      RAISE NOTICE 'Created new keyword: % (ID: %)', search_keyword_text, new_keyword_id;
    END IF;
    
    -- このキーワードを含む投稿を検索して紐付け
    FOR post_record IN
      SELECT id
      FROM posts
      WHERE (LOWER(title) LIKE '%' || LOWER(search_keyword_text) || '%'
         OR LOWER(content) LIKE '%' || LOWER(search_keyword_text) || '%')
        AND status IN ('publish', 'published')
    LOOP
      -- 既に紐付けが存在するか確認
      IF NOT EXISTS (
        SELECT 1 FROM post_keywords
        WHERE post_id = post_record.id AND keyword_id = new_keyword_id
      ) THEN
        -- 紐付けを作成
        INSERT INTO post_keywords (post_id, keyword_id)
        VALUES (post_record.id, new_keyword_id)
        ON CONFLICT (post_id, keyword_id) DO NOTHING;
        
        RAISE NOTICE 'Linked post % with keyword %', post_record.id, search_keyword_text;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- keyword_search_historyにレコードが挿入されたときに実行されるトリガー
-- ただし、毎回実行すると負荷が高いため、定期実行を推奨
CREATE OR REPLACE FUNCTION trigger_auto_create_keywords()
RETURNS TRIGGER AS $$
BEGIN
  -- 非同期で実行（pg_notify を使用）
  PERFORM pg_notify('keyword_search_inserted', NEW.search_keyword);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_keyword_search_history_insert ON keyword_search_history;
CREATE TRIGGER trigger_keyword_search_history_insert
  AFTER INSERT ON keyword_search_history
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_create_keywords();

-- 手動実行用のコメント
-- 以下のSQLを実行することで、手動でキーワード自動化を実行できます：
-- SELECT auto_create_keywords_from_search_history();
