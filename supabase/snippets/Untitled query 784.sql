-- BTSキーワードを作成または取得
INSERT INTO keywords (keyword, slug, created_at)
VALUES ('BTS', 'bts', NOW())
ON CONFLICT (keyword) DO NOTHING;

INSERT INTO keywords (keyword, slug, created_at)
VALUES ('アルバム', 'アルバム', NOW())
ON CONFLICT (keyword) DO NOTHING;

INSERT INTO keywords (keyword, slug, created_at)
VALUES ('アリラン', 'アリラン', NOW())
ON CONFLICT (keyword) DO NOTHING;

-- post_keywordsに関連付け（実際の投稿IDに置き換えてください）
INSERT INTO post_keywords (post_id, keyword_id)
SELECT [実際の投稿ID], id FROM keywords WHERE keyword IN ('BTS', 'アルバム', 'アリラン')
ON CONFLICT DO NOTHING;