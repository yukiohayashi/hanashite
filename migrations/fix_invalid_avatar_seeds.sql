-- ============================================================
-- 不正なavatar_seed値の修正SQL
-- ============================================================
-- 実行前に必ずSupabase管理画面のSQL Editorで確認してください
-- ============================================================

-- ステップ1: 存在しないavatar_seed値を確認
SELECT id, name, sex, birth_year, avatar_seed, use_custom_image
FROM users
WHERE avatar_seed IS NOT NULL
  AND use_custom_image = false
  AND avatar_seed NOT IN (
    -- 女性アバター (存在する)
    'f20_01', 'f20_02', 'f20_03', 'f20_04', 'f20_05', 'f20_06', 'f20_07', 'f20_08', 'f20_09', 'f20_10',
    'f30_01', 'f30_02', 'f30_03', 'f30_04', 'f30_05', 'f30_06', 'f30_07', 'f30_08', 'f30_09', 'f30_10',
    'f40_01', 'f40_02', 'f40_03', 'f40_04', 'f40_05', 'f40_06', 'f40_07', 'f40_08', 'f40_09', 'f40_10',
    -- 動物アバター (存在する)
    'cat_01', 'cat_02', 'cat_03', 'cat_04', 'cat_05', 'cat_06', 'cat_07', 'cat_08', 'cat_09', 'cat_10',
    'dog_01', 'dog_02', 'dog_03', 'dog_04', 'dog_05', 'dog_06', 'dog_07', 'dog_08',
    'rabbit_01', 'rabbit_02', 'rabbit_03', 'rabbit_04',
    'bear_01', 'bear_02', 'bear_03', 'bear_04',
    'other_01', 'other_02', 'other_03', 'other_04'
  )
ORDER BY id;

-- ステップ2: 女性ユーザーに男性アバター(m20_, m30_, m40_)が割り当てられているケースを確認
SELECT id, name, sex, birth_year, avatar_seed
FROM users
WHERE sex = 'female'
  AND use_custom_image = false
  AND avatar_seed LIKE 'm%'
ORDER BY id;

-- ============================================================
-- 修正SQL
-- ============================================================

-- 修正1: 存在しないavatar_seed値をランダムに修正
-- 女性ユーザーの場合
UPDATE users
SET avatar_seed = CASE 
  -- 20代女性
  WHEN sex = 'female' AND EXTRACT(YEAR FROM CURRENT_DATE) - CAST(birth_year AS INTEGER) BETWEEN 20 AND 29 THEN
    'f20_' || LPAD((FLOOR(RANDOM() * 10) + 1)::TEXT, 2, '0')
  -- 30代女性
  WHEN sex = 'female' AND EXTRACT(YEAR FROM CURRENT_DATE) - CAST(birth_year AS INTEGER) BETWEEN 30 AND 39 THEN
    'f30_' || LPAD((FLOOR(RANDOM() * 10) + 1)::TEXT, 2, '0')
  -- 40代以上の女性
  WHEN sex = 'female' AND EXTRACT(YEAR FROM CURRENT_DATE) - CAST(birth_year AS INTEGER) >= 40 THEN
    'f40_' || LPAD((FLOOR(RANDOM() * 10) + 1)::TEXT, 2, '0')
  -- 性別不明または動物アバターを希望する場合
  ELSE
    CASE (FLOOR(RANDOM() * 4))::INTEGER
      WHEN 0 THEN 'cat_' || LPAD((FLOOR(RANDOM() * 10) + 1)::TEXT, 2, '0')
      WHEN 1 THEN 'dog_' || LPAD((FLOOR(RANDOM() * 8) + 1)::TEXT, 2, '0')
      WHEN 2 THEN 'rabbit_' || LPAD((FLOOR(RANDOM() * 4) + 1)::TEXT, 2, '0')
      ELSE 'bear_' || LPAD((FLOOR(RANDOM() * 4) + 1)::TEXT, 2, '0')
    END
END
WHERE use_custom_image = false
  AND avatar_seed IS NOT NULL
  AND avatar_seed NOT IN (
    'f20_01', 'f20_02', 'f20_03', 'f20_04', 'f20_05', 'f20_06', 'f20_07', 'f20_08', 'f20_09', 'f20_10',
    'f30_01', 'f30_02', 'f30_03', 'f30_04', 'f30_05', 'f30_06', 'f30_07', 'f30_08', 'f30_09', 'f30_10',
    'f40_01', 'f40_02', 'f40_03', 'f40_04', 'f40_05', 'f40_06', 'f40_07', 'f40_08', 'f40_09', 'f40_10',
    'cat_01', 'cat_02', 'cat_03', 'cat_04', 'cat_05', 'cat_06', 'cat_07', 'cat_08', 'cat_09', 'cat_10',
    'dog_01', 'dog_02', 'dog_03', 'dog_04', 'dog_05', 'dog_06', 'dog_07', 'dog_08',
    'rabbit_01', 'rabbit_02', 'rabbit_03', 'rabbit_04',
    'bear_01', 'bear_02', 'bear_03', 'bear_04',
    'other_01', 'other_02', 'other_03', 'other_04'
  );

-- 修正2: 女性ユーザーに男性アバターが割り当てられているケースを修正
UPDATE users
SET avatar_seed = CASE 
  -- 20代女性
  WHEN EXTRACT(YEAR FROM CURRENT_DATE) - CAST(birth_year AS INTEGER) BETWEEN 20 AND 29 THEN
    'f20_' || LPAD((FLOOR(RANDOM() * 10) + 1)::TEXT, 2, '0')
  -- 30代女性
  WHEN EXTRACT(YEAR FROM CURRENT_DATE) - CAST(birth_year AS INTEGER) BETWEEN 30 AND 39 THEN
    'f30_' || LPAD((FLOOR(RANDOM() * 10) + 1)::TEXT, 2, '0')
  -- 40代以上の女性
  WHEN EXTRACT(YEAR FROM CURRENT_DATE) - CAST(birth_year AS INTEGER) >= 40 THEN
    'f40_' || LPAD((FLOOR(RANDOM() * 10) + 1)::TEXT, 2, '0')
  -- 年齢不明の女性は動物アバターに
  ELSE
    CASE (FLOOR(RANDOM() * 4))::INTEGER
      WHEN 0 THEN 'cat_' || LPAD((FLOOR(RANDOM() * 10) + 1)::TEXT, 2, '0')
      WHEN 1 THEN 'dog_' || LPAD((FLOOR(RANDOM() * 8) + 1)::TEXT, 2, '0')
      WHEN 2 THEN 'rabbit_' || LPAD((FLOOR(RANDOM() * 4) + 1)::TEXT, 2, '0')
      ELSE 'bear_' || LPAD((FLOOR(RANDOM() * 4) + 1)::TEXT, 2, '0')
    END
END
WHERE sex = 'female'
  AND use_custom_image = false
  AND avatar_seed LIKE 'm%';

-- ============================================================
-- 検証SQL (修正後に実行)
-- ============================================================

-- 修正後の確認: 存在しないavatar_seed値がないことを確認
SELECT COUNT(*) as invalid_count
FROM users
WHERE avatar_seed IS NOT NULL
  AND use_custom_image = false
  AND avatar_seed NOT IN (
    'f20_01', 'f20_02', 'f20_03', 'f20_04', 'f20_05', 'f20_06', 'f20_07', 'f20_08', 'f20_09', 'f20_10',
    'f30_01', 'f30_02', 'f30_03', 'f30_04', 'f30_05', 'f30_06', 'f30_07', 'f30_08', 'f30_09', 'f30_10',
    'f40_01', 'f40_02', 'f40_03', 'f40_04', 'f40_05', 'f40_06', 'f40_07', 'f40_08', 'f40_09', 'f40_10',
    'cat_01', 'cat_02', 'cat_03', 'cat_04', 'cat_05', 'cat_06', 'cat_07', 'cat_08', 'cat_09', 'cat_10',
    'dog_01', 'dog_02', 'dog_03', 'dog_04', 'dog_05', 'dog_06', 'dog_07', 'dog_08',
    'rabbit_01', 'rabbit_02', 'rabbit_03', 'rabbit_04',
    'bear_01', 'bear_02', 'bear_03', 'bear_04',
    'other_01', 'other_02', 'other_03', 'other_04'
  );
-- 結果が0であればOK

-- 修正後の確認: 女性ユーザーに男性アバターがないことを確認
SELECT COUNT(*) as female_with_male_avatar
FROM users
WHERE sex = 'female'
  AND use_custom_image = false
  AND avatar_seed LIKE 'm%';
-- 結果が0であればOK
