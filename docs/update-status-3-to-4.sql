-- status=3（会員）のユーザーをすべてstatus=4（AI会員）に変更するSQL

UPDATE users SET status = 4 WHERE status = 3;

-- 確認
SELECT status, COUNT(*) as count FROM users GROUP BY status ORDER BY status;
