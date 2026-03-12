-- 既存ユーザーのmarriage状態を確認
SELECT 
  id, 
  name, 
  user_description,
  marriage,
  sex,
  birth_year,
  child_count
FROM public.users 
ORDER BY created_at
LIMIT 20;
