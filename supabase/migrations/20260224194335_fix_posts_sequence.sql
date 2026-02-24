-- postsテーブルのIDシーケンスを最大ID+1にリセット
SELECT setval('posts_id_seq', COALESCE((SELECT MAX(id) FROM posts), 0) + 1, false);
