-- categoriesテーブルのシーケンスをリセット
-- Supabaseの管理画面（SQL Editor）で実行してください

-- ステップ1: 現在の最大IDを確認
SELECT MAX(id) as max_id FROM categories;

-- ステップ2: シーケンスを最大ID+1にリセット
-- 上記の結果が19の場合、次のIDは20になります
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories) + 1, false);

-- ステップ3: 確認（次に採番されるIDを表示）
SELECT nextval('categories_id_seq') as next_id;

-- ステップ4: シーケンスを元に戻す（確認用なので実行後は元に戻す）
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories) + 1, false);
