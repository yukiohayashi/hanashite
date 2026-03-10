-- DiceBear使用中のavatar_seedをローカルアバターにランダム変換
-- avatar_seedがuser-XXXX、emoji-XX、avn-Xなどの形式のものをローカルアバターに変換

-- 女性20代アバター (f20_01 ~ f20_30)
UPDATE users 
SET avatar_seed = 'f20_' || LPAD((FLOOR(RANDOM() * 30) + 1)::TEXT, 2, '0')
WHERE avatar_seed IS NOT NULL 
  AND NOT (
    avatar_seed LIKE 'f20_%' OR avatar_seed LIKE 'f30_%' OR avatar_seed LIKE 'f40_%' OR
    avatar_seed LIKE 'm20_%' OR avatar_seed LIKE 'm30_%' OR avatar_seed LIKE 'm40_%' OR
    avatar_seed LIKE 'cat_%' OR avatar_seed LIKE 'dog_%' OR avatar_seed LIKE 'rabbit_%' OR
    avatar_seed LIKE 'bear_%' OR avatar_seed LIKE 'other_%'
  )
  AND (sex = 'female' OR sex IS NULL)
  AND (birth_year IS NULL OR (EXTRACT(YEAR FROM NOW()) - birth_year) < 30);

-- 女性30代アバター (f30_01 ~ f30_30)
UPDATE users 
SET avatar_seed = 'f30_' || LPAD((FLOOR(RANDOM() * 30) + 1)::TEXT, 2, '0')
WHERE avatar_seed IS NOT NULL 
  AND NOT (
    avatar_seed LIKE 'f20_%' OR avatar_seed LIKE 'f30_%' OR avatar_seed LIKE 'f40_%' OR
    avatar_seed LIKE 'm20_%' OR avatar_seed LIKE 'm30_%' OR avatar_seed LIKE 'm40_%' OR
    avatar_seed LIKE 'cat_%' OR avatar_seed LIKE 'dog_%' OR avatar_seed LIKE 'rabbit_%' OR
    avatar_seed LIKE 'bear_%' OR avatar_seed LIKE 'other_%'
  )
  AND sex = 'female'
  AND birth_year IS NOT NULL 
  AND (EXTRACT(YEAR FROM NOW()) - birth_year) >= 30 
  AND (EXTRACT(YEAR FROM NOW()) - birth_year) < 40;

-- 女性40代アバター (f40_01 ~ f40_30)
UPDATE users 
SET avatar_seed = 'f40_' || LPAD((FLOOR(RANDOM() * 30) + 1)::TEXT, 2, '0')
WHERE avatar_seed IS NOT NULL 
  AND NOT (
    avatar_seed LIKE 'f20_%' OR avatar_seed LIKE 'f30_%' OR avatar_seed LIKE 'f40_%' OR
    avatar_seed LIKE 'm20_%' OR avatar_seed LIKE 'm30_%' OR avatar_seed LIKE 'm40_%' OR
    avatar_seed LIKE 'cat_%' OR avatar_seed LIKE 'dog_%' OR avatar_seed LIKE 'rabbit_%' OR
    avatar_seed LIKE 'bear_%' OR avatar_seed LIKE 'other_%'
  )
  AND sex = 'female'
  AND birth_year IS NOT NULL 
  AND (EXTRACT(YEAR FROM NOW()) - birth_year) >= 40;

-- 男性20代アバター (m20_01 ~ m20_30)
UPDATE users 
SET avatar_seed = 'm20_' || LPAD((FLOOR(RANDOM() * 30) + 1)::TEXT, 2, '0')
WHERE avatar_seed IS NOT NULL 
  AND NOT (
    avatar_seed LIKE 'f20_%' OR avatar_seed LIKE 'f30_%' OR avatar_seed LIKE 'f40_%' OR
    avatar_seed LIKE 'm20_%' OR avatar_seed LIKE 'm30_%' OR avatar_seed LIKE 'm40_%' OR
    avatar_seed LIKE 'cat_%' OR avatar_seed LIKE 'dog_%' OR avatar_seed LIKE 'rabbit_%' OR
    avatar_seed LIKE 'bear_%' OR avatar_seed LIKE 'other_%'
  )
  AND sex = 'male'
  AND (birth_year IS NULL OR (EXTRACT(YEAR FROM NOW()) - birth_year) < 30);

-- 男性30代アバター (m30_01 ~ m30_30)
UPDATE users 
SET avatar_seed = 'm30_' || LPAD((FLOOR(RANDOM() * 30) + 1)::TEXT, 2, '0')
WHERE avatar_seed IS NOT NULL 
  AND NOT (
    avatar_seed LIKE 'f20_%' OR avatar_seed LIKE 'f30_%' OR avatar_seed LIKE 'f40_%' OR
    avatar_seed LIKE 'm20_%' OR avatar_seed LIKE 'm30_%' OR avatar_seed LIKE 'm40_%' OR
    avatar_seed LIKE 'cat_%' OR avatar_seed LIKE 'dog_%' OR avatar_seed LIKE 'rabbit_%' OR
    avatar_seed LIKE 'bear_%' OR avatar_seed LIKE 'other_%'
  )
  AND sex = 'male'
  AND birth_year IS NOT NULL 
  AND (EXTRACT(YEAR FROM NOW()) - birth_year) >= 30 
  AND (EXTRACT(YEAR FROM NOW()) - birth_year) < 40;

-- 男性40代アバター (m40_01 ~ m40_30)
UPDATE users 
SET avatar_seed = 'm40_' || LPAD((FLOOR(RANDOM() * 30) + 1)::TEXT, 2, '0')
WHERE avatar_seed IS NOT NULL 
  AND NOT (
    avatar_seed LIKE 'f20_%' OR avatar_seed LIKE 'f30_%' OR avatar_seed LIKE 'f40_%' OR
    avatar_seed LIKE 'm20_%' OR avatar_seed LIKE 'm30_%' OR avatar_seed LIKE 'm40_%' OR
    avatar_seed LIKE 'cat_%' OR avatar_seed LIKE 'dog_%' OR avatar_seed LIKE 'rabbit_%' OR
    avatar_seed LIKE 'bear_%' OR avatar_seed LIKE 'other_%'
  )
  AND sex = 'male'
  AND birth_year IS NOT NULL 
  AND (EXTRACT(YEAR FROM NOW()) - birth_year) >= 40;

-- avatar_styleカラムを削除
ALTER TABLE users DROP COLUMN IF EXISTS avatar_style;
