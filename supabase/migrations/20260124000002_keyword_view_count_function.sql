-- キーワードのview_countをインクリメントする関数

CREATE OR REPLACE FUNCTION increment_keyword_view_count(keyword_id BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE keywords
  SET view_count = COALESCE(view_count, 0) + 1,
      updated_at = NOW()
  WHERE id = keyword_id;
END;
$$ LANGUAGE plpgsql;
