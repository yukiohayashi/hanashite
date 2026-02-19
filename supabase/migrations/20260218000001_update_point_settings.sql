-- ポイント設定の更新: 不要な項目を削除し、ベストアンサーポイントを追加

-- 1. 不要な項目を削除（一般投票、アンケワークス投稿、アンケワークス投票）
DELETE FROM point_settings WHERE point_type IN ('vote', 'work_post', 'work_vote');

-- 2. 既存のポイント設定を全て0に更新
UPDATE point_settings SET point_value = 0, updated_at = NOW();

-- 3. ベストアンサーポイントを追加（既存の場合は何もしない）
INSERT INTO point_settings (point_type, point_value, label, description, is_active, display_order, created_at, updated_at)
SELECT 'best_answer', 10, 'ベストアンサー', 'ベストアンサーに選ばれた時に付与されるポイント', TRUE, 10, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM point_settings WHERE point_type = 'best_answer'
);
