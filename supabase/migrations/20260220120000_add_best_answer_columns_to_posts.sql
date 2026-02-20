-- postsテーブルにbest_answer_idとbest_answer_selected_atカラムを追加

ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS best_answer_id BIGINT REFERENCES comments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS best_answer_selected_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_posts_best_answer_id ON posts(best_answer_id);
