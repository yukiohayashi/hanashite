-- imageカラムのデータをuser_img_urlにコピー（user_img_urlがNULLの場合のみ）
UPDATE users 
SET user_img_url = image 
WHERE user_img_url IS NULL AND image IS NOT NULL;

-- その後、imageカラムを削除
ALTER TABLE users DROP COLUMN image;