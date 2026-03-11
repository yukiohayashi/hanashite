-- 既存データのマイグレーション: not_specified → NULL, widowed → other
UPDATE public.users SET marriage = NULL WHERE marriage = 'not_specified';
UPDATE public.users SET marriage = 'other' WHERE marriage = 'widowed';
