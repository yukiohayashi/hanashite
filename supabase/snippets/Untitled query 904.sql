-- verification_tokensテーブルを作成
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (identifier, token)
);

-- usersテーブルのidカラムにデフォルト値を設定
ALTER TABLE users 
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- メールテンプレートを「ハナシテ」に更新
UPDATE mail_templates
SET
  subject = REPLACE(subject, 'アンケ', 'ハナシテ'),
  body = REPLACE(body, 'アンケ', 'ハナシテ')
WHERE subject LIKE '%アンケ%' OR body LIKE '%アンケ%';