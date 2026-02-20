-- postsテーブルにdeadline_atカラムを追加
ALTER TABLE posts ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMP WITH TIME ZONE;

-- インデックスを追加（締め切りでソートする可能性があるため）
CREATE INDEX IF NOT EXISTS idx_posts_deadline_at ON posts(deadline_at);
