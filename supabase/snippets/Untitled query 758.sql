-- postsテーブルにworkidカラムを追加
ALTER TABLE posts ADD COLUMN IF NOT EXISTS workid INTEGER;

-- workidにインデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_posts_workid ON posts(workid);

-- workersテーブルとの外部キー制約を追加（オプション）
ALTER TABLE posts 
ADD CONSTRAINT fk_posts_workid 
FOREIGN KEY (workid) REFERENCES workers(id) 
ON DELETE SET NULL;