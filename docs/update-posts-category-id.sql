-- postsテーブルのcategory_idを新しいカテゴリIDに更新
-- カテゴリの並び順が変更されたため、postsのcategory_idを修正

-- 画像から確認できるマッピング:
-- 新ID=1: 運営からのお知らせ (announcement)
-- 新ID=2: 結婚・婚活 (kekkon)
-- 新ID=3: 復縁 (fukuen)
-- 新ID=4: 出会い (deai)
-- 新ID=5: 夫婦 (fufu)
-- 新ID=6: 浮気・不倫 (furin)
-- 新ID=7: デート (date)
-- 新ID=8: セックスレス (sexless)
-- 新ID=9: 格差恋愛 (kakusa)
-- 新ID=10: 職場恋愛 (shokuba)
-- 新ID=11: 性 (sei)
-- 新ID=12: 告白・プロポーズ (kokuhaku)
-- 新ID=13: 離婚 (rikon)
-- 新ID=14: その他 (other)
-- 新ID=15: 浮気 (uwaki)
-- 新ID=16: 遠距離恋愛 (longdistance)
-- 新ID=17: マンネリ・倦怠期 (manneri)
-- 新ID=18: 夜の悩み (yoru)
-- 新ID=19: 片思い (kataomoi)

-- 一時テーブルを作成してマッピングを保存
CREATE TEMP TABLE category_mapping (old_id INT, new_id INT);

INSERT INTO category_mapping (old_id, new_id) VALUES
(1, 19),  -- 片思い
(2, 2),   -- 結婚・婚活
(3, 3),   -- 復縁
(4, 4),   -- 出会い
(5, 5),   -- 夫婦
(6, 6),   -- 浮気・不倫
(7, 7),   -- デート
(8, 8),   -- セックスレス
(9, 9),   -- 格差恋愛
(10, 10), -- 職場恋愛
(11, 11), -- 性
(12, 12), -- 告白・プロポーズ
(13, 13), -- 離婚
(14, 14), -- その他
(15, 15), -- 浮気
(16, 16), -- 遠距離恋愛
(17, 17), -- マンネリ・倦怠期
(18, 18), -- 夜の悩み
(19, 1);  -- 運営からのお知らせ

-- postsテーブルに一時カラムを追加
ALTER TABLE posts ADD COLUMN IF NOT EXISTS temp_new_category_id INT;

-- 新しいcategory_idを一時カラムに設定
UPDATE posts p
SET temp_new_category_id = cm.new_id
FROM category_mapping cm
WHERE p.category_id = cm.old_id;

-- 一時カラムから本カラムに移動
UPDATE posts
SET category_id = temp_new_category_id
WHERE temp_new_category_id IS NOT NULL;

-- 一時カラムを削除
ALTER TABLE posts DROP COLUMN temp_new_category_id;

-- 確認
SELECT category_id, COUNT(*) as post_count
FROM posts
WHERE category_id IS NOT NULL
GROUP BY category_id
ORDER BY category_id;
