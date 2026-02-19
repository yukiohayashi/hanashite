-- リモートSupabaseのスキーマをローカルに同期するマイグレーション
-- 実行日: 2025-12-24

-- 1. like_countsテーブルを作成
CREATE TABLE IF NOT EXISTS public.like_counts (
    target_id BIGINT NOT NULL,
    like_type TEXT NOT NULL DEFAULT 'post',
    like_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (target_id, like_type)
);

-- 2. keyword_search_historyテーブルを作成
CREATE TABLE IF NOT EXISTS public.keyword_search_history (
    id BIGSERIAL PRIMARY KEY,
    search_keyword TEXT NOT NULL,
    search_type TEXT,
    result_count INTEGER,
    user_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. likesテーブルにlike_typeカラムを追加（存在しない場合）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'likes' 
        AND column_name = 'like_type'
    ) THEN
        ALTER TABLE public.likes ADD COLUMN like_type TEXT NOT NULL DEFAULT 'post';
    END IF;
END $$;

-- 4. postsテーブルのuser_idをNULL許可に変更
ALTER TABLE public.posts ALTER COLUMN user_id DROP NOT NULL;

-- 5. commentsテーブルのuser_idをNULL許可に変更
ALTER TABLE public.comments ALTER COLUMN user_id DROP NOT NULL;

-- 6. commentsテーブルのpost_idをNULL許可に変更
ALTER TABLE public.comments ALTER COLUMN post_id DROP NOT NULL;

-- 7. vote_choicesテーブルのpost_idをNULL許可に変更（存在する場合）
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'vote_choices' 
        AND column_name = 'post_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.vote_choices ALTER COLUMN post_id DROP NOT NULL;
    END IF;
END $$;

-- 8. vote_historyテーブルのuser_idをNULL許可に変更
ALTER TABLE public.vote_history ALTER COLUMN user_id DROP NOT NULL;

-- 9. favoritesテーブルのuser_idをNULL許可に変更
ALTER TABLE public.favorites ALTER COLUMN user_id DROP NOT NULL;

-- 10. likesテーブルのuser_idをNULL許可に変更
ALTER TABLE public.likes ALTER COLUMN user_id DROP NOT NULL;

-- 11. pointsテーブルのuser_idをNULL許可に変更
ALTER TABLE public.points ALTER COLUMN user_id DROP NOT NULL;

-- 12. インデックスを作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_like_counts_target ON public.like_counts(target_id, like_type);
CREATE INDEX IF NOT EXISTS idx_keyword_search_history_keyword ON public.keyword_search_history(search_keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_search_history_user ON public.keyword_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_type_target ON public.likes(like_type, target_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_post_id ON public.favorites(post_id);

-- 13. RLS（Row Level Security）を無効化（開発環境用）
ALTER TABLE public.like_counts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_search_history DISABLE ROW LEVEL SECURITY;

-- マイグレーション完了
COMMENT ON TABLE public.like_counts IS 'リモートSupabaseから同期: いいね集計テーブル';
COMMENT ON TABLE public.keyword_search_history IS 'リモートSupabaseから同期: キーワード検索履歴テーブル';
