import { supabase } from '@/lib/supabase';
import PointsTable from './PointsTable';

async function getPoints(pointType?: string, limit: number = 100) {
  let query = supabase
    .from('points')
    .select('id, user_id, amount, type, created_at')
    .order('created_at', { ascending: false });

  if (pointType) {
    query = query.eq('type', pointType);
  }

  const { data: points, error } = await query.limit(limit);

  if (error) {
    console.error('Error fetching points:', error);
    return [];
  }

  if (!points || points.length === 0) return [];

  const userIds = [...new Set(points.map(p => p.user_id).filter(Boolean))];

  // ユーザー情報を一括取得
  const { data: users } = await supabase
    .from('users')
    .select('id, name')
    .in('id', userIds);

  const userMap = new Map(users?.map(u => [u.id, u]) || []);

  // データをマッピング
  const pointsWithDetails = points.map(point => ({
    ...point,
    points: point.amount, // amountをpointsにマッピング
    user: userMap.get(point.user_id) || null,
  }));

  return pointsWithDetails;
}

async function getPointCounts() {
  // 各種別ごとに件数を取得
  const { count: allCount } = await supabase
    .from('points')
    .select('*', { count: 'exact', head: true });

  const { count: voteCount } = await supabase
    .from('points')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'vote');

  const { count: commentCount } = await supabase
    .from('points')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'comment');

  const { count: likeCount } = await supabase
    .from('points')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'like');

  return {
    all: allCount || 0,
    vote: voteCount || 0,
    comment: commentCount || 0,
    like: likeCount || 0,
  };
}

export default async function PointsManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const pointType = params.type;
  const limit = params.limit ? parseInt(params.limit) : 100;
  const points = await getPoints(pointType, limit);
  const counts = await getPointCounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ポイント管理</h1>
      </div>

      {/* 表示件数選択 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">表示件数:</span>
          <a
            href={`/admin/points${pointType ? `?type=${pointType}&` : '?'}limit=10`}
            className={`px-3 py-1 rounded ${
              limit === 10 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            10件
          </a>
          <a
            href={`/admin/points${pointType ? `?type=${pointType}&` : '?'}limit=50`}
            className={`px-3 py-1 rounded ${
              limit === 50 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            50件
          </a>
          <a
            href={`/admin/points${pointType ? `?type=${pointType}&` : '?'}limit=100`}
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
          href="/admin/points"
          className={`hover:text-blue-600 ${
            !pointType ? 'text-blue-600 font-semibold' : 'text-gray-600'
          }`}
        >
          すべて ({counts.all})
        </a>
        <span className="text-gray-400">|</span>
        <a
          href="/admin/points?type=vote"
          className={`hover:text-blue-600 ${
            pointType === 'vote' ? 'text-blue-600 font-semibold' : 'text-gray-600'
          }`}
        >
          投票 ({counts.vote})
        </a>
        <span className="text-gray-400">|</span>
        <a
          href="/admin/points?type=comment"
          className={`hover:text-blue-600 ${
            pointType === 'comment' ? 'text-blue-600 font-semibold' : 'text-gray-600'
          }`}
        >
          コメント ({counts.comment})
        </a>
        <span className="text-gray-400">|</span>
        <a
          href="/admin/points?type=like"
          className={`hover:text-blue-600 ${
            pointType === 'like' ? 'text-blue-600 font-semibold' : 'text-gray-600'
          }`}
        >
          いいね ({counts.like})
        </a>
      </div>

      <PointsTable points={points} />
    </div>
  );
}
