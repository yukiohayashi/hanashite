-- =============================================
-- HANASHITE 初期スキーマ
-- ANKEのテーブル構造をそのままコピー
-- =============================================

-- =============================================
-- 1. users テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  email_verified TIMESTAMP WITH TIME ZONE,
  status INTEGER DEFAULT 0,
  is_banned BOOLEAN DEFAULT false,
  user_pass TEXT,
  user_nicename TEXT,
  image TEXT,
  worker_img_url TEXT,
  profile_slug TEXT,
  user_description TEXT,
  prefecture TEXT,
  birth_year INTEGER,
  sex TEXT,
  participate_points INTEGER DEFAULT 0,
  child_count INTEGER DEFAULT 0,
  marriage TEXT,
  job TEXT,
  sei TEXT,
  mei TEXT,
  kana_sei TEXT,
  kana_mei TEXT,
  email_subscription INTEGER DEFAULT 0,
  interest_categories TEXT,
  profile_registered INTEGER DEFAULT 0,
  sns_x TEXT,
  profile_slug_updated_at TIMESTAMP WITH TIME ZONE,
  reset_token TEXT,
  reset_token_expiry TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- =============================================
-- 2. accounts テーブル (NextAuth.js)
-- =============================================
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

-- =============================================
-- 3. sessions テーブル (NextAuth.js)
-- =============================================
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  session_token TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL
);

-- =============================================
-- 4. categories テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(100),
  parent_id BIGINT REFERENCES categories(id),
  display_order INTEGER,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 5. workers テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS workers (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  content TEXT,
  user_id BIGINT,
  status VARCHAR(20) DEFAULT 'published',
  vote_per_price INTEGER DEFAULT 10,
  vote_budget INTEGER DEFAULT 0,
  guest_check BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workers_user_id ON workers(user_id);
CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
CREATE INDEX IF NOT EXISTS idx_workers_created_at ON workers(created_at DESC);

-- =============================================
-- 6. posts テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT,
  status VARCHAR(20) DEFAULT 'published',
  view_count INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  source_url VARCHAR(500),
  auto_created BOOLEAN DEFAULT false,
  og_title VARCHAR(500),
  og_description TEXT,
  og_image VARCHAR(500),
  thumbnail_url VARCHAR(500),
  workid INTEGER REFERENCES workers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_source_url ON posts(source_url) WHERE source_url IS NOT NULL;

-- =============================================
-- 7. vote_choices テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS vote_choices (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
  choice VARCHAR(500) NOT NULL,
  vote_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_vote_choices_post_id ON vote_choices(post_id);

-- =============================================
-- 8. vote_options テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS vote_options (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
  random BOOLEAN DEFAULT false,
  multi BOOLEAN DEFAULT false,
  close_at TIMESTAMP WITH TIME ZONE,
  vote_sum INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 9. vote_history テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS vote_history (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
  choice_id BIGINT REFERENCES vote_choices(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  ip_address INET,
  session_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vote_history_post_id ON vote_history(post_id);
CREATE INDEX IF NOT EXISTS idx_vote_history_user_id ON vote_history(user_id);

-- =============================================
-- 10. comments テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
  parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'published',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);

-- =============================================
-- 11. keywords テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS keywords (
  id BIGSERIAL PRIMARY KEY,
  keyword VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  keyword_type VARCHAR(50),
  parent_id BIGINT REFERENCES keywords(id),
  display_order INTEGER,
  is_featured BOOLEAN DEFAULT false,
  post_count INTEGER DEFAULT 0,
  search_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 12. post_keywords テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS post_keywords (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
  keyword_id BIGINT REFERENCES keywords(id) ON DELETE CASCADE,
  UNIQUE(post_id, keyword_id)
);

-- =============================================
-- 13. points テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS points (
  id BIGSERIAL PRIMARY KEY,
  points INTEGER,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT REFERENCES users(id),
  amount INTEGER,
  type VARCHAR(50),
  description TEXT,
  related_id BIGINT
);

CREATE INDEX IF NOT EXISTS idx_points_user_id ON points(user_id);
CREATE INDEX IF NOT EXISTS idx_points_type ON points(type);

-- =============================================
-- 14. point_settings テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS point_settings (
  id BIGSERIAL PRIMARY KEY,
  point_type VARCHAR(50) NOT NULL UNIQUE,
  point_value INTEGER NOT NULL,
  label VARCHAR(100),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 15. notifications テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  type VARCHAR(50),
  title VARCHAR(255),
  message TEXT,
  link VARCHAR(500),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- =============================================
-- 16. keyword_search_history テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS keyword_search_history (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT,
  search_keyword VARCHAR(255),
  search_type VARCHAR(50),
  result_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keyword_search_history_user_id ON keyword_search_history(user_id);

-- =============================================
-- 17. likes テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS likes (
  id BIGSERIAL PRIMARY KEY,
  like_type VARCHAR(50),
  target_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_target_id ON likes(target_id);

-- =============================================
-- 18. like_counts テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS like_counts (
  target_id BIGINT PRIMARY KEY,
  like_type VARCHAR(50),
  like_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 19. favorites テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS favorites (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_post_id ON favorites(post_id);

-- =============================================
-- 20. ng_words テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS ng_words (
  id BIGSERIAL PRIMARY KEY,
  word VARCHAR(255) NOT NULL,
  word_type VARCHAR(50),
  severity INTEGER,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 21. auto_creator_settings テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS auto_creator_settings (
  id BIGSERIAL PRIMARY KEY,
  is_active BOOLEAN DEFAULT false,
  interval_minutes INTEGER DEFAULT 60,
  prompt_template TEXT,
  category_id BIGINT REFERENCES categories(id),
  user_id TEXT REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 22. auto_creator_logs テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS auto_creator_logs (
  id BIGSERIAL PRIMARY KEY,
  status VARCHAR(20) NOT NULL,
  post_id BIGINT REFERENCES posts(id),
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 23. auto_creator_processed テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS auto_creator_processed (
  id BIGSERIAL PRIMARY KEY,
  url VARCHAR(500) NOT NULL UNIQUE,
  title VARCHAR(500),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 24. auto_voter_settings テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS auto_voter_settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 25. auto_voter_logs テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS auto_voter_logs (
  id BIGSERIAL PRIMARY KEY,
  execution_type VARCHAR(50),
  status VARCHAR(20) NOT NULL,
  action_type VARCHAR(50),
  post_id BIGINT,
  user_id TEXT,
  message TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 26. auto_tagger_logs テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS auto_tagger_logs (
  id BIGSERIAL PRIMARY KEY,
  status VARCHAR(20) NOT NULL,
  post_id BIGINT REFERENCES posts(id),
  message TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 27. mail_settings テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS mail_settings (
  id BIGSERIAL PRIMARY KEY,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_user TEXT,
  smtp_pass TEXT,
  use_ssl BOOLEAN DEFAULT true,
  from_email TEXT,
  from_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 28. mail_templates テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS mail_templates (
  id BIGSERIAL PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  subject TEXT,
  body TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT
);

-- =============================================
-- 29. mail_logs テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS mail_logs (
  id BIGSERIAL PRIMARY KEY,
  template_key VARCHAR(100),
  to_email TEXT,
  from_email TEXT,
  subject TEXT,
  body TEXT,
  status VARCHAR(20),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 30. api_settings テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS api_settings (
  id BIGSERIAL PRIMARY KEY,
  api_name VARCHAR(100) NOT NULL,
  api_key TEXT,
  api_secret TEXT,
  endpoint_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 31. backup_logs テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS backup_logs (
  id BIGSERIAL PRIMARY KEY,
  status VARCHAR(20),
  message TEXT,
  error_message TEXT,
  file_path VARCHAR(500),
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 32. points_aggregate_logs テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS points_aggregate_logs (
  id BIGSERIAL PRIMARY KEY,
  status VARCHAR(50),
  message TEXT,
  error_message TEXT,
  users_processed INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_points_aggregate_logs_created_at ON points_aggregate_logs(created_at DESC);
