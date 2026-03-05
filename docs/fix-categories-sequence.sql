-- categoriesテーブルのシーケンスをリセット
-- Supabaseの管理画面（SQL Editor）で実行してください

-- 現在の最大IDを確認
SELECT MAX(id) FROM categories;

-- シーケンスを現在の最大ID+1にリセット
SELECT setval('categories_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM categories), false);

-- 確認：次に採番されるIDを表示
SELECT nextval('categories_id_seq');
SELECT currval('categories_id_seq');
