-- キーワードのpost_countを自動更新するトリガー

-- post_keywordsにレコードが追加されたときにpost_countをインクリメント
CREATE OR REPLACE FUNCTION increment_keyword_post_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE keywords
  SET post_count = COALESCE(post_count, 0) + 1,
      updated_at = NOW()
  WHERE id = NEW.keyword_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- post_keywordsからレコードが削除されたときにpost_countをデクリメント
CREATE OR REPLACE FUNCTION decrement_keyword_post_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE keywords
  SET post_count = GREATEST(COALESCE(post_count, 0) - 1, 0),
      updated_at = NOW()
  WHERE id = OLD.keyword_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
DROP TRIGGER IF EXISTS trigger_increment_keyword_post_count ON post_keywords;
CREATE TRIGGER trigger_increment_keyword_post_count
  AFTER INSERT ON post_keywords
  FOR EACH ROW
  EXECUTE FUNCTION increment_keyword_post_count();

DROP TRIGGER IF EXISTS trigger_decrement_keyword_post_count ON post_keywords;
CREATE TRIGGER trigger_decrement_keyword_post_count
  AFTER DELETE ON post_keywords
  FOR EACH ROW
  EXECUTE FUNCTION decrement_keyword_post_count();

-- 既存のpost_keywordsからpost_countを再計算
UPDATE keywords k
SET post_count = (
  SELECT COUNT(*)
  FROM post_keywords pk
  WHERE pk.keyword_id = k.id
),
updated_at = NOW();
