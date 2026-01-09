'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface KeywordStat {
  keyword: string;
  search_count: number;
  view_count: number;
  post_count: number;
}

export default function KeywordStatsPage() {
  const [stats, setStats] = useState<KeywordStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'search_count' | 'view_count' | 'post_count'>('search_count');

  const fetchStats = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('keywords')
      .select('keyword, search_count, view_count, post_count')
      .order(sortBy, { ascending: false })
      .limit(50);

    if (data) {
      setStats(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, [sortBy]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">キーワード統計</h1>
        <p className="mt-1 text-sm text-gray-600">
          キーワードの検索・閲覧・投稿統計
        </p>
      </div>

      {/* フィルター */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">並び替え:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'search_count' | 'view_count' | 'post_count')}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="search_count">検索回数</option>
            <option value="view_count">閲覧数</option>
            <option value="post_count">投稿数</option>
          </select>
        </div>
      </div>

      {/* 統計一覧 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">読み込み中...</div>
        ) : stats.length === 0 ? (
          <div className="p-8 text-center text-gray-500">統計データがありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    順位
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    キーワード
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    検索回数
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    閲覧数
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    投稿数
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.map((stat, index) => (
                  <tr key={stat.keyword} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {stat.keyword}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {stat.search_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {stat.view_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {stat.post_count.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-600">総検索回数</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {stats.reduce((sum, s) => sum + s.search_count, 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-600">総閲覧数</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {stats.reduce((sum, s) => sum + s.view_count, 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-600">総投稿数</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {stats.reduce((sum, s) => sum + s.post_count, 0).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
