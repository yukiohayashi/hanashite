import { supabase } from '@/lib/supabase';

async function getLikesStats() {
  // 総いいね数
  const { count: totalLikes } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true });

  // 今日のいいね数
  const today = new Date().toISOString().split('T')[0];
  const { count: todayLikes } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59`);

  // 今月のいいね数
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const { count: monthLikes } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', firstDay)
    .lte('created_at', lastDay);

  // 投稿別いいね数トップ10
  const { data: postLikes } = await supabase
    .from('likes')
    .select('target_id')
    .eq('like_type', 'post');

  const postLikeCounts = new Map<number, number>();
  postLikes?.forEach(like => {
    postLikeCounts.set(like.target_id, (postLikeCounts.get(like.target_id) || 0) + 1);
  });

  const topPostIds = Array.from(postLikeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  const { data: topPosts } = await supabase
    .from('posts')
    .select('id, title')
    .in('id', topPostIds);

  const topPostsWithCounts = topPosts?.map(post => ({
    ...post,
    like_count: postLikeCounts.get(post.id) || 0,
  })).sort((a, b) => b.like_count - a.like_count) || [];

  // ユーザー別いいね数トップ10（いいねをした人）
  const { data: userLikes } = await supabase
    .from('likes')
    .select('user_id');

  const userLikeCounts = new Map<number, number>();
  userLikes?.forEach(like => {
    userLikeCounts.set(like.user_id, (userLikeCounts.get(like.user_id) || 0) + 1);
  });

  const topUserIds = Array.from(userLikeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  const { data: topUsers } = await supabase
    .from('users')
    .select('id, name')
    .in('id', topUserIds);

  const topUsersWithCounts = topUsers?.map(user => ({
    ...user,
    like_count: userLikeCounts.get(user.id) || 0,
  })).sort((a, b) => b.like_count - a.like_count) || [];

  return {
    totalLikes: totalLikes || 0,
    todayLikes: todayLikes || 0,
    monthLikes: monthLikes || 0,
    topPosts: topPostsWithCounts,
    topUsers: topUsersWithCounts,
  };
}

export default async function LikesStatsPage() {
  const stats = await getLikesStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">いいね統計</h1>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-3xl font-bold text-gray-900">{stats.totalLikes.toLocaleString()}</p>
              <p className="text-sm text-gray-600">総いいね数</p>
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
              <p className="text-3xl font-bold text-gray-900">{stats.todayLikes.toLocaleString()}</p>
              <p className="text-sm text-gray-600">今日のいいね</p>
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
              <p className="text-3xl font-bold text-gray-900">{stats.monthLikes.toLocaleString()}</p>
              <p className="text-sm text-gray-600">今月のいいね</p>
            </div>
          </div>
        </div>
      </div>

      {/* トップ投稿 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">いいねが多い投稿 TOP10</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  順位
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  投稿タイトル
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  いいね数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.topPosts.length > 0 ? (
                stats.topPosts.map((post, index) => (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-lg font-bold text-gray-900">{index + 1}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{post.title}</div>
                      <div className="text-xs text-gray-500">ID: {post.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-lg font-bold text-blue-600">{post.like_count.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={`/posts/${post.id}`}
                        target="_blank"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        表示
                      </a>
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
          <h2 className="text-xl font-semibold text-gray-900">いいねが多いユーザー TOP10</h2>
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
                  いいね数
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
                      <span className="text-lg font-bold text-green-600">{user.like_count.toLocaleString()}</span>
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
