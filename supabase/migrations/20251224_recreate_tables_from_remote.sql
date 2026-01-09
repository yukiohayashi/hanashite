-- リモートSupabaseのスキーマを完全に再現するマイグレーション
-- 実行日: 2025-12-24

-- 既存テーブルを削除（外部キー制約を考慮した順序）
DROP TABLE IF EXISTS public.vote_history CASCADE;
DROP TABLE IF EXISTS public.vote_options CASCADE;
DROP TABLE IF EXISTS public.vote_choices CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.favorites CASCADE;
DROP TABLE IF EXISTS public.likes CASCADE;
DROP TABLE IF EXISTS public.like_counts CASCADE;
DROP TABLE IF EXISTS public.points CASCADE;
DROP TABLE IF EXISTS public.keyword_search_history CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.keywords CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.accounts CASCADE;
DROP TABLE IF EXISTS public.verification_tokens CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 1. usersテーブル（NextAuth.js用）
CREATE TABLE public.users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    email_verified TIMESTAMPTZ,
    image TEXT,
    status INTEGER DEFAULT 0,
    is_banned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. postsテーブル
CREATE TABLE public.posts (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    status VARCHAR(20) DEFAULT 'published',
    view_count INTEGER DEFAULT 0,
    source_url VARCHAR(500),
    auto_created BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    og_title VARCHAR(500),
    og_description TEXT,
    og_image VARCHAR(500),
    thumbnail_url VARCHAR(500),
    user_id TEXT
);

-- 3. commentsテーブル
CREATE TABLE public.comments (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT,
    parent_id BIGINT,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id TEXT
);

-- 4. vote_optionsテーブル
CREATE TABLE public.vote_options (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT,
    random BOOLEAN DEFAULT false,
    multi BOOLEAN DEFAULT false,
    close_at TIMESTAMPTZ,
    vote_sum INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE
);

-- 5. vote_choicesテーブル
CREATE TABLE public.vote_choices (
    id BIGINT PRIMARY KEY,
    post_id BIGINT NOT NULL,
    choice VARCHAR(500) NOT NULL,
    vote_count INTEGER DEFAULT 0
);

-- 6. vote_historyテーブル
CREATE TABLE public.vote_history (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT,
    choice_id BIGINT,
    ip_address INET,
    session_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id TEXT,
    FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE
);

-- 7. favoritesテーブル
CREATE TABLE public.favorites (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT
);

-- 8. likesテーブル
CREATE TABLE public.likes (
    id BIGSERIAL PRIMARY KEY,
    like_type VARCHAR(50) NOT NULL,
    target_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id TEXT
);

-- 9. like_countsテーブル
CREATE TABLE public.like_counts (
    target_id BIGINT PRIMARY KEY,
    like_type VARCHAR(50) DEFAULT 'post',
    like_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. pointsテーブル
CREATE TABLE public.points (
    id BIGSERIAL PRIMARY KEY,
    points INTEGER NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id TEXT
);

-- 11. keywordsテーブル
CREATE TABLE public.keywords (
    id BIGSERIAL PRIMARY KEY,
    keyword VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    keyword_type VARCHAR(50) DEFAULT 'tag',
    parent_id BIGINT,
    display_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    post_count INTEGER DEFAULT 0,
    search_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (parent_id) REFERENCES public.keywords(id) ON DELETE SET NULL
);

-- 12. keyword_search_historyテーブル
CREATE TABLE public.keyword_search_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    search_keyword VARCHAR(255) NOT NULL,
    search_type VARCHAR(50) DEFAULT 'all',
    result_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. accountsテーブル
CREATE TABLE public.accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- 14. sessionsテーブル
CREATE TABLE public.sessions (
    id TEXT PRIMARY KEY,
    session_token TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    expires TIMESTAMPTZ NOT NULL,
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- 15. verification_tokensテーブル
CREATE TABLE public.verification_tokens (
    identifier TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires TIMESTAMPTZ NOT NULL
);

-- インデックスを作成（パフォーマンス向上）
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_status ON public.users(status);

CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_posts_status ON public.posts(status);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);

CREATE INDEX idx_comments_post_id ON public.comments(post_id);
CREATE INDEX idx_comments_user_id ON public.comments(user_id);
CREATE INDEX idx_comments_created_at ON public.comments(created_at DESC);

CREATE INDEX idx_vote_options_post_id ON public.vote_options(post_id);
CREATE INDEX idx_vote_choices_post_id ON public.vote_choices(post_id);
CREATE INDEX idx_vote_history_post_id ON public.vote_history(post_id);
CREATE INDEX idx_vote_history_user_id ON public.vote_history(user_id);

CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_post_id ON public.favorites(post_id);

CREATE INDEX idx_likes_type_target ON public.likes(like_type, target_id);
CREATE INDEX idx_likes_user_id ON public.likes(user_id);

CREATE INDEX idx_like_counts_type ON public.like_counts(like_type);

CREATE INDEX idx_keywords_slug ON public.keywords(slug);
CREATE INDEX idx_keywords_type ON public.keywords(keyword_type);
CREATE INDEX idx_keywords_parent ON public.keywords(parent_id);

CREATE INDEX idx_keyword_search_history_keyword ON public.keyword_search_history(search_keyword);
CREATE INDEX idx_keyword_search_history_user ON public.keyword_search_history(user_id);

-- RLS（Row Level Security）を無効化（開発環境用）
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_choices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.like_counts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.points DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.keywords DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_search_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_tokens DISABLE ROW LEVEL SECURITY;

-- マイグレーション完了
COMMENT ON TABLE public.posts IS 'リモートSupabaseから完全再現: 投稿テーブル';
COMMENT ON TABLE public.comments IS 'リモートSupabaseから完全再現: コメントテーブル';
COMMENT ON TABLE public.likes IS 'リモートSupabaseから完全再現: いいねテーブル';
COMMENT ON TABLE public.like_counts IS 'リモートSupabaseから完全再現: いいね集計テーブル';
COMMENT ON TABLE public.keyword_search_history IS 'リモートSupabaseから完全再現: キーワード検索履歴テーブル';
