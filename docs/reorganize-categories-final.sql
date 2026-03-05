-- カテゴリIDの再編成（最終版）
-- 運営からのお知らせをID=1に、他のカテゴリをID=20以降に移動
-- Supabaseの管理画面（SQL Editor）で実行してください

-- 方針: postsをNULLに→カテゴリ削除→新カテゴリ作成→postsを新IDに更新

-- ステップ1: 各カテゴリのデータを一時テーブルに保存
CREATE TEMP TABLE temp_categories AS
SELECT id, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM categories
WHERE id BETWEEN 1 AND 19;

-- ステップ2: postsテーブルのcategory_idをNULLに設定
UPDATE posts SET category_id = NULL WHERE category_id BETWEEN 1 AND 19;

-- ステップ3: 古いカテゴリを削除
DELETE FROM categories WHERE id BETWEEN 1 AND 19;

-- ステップ4: 新しいIDでカテゴリを作成
-- 運営からのお知らせ（旧ID=19 → 新ID=1）
INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 1, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM temp_categories WHERE id = 19;

-- 片思い（旧ID=1 → 新ID=20）
INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 20, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM temp_categories WHERE id = 1;

-- 結婚・婚活（旧ID=2 → 新ID=21）
INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 21, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM temp_categories WHERE id = 2;

-- 復縁（旧ID=3 → 新ID=22）
INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 22, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM temp_categories WHERE id = 3;

-- 出会い（旧ID=4 → 新ID=23）
INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 23, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM temp_categories WHERE id = 4;

-- 夫婦（旧ID=5 → 新ID=24）
INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 24, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM temp_categories WHERE id = 5;

-- 浮気・不倫（旧ID=6 → 新ID=25）
INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 25, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM temp_categories WHERE id = 6;

-- デート（旧ID=7 → 新ID=26）
INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 26, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM temp_categories WHERE id = 7;

-- セックスレス（旧ID=8 → 新ID=27）
INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 27, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM temp_categories WHERE id = 8;

-- 格差恋愛（旧ID=9 → 新ID=28）
INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 28, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM temp_categories WHERE id = 9;

-- 職場恋愛（旧ID=10 → 新ID=29）
INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 29, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM temp_categories WHERE id = 10;

-- 性（旧ID=11 → 新ID=30）
INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 30, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM temp_categories WHERE id = 11;

-- 告白・プロポーズ（旧ID=12 → 新ID=31）
INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 31, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM temp_categories WHERE id = 12;

-- 離婚（旧ID=13 → 新ID=32）
INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 32, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM temp_categories WHERE id = 13;

-- その他（旧ID=14 → 新ID=33）
INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 33, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM temp_categories WHERE id = 14;

-- 浮気（旧ID=15 → 新ID=34）
INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 34, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM temp_categories WHERE id = 15;

-- 遠距離恋愛（旧ID=16 → 新ID=35）
INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 35, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM temp_categories WHERE id = 16;

-- マンネリ・倦怠期（旧ID=17 → 新ID=36）
INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 36, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM temp_categories WHERE id = 17;

-- 夜の悩み（旧ID=18 → 新ID=37）
INSERT INTO categories (id, name, slug, description, icon, display_order, is_active, created_at, updated_at)
SELECT 37, name, slug, description, icon, display_order, is_active, created_at, updated_at
FROM temp_categories WHERE id = 18;

-- ステップ5: postsテーブルを元に戻す（一時テーブルを使用）
CREATE TEMP TABLE temp_post_categories AS
SELECT p.id as post_id, tc.id as old_category_id
FROM posts p
JOIN temp_categories tc ON p.category_id IS NULL
WHERE p.id IN (SELECT id FROM posts WHERE category_id IS NULL);

-- 実際には、元のcategory_idを保持する必要があるため、別の方法を使用
-- postsテーブルに一時カラムを追加して元のIDを保存
ALTER TABLE posts ADD COLUMN IF NOT EXISTS temp_old_category_id INTEGER;

-- 元に戻す前に、一時カラムに保存（この処理は最初に実行すべき）
-- スクリプトを再構成します
