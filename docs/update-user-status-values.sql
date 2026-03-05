-- ユーザーステータス値を変更するSQLスクリプト
-- 新しいステータス値:
-- 1 = 運営者（旧3）
-- 2 = 編集者（変更なし）
-- 3 = 会員（旧1）
-- 4 = AI会員（旧6）
-- 9 = 停止（変更なし）

-- ステップ1: 一時的に既存のステータスを負の値に変更（衝突を避けるため）
UPDATE users SET status = -1 WHERE status = 1; -- 会員を一時的に-1に
UPDATE users SET status = -3 WHERE status = 3; -- 運営者を一時的に-3に
UPDATE users SET status = -6 WHERE status = 6; -- AI会員を一時的に-6に

-- ステップ2: 新しいステータス値に変更
UPDATE users SET status = 3 WHERE status = -1; -- 会員を1から3に
UPDATE users SET status = 1 WHERE status = -3; -- 運営者を3から1に
UPDATE users SET status = 4 WHERE status = -6; -- AI会員を6から4に

-- ステップ3: 確認
SELECT status, COUNT(*) as count FROM users GROUP BY status ORDER BY status;
