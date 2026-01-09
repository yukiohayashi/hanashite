-- Create workers table for アンケワークス (survey work requests)
CREATE TABLE workers (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  content TEXT,
  user_id BIGINT,
  status VARCHAR(20) DEFAULT 'published',
  
  -- Worker-specific fields
  vote_per_price INTEGER DEFAULT 10,  -- Points per vote
  vote_budget INTEGER DEFAULT 0,      -- Remaining budget in points
  guest_check BOOLEAN DEFAULT false,  -- Allow guest voting
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_workers_status ON workers(status);
CREATE INDEX idx_workers_user_id ON workers(user_id);
CREATE INDEX idx_workers_created_at ON workers(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE workers IS 'アンケワークス依頼投稿テーブル';
COMMENT ON COLUMN workers.vote_per_price IS '1票あたりの報酬ポイント';
COMMENT ON COLUMN workers.vote_budget IS '残予算（ポイント）';
COMMENT ON COLUMN workers.guest_check IS 'ゲストユーザーの投票を許可するか';
