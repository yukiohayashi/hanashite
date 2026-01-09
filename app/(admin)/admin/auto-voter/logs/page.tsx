'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Log {
  id: number;
  post_id: number;
  user_id: number;
  action_type: string;
  status: string;
  message: string;
  error_message: string | null;
  executed_at: string;
}

export default function AutoVoterLogs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [filter, actionFilter]);

  const fetchLogs = async () => {
    setLoading(true);

    let query = supabase
      .from('auto_voter_logs')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(100);

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    if (actionFilter !== 'all') {
      query = query.eq('action_type', actionFilter);
    }

    const { data } = await query;

    if (data) {
      setLogs(data);
    }

    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'vote':
        return '🗳️ 投票';
      case 'comment':
        return '💬 コメント';
      case 'reply':
        return '↩️ 返信';
      case 'like_post':
        return '❤️ 投稿いいね';
      case 'like_comment':
        return '👍 コメントいいね';
      default:
        return actionType;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'success') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
          成功
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
          エラー
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">実行履歴</h1>
        <p className="mt-2 text-sm text-gray-600">
          自動投票・コメント・いいね機能の実行ログ
        </p>
      </div>

      {/* フィルター */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'success' | 'error')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべて</option>
              <option value="success">成功のみ</option>
              <option value="error">エラーのみ</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              アクション
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべて</option>
              <option value="vote">投票</option>
              <option value="comment">コメント</option>
              <option value="reply">返信</option>
              <option value="like_post">投稿いいね</option>
              <option value="like_comment">コメントいいね</option>
            </select>
          </div>
        </div>
      </div>

      {/* ログ一覧 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            読み込み中...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            実行履歴がありません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    実行日時
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アクション
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    投稿ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ユーザーID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    メッセージ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(log.executed_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getActionLabel(log.action_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <a
                        href={`/posts/${log.post_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        #{log.post_id}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.user_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.status === 'error' && log.error_message ? (
                        <span className="text-red-600">{log.error_message}</span>
                      ) : (
                        <span className="text-gray-700">{log.message}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">総実行数</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{logs.length}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">成功数</div>
          <div className="text-3xl font-bold text-green-600 mt-2">
            {logs.filter((log) => log.status === 'success').length}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">エラー数</div>
          <div className="text-3xl font-bold text-red-600 mt-2">
            {logs.filter((log) => log.status === 'error').length}
          </div>
        </div>
      </div>
    </div>
  );
}
