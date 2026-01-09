import { supabase } from '@/lib/supabase';
import LikesTable from './LikesTable';

async function getLikes(likeType?: string, limit: number = 100) {
  let query = supabase
    .from('likes')
    .select('id, like_type, target_id, user_id, created_at')
    .order('created_at', { ascending: false });

  if (likeType) {
    query = query.eq('like_type', likeType);
  }

  const { data: likes, error } = await query.limit(limit);

  if (error) {
    console.error('Error fetching likes:', error);
    return [];
  }

  if (!likes || likes.length === 0) return [];

  const userIds = [...new Set(likes.map(l => l.user_id).filter(Boolean))];
  const postIds = [...new Set(likes.filter(l => l.like_type === 'post').map(l => l.target_id))];

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
  const likesWithDetails = likes.map(like => ({
    ...like,
    user: userMap.get(like.user_id) || null,
    post: like.like_type === 'post' ? postMap.get(like.target_id) : null,
  }));

  return likesWithDetails;
}

async function getLikeCounts() {
  // 各種別ごとに件数を取得
  const { count: allCount } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true });

  const { count: postCount } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('like_type', 'post');

  const { count: commentCount } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('like_type', 'comment');

  return {
    all: allCount || 0,
    post: postCount || 0,
    comment: commentCount || 0,
  };
}

export default async function LikesManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ like_type?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const likeType = params.like_type;
  const limit = params.limit ? parseInt(params.limit) : 100;
  const likes = await getLikes(likeType, limit);
  const counts = await getLikeCounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">いいね管理</h1>
      </div>

      {/* 表示件数選択 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">表示件数:</span>
          <a
            href={`/admin/likes${likeType ? `?like_type=${likeType}&` : '?'}limit=10`}
            className={`px-3 py-1 rounded ${
              limit === 10 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            10件
          </a>
          <a
            href={`/admin/likes${likeType ? `?like_type=${likeType}&` : '?'}limit=50`}
            className={`px-3 py-1 rounded ${
              limit === 50 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            50件
          </a>
          <a
            href={`/admin/likes${likeType ? `?like_type=${likeType}&` : '?'}limit=100`}
            className={`px-3 py-1 rounded ${
              limit === 100 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            100件
          </a>
        </div>
      </div>

      {/* 種別フィルタリンク */}
      <div className="flex items-center gap-2 text-sm">
        <a
          href="/admin/likes"
          className={`hover:text-blue-600 ${
            !likeType ? 'text-blue-600 font-semibold' : 'text-gray-600'
          }`}
        >
          すべて ({counts.all})
        </a>
        <span className="text-gray-400">|</span>
        <a
          href="/admin/likes?like_type=post"
          className={`hover:text-blue-600 ${
            likeType === 'post' ? 'text-blue-600 font-semibold' : 'text-gray-600'
          }`}
        >
          投稿 ({counts.post})
        </a>
        <span className="text-gray-400">|</span>
        <a
          href="/admin/likes?like_type=comment"
          className={`hover:text-blue-600 ${
            likeType === 'comment' ? 'text-blue-600 font-semibold' : 'text-gray-600'
          }`}
        >
          コメント ({counts.comment})
        </a>
      </div>

      <LikesTable likes={likes} />
    </div>
  );
}
