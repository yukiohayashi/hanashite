-- ユーザーの恋愛ステータスを設定
-- 自己紹介文や属性に基づいて適切な値を設定し、一部は非公開（private）にする

-- まず既存の not_specified を NULL に変更
UPDATE public.users SET marriage = NULL WHERE marriage = 'not_specified';

-- widowed を other に変更
UPDATE public.users SET marriage = 'other' WHERE marriage = 'widowed';

-- ユーザーID 1: ハナシテ運営スタッフ → 既婚
UPDATE public.users SET marriage = 'married' WHERE id = '1';

-- 以下、ユーザーの属性や自己紹介文に基づいて設定
-- ※ 実際のデータを確認してから、適切な値を設定してください

-- 例: 20代女性 → 独身・恋人なし
-- UPDATE public.users SET marriage = 'single' WHERE id = '2';

-- 例: 30代女性で子どもがいる → 既婚
-- UPDATE public.users SET marriage = 'married' WHERE id = '3' AND child_count > 0;

-- 例: 40代女性 → 離婚経験
-- UPDATE public.users SET marriage = 'divorced' WHERE id = '4';

-- 例: プライバシーを重視するユーザー → 非公開
-- UPDATE public.users SET marriage = 'private' WHERE id = '5';

-- 例: 恋愛中のユーザー → 交際中
-- UPDATE public.users SET marriage = 'dating' WHERE id = '6';

-- ランダムに非公開を設定（全体の20%程度）
-- UPDATE public.users 
-- SET marriage = 'private' 
-- WHERE marriage IS NULL 
-- AND random() < 0.2;

-- 残りのユーザーにランダムで恋愛ステータスを設定
-- UPDATE public.users 
-- SET marriage = CASE 
--   WHEN random() < 0.3 THEN 'single'
--   WHEN random() < 0.5 THEN 'dating'
--   WHEN random() < 0.7 THEN 'married'
--   WHEN random() < 0.9 THEN 'divorced'
--   ELSE 'other'
-- END
-- WHERE marriage IS NULL;
