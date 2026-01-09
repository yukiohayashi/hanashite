-- pointsテーブルのIDシーケンスをリセット
-- Supabaseのダッシュボード > SQL Editor で実行してください

SELECT setval('points_id_seq', (SELECT MAX(id) FROM points));

-- 実行後、以下のクエリで確認
SELECT last_value FROM points_id_seq;
