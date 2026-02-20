-- postsテーブルに不足しているカラムを追加

ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS total_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS source_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS auto_created BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS og_title VARCHAR(500),
ADD COLUMN IF NOT EXISTS og_description TEXT,
ADD COLUMN IF NOT EXISTS og_image VARCHAR(500),
ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS workid INTEGER,
ADD COLUMN IF NOT EXISTS is_closed BOOLEAN NOT NULL DEFAULT false;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_posts_is_closed ON posts(is_closed);
CREATE INDEX IF NOT EXISTS idx_posts_open_deadline ON posts(is_closed, deadline_at) WHERE is_closed = false AND deadline_at IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_source_url ON posts(source_url) WHERE source_url IS NOT NULL;
