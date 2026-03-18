-- ハナシテ 自動相談投稿システム データベースマイグレーション
-- Version: 1.0
-- Last Updated: 2026-03-18

-- ============================================================
-- 1. 既存テーブルの拡張
-- ============================================================

-- 1.1 auto_creator_settings テーブルにカラム追加
ALTER TABLE auto_creator_settings
ADD COLUMN IF NOT EXISTS category_queue JSONB DEFAULT '[]';

ALTER TABLE auto_creator_settings
ADD COLUMN IF NOT EXISTS queue_index INTEGER DEFAULT 0;

ALTER TABLE auto_creator_settings
ADD COLUMN IF NOT EXISTS category_weights JSONB DEFAULT '{}';

ALTER TABLE auto_creator_settings
ADD COLUMN IF NOT EXISTS yahoo_chiebukuro_url TEXT;

ALTER TABLE auto_creator_settings
ADD COLUMN IF NOT EXISTS title_prompt TEXT;

ALTER TABLE auto_creator_settings
ADD COLUMN IF NOT EXISTS content_prompt TEXT;

COMMENT ON COLUMN auto_creator_settings.category_queue IS 'カテゴリウェイトキュー（50件のカテゴリIDと名前の配列）';
COMMENT ON COLUMN auto_creator_settings.queue_index IS '現在のキューインデックス（0-49、50で0にリセット）';
COMMENT ON COLUMN auto_creator_settings.category_weights IS 'カテゴリウェイト設定（JSON）';
COMMENT ON COLUMN auto_creator_settings.yahoo_chiebukuro_url IS 'Yahoo!知恵袋スクレイピング対象URL';
COMMENT ON COLUMN auto_creator_settings.title_prompt IS 'タイトル生成プロンプトテンプレート';
COMMENT ON COLUMN auto_creator_settings.content_prompt IS '本文生成プロンプトテンプレート';

-- ============================================================
-- 2. 新規テーブルの作成
-- ============================================================

-- 2.1 auto_consultation_sources テーブル
-- スクレイピングで取得したソースを一時保存
CREATE TABLE IF NOT EXISTS auto_consultation_sources (
  id SERIAL PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL, -- 'yahoo_chiebukuro', 'google_trends', 'gpt_generated'
  source_url TEXT, -- Yahoo!知恵袋のURL（該当する場合）
  source_title TEXT NOT NULL, -- 取得したタイトルまたはキーワード
  source_content TEXT, -- 取得した本文（該当する場合）
  category_id INTEGER, -- 対応するカテゴリID
  is_processed BOOLEAN DEFAULT FALSE, -- 投稿済みかどうか
  post_id BIGINT, -- 作成された投稿のID
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  CONSTRAINT unique_source_url UNIQUE(source_url)
);

CREATE INDEX IF NOT EXISTS idx_auto_consultation_sources_processed 
ON auto_consultation_sources(is_processed);

CREATE INDEX IF NOT EXISTS idx_auto_consultation_sources_category 
ON auto_consultation_sources(category_id);

CREATE INDEX IF NOT EXISTS idx_auto_consultation_sources_type 
ON auto_consultation_sources(source_type);

COMMENT ON TABLE auto_consultation_sources IS 'スクレイピングで取得した相談ソース（Yahoo!知恵袋、Googleトレンドなど）';
COMMENT ON COLUMN auto_consultation_sources.source_type IS 'ソースタイプ: yahoo_chiebukuro, google_trends, gpt_generated';
COMMENT ON COLUMN auto_consultation_sources.source_url IS 'Yahoo!知恵袋のURL（重複防止用）';
COMMENT ON COLUMN auto_consultation_sources.source_title IS '取得したタイトルまたはキーワード';
COMMENT ON COLUMN auto_consultation_sources.is_processed IS '投稿済みフラグ';

-- 2.2 auto_consultation_logs テーブル
-- 自動投稿の実行ログを記録
CREATE TABLE IF NOT EXISTS auto_consultation_logs (
  id SERIAL PRIMARY KEY,
  execution_time TIMESTAMP DEFAULT NOW(),
  source_type VARCHAR(50), -- 'yahoo_chiebukuro', 'google_trends', 'gpt_generated'
  category_id INTEGER,
  category_name VARCHAR(100),
  post_id INTEGER, -- 生成された投稿ID
  source_id INTEGER, -- auto_consultation_sourcesのID
  title TEXT,
  status VARCHAR(50), -- 'success', 'failed'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_consultation_logs_execution_time 
ON auto_consultation_logs(execution_time);

CREATE INDEX IF NOT EXISTS idx_auto_consultation_logs_status 
ON auto_consultation_logs(status);

CREATE INDEX IF NOT EXISTS idx_auto_consultation_logs_post_id 
ON auto_consultation_logs(post_id);

COMMENT ON TABLE auto_consultation_logs IS '自動相談投稿の実行ログ';
COMMENT ON COLUMN auto_consultation_logs.source_type IS '使用したソースタイプ';
COMMENT ON COLUMN auto_consultation_logs.status IS '実行ステータス: success, failed';
COMMENT ON COLUMN auto_consultation_logs.error_message IS 'エラーメッセージ（失敗時）';

-- 2.3 google_trends_cache テーブル
-- Googleトレンドのキーワードをキャッシュ（API制限対策）
CREATE TABLE IF NOT EXISTS google_trends_cache (
  id SERIAL PRIMARY KEY,
  keyword VARCHAR(255) NOT NULL,
  trend_score INTEGER, -- トレンドスコア（0-100）
  category VARCHAR(100), -- 恋愛関連カテゴリ
  fetched_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- キャッシュ有効期限（24時間）
  CONSTRAINT unique_keyword UNIQUE(keyword)
);

CREATE INDEX IF NOT EXISTS idx_google_trends_cache_expires 
ON google_trends_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_google_trends_cache_category 
ON google_trends_cache(category);

COMMENT ON TABLE google_trends_cache IS 'Googleトレンドキーワードキャッシュ（24時間有効）';
COMMENT ON COLUMN google_trends_cache.trend_score IS 'トレンドスコア（0-100）';
COMMENT ON COLUMN google_trends_cache.expires_at IS 'キャッシュ有効期限（24時間後）';

-- ============================================================
-- 3. 初期データの投入
-- ============================================================

-- 3.1 auto_creator_settingsの初期レコードを作成（存在しない場合）
INSERT INTO auto_creator_settings (
  is_active,
  interval_minutes,
  category_weights,
  yahoo_chiebukuro_url,
  title_prompt,
  content_prompt,
  created_at,
  updated_at
)
SELECT 
  true,
  60,
  '{}'::JSONB,
  'https://chiebukuro.yahoo.co.jp/category/2078297875/question/list',
  'カテゴリ: {{category_name}}
テーマ: {{source_title}}

上記のテーマをもとに、26歳の一人暮らし女性が実際に抱えそうな恋愛の悩みを、
相談掲示板への投稿タイトルとして自然な日本語で生成してください。

要件:
- 30文字以内
- 疑問形または悩み形式
- 具体的で共感しやすい内容
- 「〜について」「〜はどうすればいい？」などの形式

出力形式: タイトルのみを1行で出力',
  'カテゴリ: {{category_name}}
タイトル: {{generated_title}}
テーマ: {{source_title}}

上記のタイトルに合った相談本文を生成してください。

要件:
- 200〜400文字
- 26歳の一人暮らし女性の視点
- 具体的なエピソードを含める
- 自然な日本語の口語体
- 最後に「みなさんはどう思いますか？」などの問いかけで締める

出力形式: 本文のみを出力',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM auto_creator_settings LIMIT 1);

-- 既存レコードがある場合は更新（category_weightsが空の場合のみ）
UPDATE auto_creator_settings
SET 
  category_weights = COALESCE(category_weights, '{}'::JSONB),
  yahoo_chiebukuro_url = 'https://chiebukuro.yahoo.co.jp/category/2078297875/question/list',
  title_prompt = 'カテゴリ: {{category_name}}
テーマ: {{source_title}}

上記のテーマをもとに、26歳の一人暮らし女性が実際に抱えそうな恋愛の悩みを、
相談掲示板への投稿タイトルとして自然な日本語で生成してください。

要件:
- 30文字以内
- 疑問形または悩み形式
- 具体的で共感しやすい内容
- 「〜について」「〜はどうすればいい？」などの形式

出力形式: タイトルのみを1行で出力',
  content_prompt = 'カテゴリ: {{category_name}}
タイトル: {{generated_title}}
テーマ: {{source_title}}

上記のタイトルに合った相談本文を生成してください。

要件:
- 200〜400文字
- 26歳の一人暮らし女性の視点
- 具体的なエピソードを含める
- 自然な日本語の口語体
- 最後に「みなさんはどう思いますか？」などの問いかけで締める

出力形式: 本文のみを出力',
  updated_at = NOW()
WHERE EXISTS (SELECT 1 FROM auto_creator_settings LIMIT 1);

-- ============================================================
-- 4. カテゴリキューの初期化関数
-- ============================================================

-- カテゴリウェイトからキューを生成する関数
CREATE OR REPLACE FUNCTION generate_category_queue()
RETURNS JSONB AS $$
DECLARE
  weights JSONB;
  queue JSONB := '[]'::JSONB;
  category_name TEXT;
  weight INTEGER;
  category_id INTEGER;
  i INTEGER;
BEGIN
  -- カテゴリウェイト設定を取得
  SELECT category_weights INTO weights
  FROM auto_creator_settings
  LIMIT 1;

  -- カテゴリごとにウェイト分だけキューに追加
  FOR category_name, weight IN
    SELECT * FROM jsonb_each_text(weights)
  LOOP
    -- カテゴリ名からカテゴリIDを取得
    SELECT id INTO category_id
    FROM categories
    WHERE name = category_name
    LIMIT 1;

    -- ウェイト分だけキューに追加
    FOR i IN 1..weight LOOP
      queue := queue || jsonb_build_object(
        'category_id', category_id,
        'category_name', category_name
      );
    END LOOP;
  END LOOP;

  RETURN queue;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_category_queue() IS 'カテゴリウェイト設定からキューを生成する関数';

-- ============================================================
-- 5. カテゴリキューの初期化
-- ============================================================

-- カテゴリキューを生成してauto_creator_settingsに保存
UPDATE auto_creator_settings
SET category_queue = generate_category_queue(),
    queue_index = 0;

-- ============================================================
-- 6. ロールバック用スクリプト
-- ============================================================

-- ロールバックが必要な場合は以下のコメントを外して実行
/*
-- テーブル削除
DROP TABLE IF EXISTS google_trends_cache;
DROP TABLE IF EXISTS auto_consultation_logs;
DROP TABLE IF EXISTS auto_consultation_sources;

-- カラム削除
ALTER TABLE auto_creator_settings DROP COLUMN IF EXISTS category_queue;
ALTER TABLE auto_creator_settings DROP COLUMN IF EXISTS queue_index;
ALTER TABLE auto_creator_settings DROP COLUMN IF EXISTS category_weights;
ALTER TABLE auto_creator_settings DROP COLUMN IF EXISTS yahoo_chiebukuro_url;
ALTER TABLE auto_creator_settings DROP COLUMN IF EXISTS title_prompt;
ALTER TABLE auto_creator_settings DROP COLUMN IF EXISTS content_prompt;

-- 関数削除
DROP FUNCTION IF EXISTS generate_category_queue();
*/
