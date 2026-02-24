-- 検索履歴挿入時に自動的にキーワードを作成・紐付けするトリガー

-- 既存のトリガーを削除
DROP TRIGGER IF EXISTS trigger_keyword_search_history_insert ON keyword_search_history;

-- 新しいトリガー関数を作成
CREATE OR REPLACE FUNCTION trigger_auto_create_keywords_on_search()
RETURNS TRIGGER AS $$
DECLARE
  search_count INTEGER;
  existing_keyword_id INTEGER;
  post_record RECORD;
BEGIN
  -- このキーワードの検索回数をカウント（今回の挿入を含む）
  -- search_typeに関係なくすべての検索履歴をカウント
  SELECT COUNT(*) INTO search_count
  FROM keyword_search_history
  WHERE search_keyword = NEW.search_keyword;
  
  -- 5回以上検索されている場合のみ処理
  IF search_count >= 5 THEN
    -- keywordsテーブルに既に存在するか確認
    SELECT id INTO existing_keyword_id
    FROM keywords
    WHERE keyword = NEW.search_keyword;
    
    -- 存在しない場合は新規作成
    IF existing_keyword_id IS NULL THEN
      INSERT INTO keywords (keyword, keyword_type, is_featured)
      VALUES (NEW.search_keyword, 'tag', false)
      RETURNING id INTO existing_keyword_id;
      
      RAISE NOTICE 'Created new keyword: % (ID: %)', NEW.search_keyword, existing_keyword_id;
    END IF;
    
    -- キーワードが存在する場合（新規作成または既存）、投稿を検索して紐付け
    IF existing_keyword_id IS NOT NULL THEN
      FOR post_record IN
        SELECT id
        FROM posts
        WHERE (LOWER(title) LIKE '%' || LOWER(NEW.search_keyword) || '%'
           OR LOWER(content) LIKE '%' || LOWER(NEW.search_keyword) || '%')
          AND status IN ('publish', 'published')
      LOOP
        -- 既に紐付けが存在するか確認
        IF NOT EXISTS (
          SELECT 1 FROM post_keywords
          WHERE post_id = post_record.id AND keyword_id = existing_keyword_id
        ) THEN
          -- 紐付けを作成
          INSERT INTO post_keywords (post_id, keyword_id)
          VALUES (post_record.id, existing_keyword_id)
          ON CONFLICT (post_id, keyword_id) DO NOTHING;
          
          RAISE NOTICE 'Linked post % with keyword %', post_record.id, NEW.search_keyword;
        END IF;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成
CREATE TRIGGER trigger_keyword_search_history_insert
  AFTER INSERT ON keyword_search_history
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_create_keywords_on_search();
