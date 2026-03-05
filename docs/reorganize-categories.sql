-- カテゴリIDの再編成
-- 運営からのお知らせをID=1に、他のカテゴリをID=20以降に移動
-- Supabaseの管理画面（SQL Editor）で実行してください

-- ステップ1: 外部キー制約を一時的に無効化
ALTER TABLE posts DISABLE TRIGGER ALL;

-- ステップ2: postsテーブルのcategory_idを一時的に更新
UPDATE posts SET category_id = 1000 WHERE category_id = 1;  -- 片思い
UPDATE posts SET category_id = 1001 WHERE category_id = 2;  -- 結婚・婚活
UPDATE posts SET category_id = 1002 WHERE category_id = 3;  -- 復縁
UPDATE posts SET category_id = 1003 WHERE category_id = 4;  -- 出会い
UPDATE posts SET category_id = 1004 WHERE category_id = 5;  -- 夫婦
UPDATE posts SET category_id = 1005 WHERE category_id = 6;  -- 浮気・不倫
UPDATE posts SET category_id = 1006 WHERE category_id = 7;  -- デート
UPDATE posts SET category_id = 1007 WHERE category_id = 8;  -- セックスレス
UPDATE posts SET category_id = 1008 WHERE category_id = 9;  -- 格差恋愛
UPDATE posts SET category_id = 1009 WHERE category_id = 10; -- 職場恋愛
UPDATE posts SET category_id = 1010 WHERE category_id = 11; -- 性
UPDATE posts SET category_id = 1011 WHERE category_id = 12; -- 告白・プロポーズ
UPDATE posts SET category_id = 1012 WHERE category_id = 13; -- 離婚
UPDATE posts SET category_id = 1013 WHERE category_id = 14; -- その他
UPDATE posts SET category_id = 1014 WHERE category_id = 15; -- 浮気
UPDATE posts SET category_id = 1015 WHERE category_id = 16; -- 遠距離恋愛
UPDATE posts SET category_id = 1016 WHERE category_id = 17; -- マンネリ・倦怠期
UPDATE posts SET category_id = 1017 WHERE category_id = 18; -- 夜の悩み
UPDATE posts SET category_id = 1018 WHERE category_id = 19; -- 運営からのお知らせ

-- ステップ2: categoriesテーブルのIDを一時的に更新
UPDATE categories SET id = 1000 WHERE id = 1;  -- 片思い
UPDATE categories SET id = 1001 WHERE id = 2;  -- 結婚・婚活
UPDATE categories SET id = 1002 WHERE id = 3;  -- 復縁
UPDATE categories SET id = 1003 WHERE id = 4;  -- 出会い
UPDATE categories SET id = 1004 WHERE id = 5;  -- 夫婦
UPDATE categories SET id = 1005 WHERE id = 6;  -- 浮気・不倫
UPDATE categories SET id = 1006 WHERE id = 7;  -- デート
UPDATE categories SET id = 1007 WHERE id = 8;  -- セックスレス
UPDATE categories SET id = 1008 WHERE id = 9;  -- 格差恋愛
UPDATE categories SET id = 1009 WHERE id = 10; -- 職場恋愛
UPDATE categories SET id = 1010 WHERE id = 11; -- 性
UPDATE categories SET id = 1011 WHERE id = 12; -- 告白・プロポーズ
UPDATE categories SET id = 1012 WHERE id = 13; -- 離婚
UPDATE categories SET id = 1013 WHERE id = 14; -- その他
UPDATE categories SET id = 1014 WHERE id = 15; -- 浮気
UPDATE categories SET id = 1015 WHERE id = 16; -- 遠距離恋愛
UPDATE categories SET id = 1016 WHERE id = 17; -- マンネリ・倦怠期
UPDATE categories SET id = 1017 WHERE id = 18; -- 夜の悩み
UPDATE categories SET id = 1018 WHERE id = 19; -- 運営からのお知らせ

-- ステップ3: 運営からのお知らせをID=1に設定
UPDATE categories SET id = 1 WHERE id = 1018;
UPDATE posts SET category_id = 1 WHERE category_id = 1018;

-- ステップ4: 他のカテゴリをID=20以降に設定
UPDATE categories SET id = 20 WHERE id = 1000; -- 片思い
UPDATE posts SET category_id = 20 WHERE category_id = 1000;

UPDATE categories SET id = 21 WHERE id = 1001; -- 結婚・婚活
UPDATE posts SET category_id = 21 WHERE category_id = 1001;

UPDATE categories SET id = 22 WHERE id = 1002; -- 復縁
UPDATE posts SET category_id = 22 WHERE category_id = 1002;

UPDATE categories SET id = 23 WHERE id = 1003; -- 出会い
UPDATE posts SET category_id = 23 WHERE category_id = 1003;

UPDATE categories SET id = 24 WHERE id = 1004; -- 夫婦
UPDATE posts SET category_id = 24 WHERE category_id = 1004;

UPDATE categories SET id = 25 WHERE id = 1005; -- 浮気・不倫
UPDATE posts SET category_id = 25 WHERE category_id = 1005;

UPDATE categories SET id = 26 WHERE id = 1006; -- デート
UPDATE posts SET category_id = 26 WHERE category_id = 1006;

UPDATE categories SET id = 27 WHERE id = 1007; -- セックスレス
UPDATE posts SET category_id = 27 WHERE category_id = 1007;

UPDATE categories SET id = 28 WHERE id = 1008; -- 格差恋愛
UPDATE posts SET category_id = 28 WHERE category_id = 1008;

UPDATE categories SET id = 29 WHERE id = 1009; -- 職場恋愛
UPDATE posts SET category_id = 29 WHERE category_id = 1009;

UPDATE categories SET id = 30 WHERE id = 1010; -- 性
UPDATE posts SET category_id = 30 WHERE category_id = 1010;

UPDATE categories SET id = 31 WHERE id = 1011; -- 告白・プロポーズ
UPDATE posts SET category_id = 31 WHERE category_id = 1011;

UPDATE categories SET id = 32 WHERE id = 1012; -- 離婚
UPDATE posts SET category_id = 32 WHERE category_id = 1012;

UPDATE categories SET id = 33 WHERE id = 1013; -- その他
UPDATE posts SET category_id = 33 WHERE category_id = 1013;

UPDATE categories SET id = 34 WHERE id = 1014; -- 浮気
UPDATE posts SET category_id = 34 WHERE category_id = 1014;

UPDATE categories SET id = 35 WHERE id = 1015; -- 遠距離恋愛
UPDATE posts SET category_id = 35 WHERE category_id = 1015;

UPDATE categories SET id = 36 WHERE id = 1016; -- マンネリ・倦怠期
UPDATE posts SET category_id = 36 WHERE category_id = 1016;

UPDATE categories SET id = 37 WHERE id = 1017; -- 夜の悩み
UPDATE posts SET category_id = 37 WHERE category_id = 1017;

-- ステップ5: シーケンスをリセット（次のIDは38から）
SELECT setval('categories_id_seq', 38, false);

-- ステップ6: 外部キー制約を再有効化
ALTER TABLE posts ENABLE TRIGGER ALL;

-- 確認
SELECT id, name FROM categories ORDER BY id;
SELECT nextval('categories_id_seq'); -- 38が返ってくるはず
