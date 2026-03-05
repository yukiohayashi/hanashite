-- カテゴリIDの再編成（シンプル版）
-- 運営からのお知らせをID=1に、他のカテゴリをID=20以降に移動
-- Supabaseの管理画面（SQL Editor）で実行してください

-- 方針: postsを一時IDに更新→古いカテゴリ削除→新カテゴリ作成→postsを最終IDに更新

-- ステップ1: postsテーブルのcategory_idを一時的な値（2000番台）に更新
UPDATE posts SET category_id = 2001 WHERE category_id = 1; -- 片思い
UPDATE posts SET category_id = 2002 WHERE category_id = 2; -- 結婚・婚活
UPDATE posts SET category_id = 2003 WHERE category_id = 3; -- 復縁
UPDATE posts SET category_id = 2004 WHERE category_id = 4; -- 出会い
UPDATE posts SET category_id = 2005 WHERE category_id = 5; -- 夫婦
UPDATE posts SET category_id = 2006 WHERE category_id = 6; -- 浮気・不倫
UPDATE posts SET category_id = 2007 WHERE category_id = 7; -- デート
UPDATE posts SET category_id = 2008 WHERE category_id = 8; -- セックスレス
UPDATE posts SET category_id = 2009 WHERE category_id = 9; -- 格差恋愛
UPDATE posts SET category_id = 2010 WHERE category_id = 10; -- 職場恋愛
UPDATE posts SET category_id = 2011 WHERE category_id = 11; -- 性
UPDATE posts SET category_id = 2012 WHERE category_id = 12; -- 告白・プロポーズ
UPDATE posts SET category_id = 2013 WHERE category_id = 13; -- 離婚
UPDATE posts SET category_id = 2014 WHERE category_id = 14; -- その他
UPDATE posts SET category_id = 2015 WHERE category_id = 15; -- 浮気
UPDATE posts SET category_id = 2016 WHERE category_id = 16; -- 遠距離恋愛
UPDATE posts SET category_id = 2017 WHERE category_id = 17; -- マンネリ・倦怠期
UPDATE posts SET category_id = 2018 WHERE category_id = 18; -- 夜の悩み
UPDATE posts SET category_id = 2019 WHERE category_id = 19; -- 運営からのお知らせ

-- ステップ2: 古いカテゴリをすべて削除
DELETE FROM categories WHERE id BETWEEN 1 AND 19;

-- ステップ3: 新しいIDでカテゴリを作成
INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 1, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM (SELECT name, slug, description, icon, display_order, is_active, created_at, updated_at FROM categories WHERE id = 2019 LIMIT 1) AS temp; -- 運営からのお知らせ

INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 20, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM categories WHERE id = 1; -- 片思い

INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 21, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM categories WHERE id = 2; -- 結婚・婚活

INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 22, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM categories WHERE id = 3; -- 復縁

INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 23, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM categories WHERE id = 4; -- 出会い

INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 24, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM categories WHERE id = 5; -- 夫婦

INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 25, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM categories WHERE id = 6; -- 浮気・不倫

INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 26, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM categories WHERE id = 7; -- デート

INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 27, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM categories WHERE id = 8; -- セックスレス

INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 28, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM categories WHERE id = 9; -- 格差恋愛

INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 29, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM categories WHERE id = 10; -- 職場恋愛

INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 30, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM categories WHERE id = 11; -- 性

INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 31, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM categories WHERE id = 12; -- 告白・プロポーズ

INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 32, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM categories WHERE id = 13; -- 離婚

INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 33, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM categories WHERE id = 14; -- その他

INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 34, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM categories WHERE id = 15; -- 浮気

INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 35, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM categories WHERE id = 16; -- 遠距離恋愛

INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 36, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM categories WHERE id = 17; -- マンネリ・倦怠期

INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 37, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM categories WHERE id = 18; -- 夜の悩み

-- ステップ2: postsテーブルのcategory_idを新しいIDに更新
UPDATE posts SET category_id = 1 WHERE category_id = 19; -- 運営からのお知らせ
UPDATE posts SET category_id = 20 WHERE category_id = 1; -- 片思い
UPDATE posts SET category_id = 21 WHERE category_id = 2; -- 結婚・婚活
UPDATE posts SET category_id = 22 WHERE category_id = 3; -- 復縁
UPDATE posts SET category_id = 23 WHERE category_id = 4; -- 出会い
UPDATE posts SET category_id = 24 WHERE category_id = 5; -- 夫婦
UPDATE posts SET category_id = 25 WHERE category_id = 6; -- 浮気・不倫
UPDATE posts SET category_id = 26 WHERE category_id = 7; -- デート
UPDATE posts SET category_id = 27 WHERE category_id = 8; -- セックスレス
UPDATE posts SET category_id = 28 WHERE category_id = 9; -- 格差恋愛
UPDATE posts SET category_id = 29 WHERE category_id = 10; -- 職場恋愛
UPDATE posts SET category_id = 30 WHERE category_id = 11; -- 性
UPDATE posts SET category_id = 31 WHERE category_id = 12; -- 告白・プロポーズ
UPDATE posts SET category_id = 32 WHERE category_id = 13; -- 離婚
UPDATE posts SET category_id = 33 WHERE category_id = 14; -- その他
UPDATE posts SET category_id = 34 WHERE category_id = 15; -- 浮気
UPDATE posts SET category_id = 35 WHERE category_id = 16; -- 遠距離恋愛
UPDATE posts SET category_id = 36 WHERE category_id = 17; -- マンネリ・倦怠期
UPDATE posts SET category_id = 37 WHERE category_id = 18; -- 夜の悩み

-- ステップ3: 古いカテゴリを削除
DELETE FROM categories WHERE id IN (2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19);

-- ステップ4: シーケンスをリセット（次のIDは38から）
SELECT setval('categories_id_seq', 38, false);

-- 確認
SELECT id, name FROM categories ORDER BY id;
SELECT nextval('categories_id_seq'); -- 38が返ってくるはず
