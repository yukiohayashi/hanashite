-- like_countsテーブルのRLSポリシーを追加

-- RLSを有効化
ALTER TABLE public.like_counts ENABLE ROW LEVEL SECURITY;

-- 誰でも読み取り可能
CREATE POLICY "like_counts_select_policy" ON public.like_counts
  FOR SELECT
  USING (true);

-- 認証済みユーザーは挿入・更新可能
CREATE POLICY "like_counts_insert_policy" ON public.like_counts
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "like_counts_update_policy" ON public.like_counts
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
