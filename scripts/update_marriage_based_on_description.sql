-- ユーザーの自己紹介文や属性に基づいて恋愛ステータスを設定

-- Step 1: 既存の not_specified を NULL に変更
UPDATE public.users SET marriage = NULL WHERE marriage = 'not_specified';

-- Step 2: widowed を other に変更
UPDATE public.users SET marriage = 'other' WHERE marriage = 'widowed';

-- Step 3: 自己紹介文に「結婚」が含まれるユーザーは既婚に
UPDATE public.users 
SET marriage = 'married' 
WHERE marriage IS NULL 
AND (user_description LIKE '%結婚%' OR user_description LIKE '%夫婦%' OR user_description LIKE '%既婚%');

-- Step 4: 自己紹介文に「婚活」「元カレ」「復縁」が含まれるユーザーは独身に
UPDATE public.users 
SET marriage = 'single' 
WHERE marriage IS NULL 
AND (user_description LIKE '%婚活%' OR user_description LIKE '%元カレ%' OR user_description LIKE '%復縁%' OR user_description LIKE '%片思い%');

-- Step 5: 自己紹介文に「彼氏」「彼女」「恋人」が含まれるユーザーは交際中に
UPDATE public.users 
SET marriage = 'dating' 
WHERE marriage IS NULL 
AND (user_description LIKE '%彼氏%' OR user_description LIKE '%彼女%' OR user_description LIKE '%恋人%' OR user_description LIKE '%遠距離恋愛中%');

-- Step 6: 子どもがいるユーザーで未設定の場合は既婚に
UPDATE public.users 
SET marriage = 'married' 
WHERE marriage IS NULL 
AND child_count > 0;

-- Step 7: 自己紹介文に「離婚」が含まれるユーザーは離婚経験に
UPDATE public.users 
SET marriage = 'divorced' 
WHERE marriage IS NULL 
AND user_description LIKE '%離婚%';

-- Step 8: ランダムに非公開を設定（残りの約20%）
UPDATE public.users 
SET marriage = 'private' 
WHERE marriage IS NULL 
AND random() < 0.2;

-- Step 9: 残りのユーザーにランダムで恋愛ステータスを設定
UPDATE public.users 
SET marriage = CASE 
  WHEN random() < 0.4 THEN 'single'
  WHEN random() < 0.65 THEN 'dating'
  WHEN random() < 0.85 THEN 'married'
  WHEN random() < 0.95 THEN 'divorced'
  ELSE 'other'
END
WHERE marriage IS NULL;

-- 確認用: 更新後の分布を確認
SELECT marriage, COUNT(*) as count 
FROM public.users 
GROUP BY marriage 
ORDER BY count DESC;
