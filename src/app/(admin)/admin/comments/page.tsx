import { supabase } from '@/lib/supabase';
import CommentsTable from './CommentsTable';
import SearchForm from './SearchForm';
import CommentTestSection from './CommentTestSection';

async function getComments(limit: number = 100, searchQuery: string = '', userType?: string) {
  // userTypeに応じてDB側で絞り込むためのuser_idリストを先取得
  let filterUserIds: string[] | null = null;
  let filterGuest = false;

  if (userType === 'member') {
    const { data } = await supabase.from('users').select('id').eq('status', 3);
    filterUserIds = data?.map(u => u.id) || [];
  } else if (userType === 'ai_member') {
    const { data } = await supabase.from('users').select('id').eq('status', 4);
    filterUserIds = data?.map(u => u.id) || [];
  } else if (userType === 'guest') {
    filterGuest = true;
  }

  let query = supabase
    .from('comments')
    .select('id, content, created_at, user_id, post_id, is_ai_comment');

  if (searchQuery) {
    query = query.ilike('content', `%${searchQuery}%`);
  }

  if (filterGuest) {
    query = query.is('user_id', null);
  } else if (filterUserIds !== null) {
    if (filterUserIds.length === 0) return [];
    query = query.in('user_id', filterUserIds);
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

  const { data: users } = await supabase
    .from('users')
    .select('id, name, status')
    .in('id', userIds);

  const userMap = new Map(users?.map(u => [u.id, u]) || []);

  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, best_answer_id')
    .in('id', postIds);

  const postMap = new Map(posts?.map(p => [p.id, p]) || []);

  return comments.map(comment => {
    const post = postMap.get(comment.post_id);
    return {
      ...comment,
      users: userMap.get(comment.user_id) || null,
      posts: post || null,
      is_best_answer: post?.best_answer_id === comment.id,
    };
  });
}

async function getCommentCounts() {
  // status:3（会員）のuser_idを取得
  const { data: memberUsers } = await supabase
    .from('users').select('id').eq('status', 3);
  const memberUserIds = memberUsers?.map(u => u.id) || [];

  // status:4（AI会員）のuser_idを取得
  const { data: aiUsers } = await supabase
    .from('users').select('id').eq('status', 4);
  const aiUserIds = aiUsers?.map(u => u.id) || [];

  // 各カテゴリのコメント数をcountで取得
  const [{ count: all }, { count: member }, { count: ai_member }, { count: guest }] = await Promise.all([
    supabase.from('comments').select('*', { count: 'exact', head: true }),
    memberUserIds.length > 0
      ? supabase.from('comments').select('*', { count: 'exact', head: true }).in('user_id', memberUserIds)
      : Promise.resolve({ count: 0 }),
    aiUserIds.length > 0
      ? supabase.from('comments').select('*', { count: 'exact', head: true }).in('user_id', aiUserIds)
      : Promise.resolve({ count: 0 }),
    supabase.from('comments').select('*', { count: 'exact', head: true }).is('user_id', null),
  ]);

  return {
    all: all || 0,
    member: member || 0,
    ai_member: ai_member || 0,
    guest: guest || 0,
  };
}

export default async function CommentsManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string; q?: string; userType?: string }>;
}) {
  const params = await searchParams;
  const limit = params.limit ? parseInt(params.limit) : 100;
  const searchQuery = params.q || '';
  const userType = params.userType || '';
  const comments = await getComments(limit, searchQuery, userType);
  const counts = await getCommentCounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">コメント一覧・生成テスト</h1>
      </div>

      {/* コメント生成テスト */}
      <CommentTestSection />

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

      {/* フィルター */}
      <div className="flex items-center gap-2 text-sm">
        <a href="/admin/comments" className={`hover:text-blue-600 ${!userType ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
          すべて ({counts.all})
        </a>
        <span className="text-gray-400">|</span>
        <a href="/admin/comments?userType=member" className={`hover:text-blue-600 ${userType === 'member' ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
          会員 ({counts.member})
        </a>
        <span className="text-gray-400">|</span>
        <a href="/admin/comments?userType=ai_member" className={`hover:text-purple-600 ${userType === 'ai_member' ? 'text-purple-600 font-semibold' : 'text-gray-600'}`}>
          AI会員 ({counts.ai_member})
        </a>
        <span className="text-gray-400">|</span>
        <a href="/admin/comments?userType=guest" className={`hover:text-blue-600 ${userType === 'guest' ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
          ゲスト ({counts.guest})
        </a>
      </div>

      <CommentsTable comments={comments} />
    </div>
  );
}
