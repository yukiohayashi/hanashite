-- ハナシテ (Hanashite) - usersテーブルにDiceBearアバター用のカラムを追加
-- 作成日: 2026-02-16

-- 1. DiceBearアバター用のカラムを追加
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS avatar_style text NULL DEFAULT 'big-smile',
ADD COLUMN IF NOT EXISTS avatar_seed text NULL,
ADD COLUMN IF NOT EXISTS use_custom_image boolean NULL DEFAULT false;

-- 2. 既存のカスタム画像を持つユーザーは use_custom_image = true に設定
UPDATE users
SET use_custom_image = true,
    avatar_style = 'big-smile'
WHERE user_img_url IS NOT NULL AND use_custom_image IS NULL;

-- 3. カスタム画像を持たないユーザーは use_custom_image = false に設定
UPDATE users
SET use_custom_image = false,
    avatar_style = 'big-smile'
WHERE user_img_url IS NULL AND use_custom_image IS NULL;
