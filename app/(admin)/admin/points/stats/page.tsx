import { supabase } from '@/lib/supabase';

async function getPointsStats() {
  // 総レコード数
  const { count: totalRecords } = await supabase
    .from('points')
    .select('*', { count: 'exact', head: true });

  // 総ポイント数
  const { data: allPoints } = await supabase
    .from('points')
    .select('amount, user_id');

  const totalPoints = allPoints?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const avgPoints = totalRecords ? totalPoints / totalRecords : 0;

  // ユニークユーザー数
  const uniqueUsers = new Set(allPoints?.map(p => p.user_id).filter(Boolean));
  const userCount = uniqueUsers.size;

  // ポイントタイプ別統計
  const { data: typeStats } = await supabase
    .from('points')
    .select('type, amount');

  const typeStatsMap = new Map<string, { count: number; total: number }>();
  typeStats?.forEach(point => {
    const type = point.type || 'unknown';
    const current = typeStatsMap.get(type) || { count: 0, total: 0 };
    typeStatsMap.set(type, {
      count: current.count + 1,
      total: current.total + point.amount,
    });
  });

  const typeStatsArray = Array.from(typeStatsMap.entries())
    .map(([type, stats]) => ({
      point_type: type,
      count: stats.count,
      total_points: stats.total,
      avg_points: stats.count > 0 ? stats.total / stats.count : 0,
    }))
    .sort((a, b) => b.total_points - a.total_points);

  // 今日のポイント数
  const today = new Date().toISOString().split('T')[0];
  const { data: todayPoints } = await supabase
    .from('points')
    .select('amount')
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59`);

  const todayTotal = todayPoints?.reduce((sum, p) => sum + p.amount, 0) || 0;

  // 今月のポイント数
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const { data: monthPoints } = await supabase
    .from('points')
    .select('amount')
    .gte('created_at', firstDay)
    .lte('created_at', lastDay);

  const monthTotal = monthPoints?.reduce((sum, p) => sum + p.amount, 0) || 0;

  // ユーザー別ポイント数トップ10
  const { data: userPoints } = await supabase
    .from('points')
    .select('user_id, amount');

  const userPointsMap = new Map<number, number>();
  userPoints?.forEach(point => {
    userPointsMap.set(point.user_id, (userPointsMap.get(point.user_id) || 0) + point.amount);
  });

  const topUserIds = Array.from(userPointsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  const { data: topUsers } = await supabase
    .from('users')
    .select('id, name')
    .in('id', topUserIds);

  const topUsersWithPoints = topUsers?.map(user => ({
    ...user,
    total_points: userPointsMap.get(user.id) || 0,
  })).sort((a, b) => b.total_points - a.total_points) || [];

  // 種別ごとのポイント数
  const { data: votePoints } = await supabase
    .from('points')
    .select('amount')
    .eq('type', 'vote');

  const { data: commentPoints } = await supabase
    .from('points')
    .select('amount')
    .eq('type', 'comment');

  const { data: likePoints } = await supabase
    .from('points')
    .select('amount')
    .eq('type', 'like');

  return {
    totalRecords: totalRecords || 0,
    totalPoints,
    avgPoints,
    userCount,
    typeStatsArray,
    todayTotal,
    monthTotal,
    topUsers: topUsersWithPoints,
    votePoints: votePoints?.reduce((sum, p) => sum + p.amount, 0) || 0,
    commentPoints: commentPoints?.reduce((sum, p) => sum + p.amount, 0) || 0,
    likePoints: likePoints?.reduce((sum, p) => sum + p.amount, 0) || 0,
  };
}

export default async function PointsStatsPage() {
  const stats = await getPointsStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ポイント統計</h1>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-3xl font-bold text-gray-900">{stats.totalPoints.toLocaleString()}</p>
              <p className="text-sm text-gray-600">総ポイント数</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-3xl font-bold text-gray-900">{stats.todayTotal.toLocaleString()}</p>
              <p className="text-sm text-gray-600">今日のポイント</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-3xl font-bold text-gray-900">{stats.monthTotal.toLocaleString()}</p>
              <p className="text-sm text-gray-600">今月のポイント</p>
            </div>
          </div>
        </div>
      </div>

      {/* ポイントタイプ別統計 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">ポイントタイプ別統計</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タイプ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  件数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                  合計ポイント
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  平均
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.typeStatsArray.length > 0 ? (
                stats.typeStatsArray.map((type) => (
                  <tr key={type.point_type} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">{type.point_type}</code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {type.count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-900">{type.total_points.toLocaleString()}</span>
                      <span className="text-sm text-gray-500"> pt</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {type.avg_points.toFixed(2)} pt
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* トップユーザー */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">ポイントが多いユーザー TOP10</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  順位
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ユーザー名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  総ポイント
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.topUsers.length > 0 ? (
                stats.topUsers.map((user, index) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-lg font-bold text-gray-900">{index + 1}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">ID: {user.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-lg font-bold text-yellow-600">{user.total_points.toLocaleString()}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                    データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
