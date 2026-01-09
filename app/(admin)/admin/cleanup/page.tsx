'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, AlertTriangle } from 'lucide-react';

interface OrphanedData {
  orphaned_vote_choices: number;
  orphaned_vote_options: number;
  orphaned_comments: number;
  orphaned_keywords: number;
  orphaned_likes: number;
  orphaned_favorites: number;
}

export default function CleanupPage() {
  const [orphanedData, setOrphanedData] = useState<OrphanedData>({
    orphaned_vote_choices: 0,
    orphaned_vote_options: 0,
    orphaned_comments: 0,
    orphaned_keywords: 0,
    orphaned_likes: 0,
    orphaned_favorites: 0,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchOrphanedData = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/cleanup/count');
      const data = await response.json();

      if (response.ok) {
        setOrphanedData(data);
      }
    } catch (error) {
      console.error('Error fetching orphaned data:', error);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchOrphanedData();
  }, []);

  const handleCleanup = async (type: string) => {
    if (!confirm(`この操作は元に戻せません。本当に削除しますか？`)) {
      return;
    }

    setProcessing(true);
    setMessage('');

    try {
      const response = await fetch('/api/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ ${data.message}`);
        fetchOrphanedData();
      } else {
        setMessage(`❌ エラー: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ エラーが発生しました`);
    }

    setProcessing(false);
  };

  const handleCleanupAll = async () => {
    const total = Object.values(orphanedData).reduce((sum, count) => sum + count, 0);
    
    if (total === 0) {
      setMessage('削除するデータがありません');
      return;
    }

    if (!confirm(`すべての孤立データ（合計${total}件）を一括削除します。本当によろしいですか？`)) {
      return;
    }

    setProcessing(true);
    setMessage('');

    try {
      const response = await fetch('/api/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'all' }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ ${data.message}`);
        fetchOrphanedData();
      } else {
        setMessage(`❌ エラー: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ エラーが発生しました`);
    }

    setProcessing(false);
  };

  const totalOrphaned = Object.values(orphanedData).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">クリーンアップ</h1>
        <p className="mt-1 text-sm text-gray-600">
          孤立したデータの削除
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg ${message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      {/* 警告 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-bold text-yellow-900">警告</h3>
            <p className="text-sm text-yellow-800 mt-1">
              この操作は元に戻せません。必ずデータベースのバックアップを取ってから実行してください。
            </p>
          </div>
        </div>
      </div>

      {/* 一括削除ボタン */}
      {totalOrphaned > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <button
            onClick={handleCleanupAll}
            disabled={processing}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
          >
            {processing ? '処理中...' : `すべての孤立データを一括削除（${totalOrphaned}件）`}
          </button>
        </div>
      )}

      {/* 孤立データ一覧 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">読み込み中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    データタイプ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    件数
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    説明
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">孤立した投票選択肢</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{orphanedData.orphaned_vote_choices}件</td>
                  <td className="px-4 py-3 text-sm text-gray-500">投稿が存在しない投票選択肢</td>
                  <td className="px-4 py-3">
                    {orphanedData.orphaned_vote_choices > 0 && (
                      <button
                        onClick={() => handleCleanup('vote_choices')}
                        disabled={processing}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:bg-gray-400"
                      >
                        削除
                      </button>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">孤立した投票オプション</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{orphanedData.orphaned_vote_options}件</td>
                  <td className="px-4 py-3 text-sm text-gray-500">投稿が存在しない投票設定</td>
                  <td className="px-4 py-3">
                    {orphanedData.orphaned_vote_options > 0 && (
                      <button
                        onClick={() => handleCleanup('vote_options')}
                        disabled={processing}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:bg-gray-400"
                      >
                        削除
                      </button>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">孤立したコメント</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{orphanedData.orphaned_comments}件</td>
                  <td className="px-4 py-3 text-sm text-gray-500">投稿が存在しないコメント</td>
                  <td className="px-4 py-3">
                    {orphanedData.orphaned_comments > 0 && (
                      <button
                        onClick={() => handleCleanup('comments')}
                        disabled={processing}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:bg-gray-400"
                      >
                        削除
                      </button>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">投稿が存在しないキーワード</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{orphanedData.orphaned_keywords}件</td>
                  <td className="px-4 py-3 text-sm text-gray-500">post_count=0のキーワード（カテゴリタイプは除外）</td>
                  <td className="px-4 py-3">
                    {orphanedData.orphaned_keywords > 0 && (
                      <button
                        onClick={() => handleCleanup('keywords')}
                        disabled={processing}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:bg-gray-400"
                      >
                        削除
                      </button>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">孤立したいいね</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{orphanedData.orphaned_likes}件</td>
                  <td className="px-4 py-3 text-sm text-gray-500">投稿が存在しないいいね</td>
                  <td className="px-4 py-3">
                    {orphanedData.orphaned_likes > 0 && (
                      <button
                        onClick={() => handleCleanup('likes')}
                        disabled={processing}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:bg-gray-400"
                      >
                        削除
                      </button>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">孤立したお気に入り</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{orphanedData.orphaned_favorites}件</td>
                  <td className="px-4 py-3 text-sm text-gray-500">投稿が存在しないお気に入り</td>
                  <td className="px-4 py-3">
                    {orphanedData.orphaned_favorites > 0 && (
                      <button
                        onClick={() => handleCleanup('favorites')}
                        disabled={processing}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:bg-gray-400"
                      >
                        削除
                      </button>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
