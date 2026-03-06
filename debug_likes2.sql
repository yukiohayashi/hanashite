-- いいね数1以上の投稿を確認
WITH top_liked_posts AS (
  SELECT 
    target_id,
    COUNT(*) as like_count
  FROM likes
  WHERE like_type = 'post'
  GROUP BY target_id
  HAVING COUNT(*) >= 1
  ORDER BY like_count DESC
  LIMIT 3
)
SELECT 
  p.id,
  p.title,
  p.status,
  p.best_answer_id,
  p.user_id,
  tlp.like_count
FROM posts p
INNER JOIN top_liked_posts tlp ON p.id = tlp.target_id
WHERE p.status IN ('publish', 'published')
  AND p.user_id::text != '1'
  AND p.best_answer_id IS NULL
ORDER BY tlp.like_count DESC;
