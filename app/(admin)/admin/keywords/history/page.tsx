'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface SearchHistory {
  id: number;
  search_keyword: string;
  user_id: number | null;
  search_type: string;
  result_count: number;
  created_at: string;
}

export default function SearchHistoryPage() {
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('40');

  const fetchHistory = async () => {
    setLoading(true);

    let query = supabase
      .from('keyword_search_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (dateFilter !== 'all') {
      const days = parseInt(dateFilter);
      const date = new Date();
      date.setDate(date.getDate() - days);
      query = query.gte('created_at', date.toISOString());
    }

    const { data } = await query;

    if (data) {
      setHistory(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [dateFilter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getPopularKeywords = () => {
    const keywordCounts: { [key: string]: number } = {};
    history.forEach((item) => {
      keywordCounts[item.search_keyword] = (keywordCounts[item.search_keyword] || 0) + 1;
    });

    return Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  };

  const popularKeywords = getPopularKeywords();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">検索履歴</h1>
        <p className="mt-1 text-sm text-gray-600">
          ユーザーの検索キーワード履歴
        </p>
      </div>

      {/* フィルター */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">期間:</label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="1">過去1日</option>
            <option value="7">過去7日</option>
            <option value="30">過去30日</option>
            <option value="40">過去40日</option>
            <option value="all">すべて</option>
          </select>
        </div>
      </div>

      {/* 人気キーワード */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-3">人気キーワード</h2>
        <div className="flex flex-wrap gap-2">
          {popularKeywords.map(([keyword, count]) => (
            <div
              key={keyword}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {keyword} ({count})
            </div>
          ))}
        </div>
      </div>

      {/* 検索履歴一覧 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">読み込み中...</div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-gray-500">検索履歴がありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    検索日時
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    キーワード
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    結果数
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ユーザーID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    IPアドレス
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.search_keyword}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.result_count}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.user_id || 'ゲスト'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      -
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-600">総検索数</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{history.length}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-600">ユニークキーワード</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {new Set(history.map((h) => h.search_keyword)).size}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-600">平均結果数</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {history.length > 0
              ? Math.round(
                  history.reduce((sum, h) => sum + h.result_count, 0) / history.length
                )
              : 0}
          </div>
        </div>
      </div>
    </div>
  );
}
