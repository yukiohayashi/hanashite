import { supabase } from '@/lib/supabase';
import CommentsTable from './CommentsTable';
import SearchForm from './SearchForm';

async function getComments(limit: number = 100, searchQuery: string = '') {
  let query = supabase
    .from('comments')
    .select('id, content, created_at, user_id, post_id');

  // 検索クエリがある場合はフィルタリング
  if (searchQuery) {
    query = query.ilike('content', `%${searchQuery}%`);
  }

  query = query.order('created_at', { ascending: false }).limit(limit);

  const { data: comments, error } = await query;

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }

  if (!comments || comments.length === 0) return [];

  const userIds = [...new Set(comments.map(c => c.user_id).filter(Boolean))];
  const postIds = [...new Set(comments.map(c => c.post_id).filter(Boolean))];

  // ユーザー情報を一括取得
  const { data: users } = await supabase
    .from('users')
    .select('id, name')
    .in('id', userIds);

  const userMap = new Map(users?.map(u => [u.id, u]) || []);

  // 投稿情報を一括取得
  const { data: posts } = await supabase
    .from('posts')
    .select('id, title')
    .in('id', postIds);

  const postMap = new Map(posts?.map(p => [p.id, p]) || []);

  // データをマッピング
  const commentsWithDetails = comments.map(comment => ({
    ...comment,
    users: userMap.get(comment.user_id) || null,
    posts: postMap.get(comment.post_id) || null,
  }));

  return commentsWithDetails;
}

async function getCommentCounts() {
  const { count } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true });
  
  return {
    all: count || 0,
  };
}

export default async function CommentsManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string; q?: string }>;
}) {
  const params = await searchParams;
  const limit = params.limit ? parseInt(params.limit) : 100;
  const searchQuery = params.q || '';
  const comments = await getComments(limit, searchQuery);
  const counts = await getCommentCounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">コメント管理</h1>
      </div>

      {/* 検索フォーム */}
      <SearchForm />

      {/* 表示件数選択 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">表示件数:</span>
          <a
            href="/admin/comments?limit=10"
            className={`px-3 py-1 rounded ${
              limit === 10 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            10件
          </a>
          <a
            href="/admin/comments?limit=50"
            className={`px-3 py-1 rounded ${
              limit === 50 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            50件
          </a>
          <a
            href="/admin/comments?limit=100"
            className={`px-3 py-1 rounded ${
              limit === 100 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            100件
          </a>
        </div>
      </div>

      {/* コメント数表示 */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">すべて ({counts.all})</span>
      </div>

      <CommentsTable comments={comments} />
    </div>
  );
}
