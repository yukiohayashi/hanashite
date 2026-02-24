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

interface OrphanedKeyword {
  id: number;
  keyword: string;
  description: string | null;
  keyword_type: string;
  created_at: string;
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
  const [linkingKeywords, setLinkingKeywords] = useState(false);
  const [linkMessage, setLinkMessage] = useState('');
  const [showOrphanedKeywords, setShowOrphanedKeywords] = useState(false);
  const [orphanedKeywordsList, setOrphanedKeywordsList] = useState<OrphanedKeyword[]>([]);
  const [loadingOrphanedKeywords, setLoadingOrphanedKeywords] = useState(false);

  const fetchOrphanedData = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/admin/cleanup/count');
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
      const response = await fetch('/api/admin/cleanup', {
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
      const response = await fetch('/api/admin/cleanup', {
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

  const handleLinkKeywords = async () => {
    if (!confirm('すべてのキーワードについて、タイトルまたは本文に含まれる投稿を検索して紐付けます。よろしいですか？')) {
      return;
    }

    setLinkingKeywords(true);
    setLinkMessage('');

    try {
      const response = await fetch('/api/admin/link-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok) {
        setLinkMessage(`✅ ${data.message}`);
        fetchOrphanedData();
      } else {
        setLinkMessage(`❌ エラー: ${data.error}`);
      }
    } catch (error) {
      setLinkMessage(`❌ エラーが発生しました`);
    }

    setLinkingKeywords(false);
  };

  const handleShowOrphanedKeywords = async () => {
    setShowOrphanedKeywords(true);
    setLoadingOrphanedKeywords(true);

    try {
      const response = await fetch('/api/admin/orphaned-keywords');
      const data = await response.json();

      if (response.ok) {
        setOrphanedKeywordsList(data.keywords || []);
      }
    } catch (error) {
      console.error('Error fetching orphaned keywords:', error);
    }

    setLoadingOrphanedKeywords(false);
  };

  const totalOrphaned = Object.values(orphanedData).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">クリーンアップ（削除記事に対するコメント、いいね、フォローを削除）</h1>
        <p className="mt-1 text-sm text-gray-600">
          孤立したデータの削除
        </p>
        <p className="mt-1 text-xs text-orange-600 font-medium">
          ※開発用: 直近100件の投稿のみを対象にチェックしています（Supabaseデフォルト1000件制限を回避）
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg ${message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      {linkMessage && (
        <div className={`p-3 rounded-lg ${linkMessage.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {linkMessage}
        </div>
      )}

      {/* キーワード自動紐付けボタン */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-blue-900">キーワード自動紐付け</h3>
            <p className="text-sm text-blue-800 mt-1">
              すべてのキーワードについて、タイトルまたは本文に含まれる投稿を検索して自動的に紐付けます。
            </p>
          </div>
          <button
            onClick={handleLinkKeywords}
            disabled={linkingKeywords}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 whitespace-nowrap"
          >
            {linkingKeywords ? '処理中...' : 'キーワードを紐付け'}
          </button>
        </div>
      </div>

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
                  <td className="px-4 py-3 font-medium text-gray-900">孤立したキーワード</td>
                  <td className="px-4 py-3 text-sm">
                    {orphanedData.orphaned_keywords > 0 ? (
                      <button
                        onClick={handleShowOrphanedKeywords}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {orphanedData.orphaned_keywords}件
                      </button>
                    ) : (
                      <span className="text-gray-900">{orphanedData.orphaned_keywords}件</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">投稿が存在しないキーワード</td>
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

      {/* 孤立したキーワード一覧モーダル */}
      {showOrphanedKeywords && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">孤立したキーワード一覧</h2>
              <button
                onClick={() => setShowOrphanedKeywords(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {loadingOrphanedKeywords ? (
              <div className="text-center py-8">読み込み中...</div>
            ) : orphanedKeywordsList.length > 0 ? (
              <div className="space-y-2">
                {orphanedKeywordsList.map((keyword) => (
                  <div
                    key={keyword.id}
                    className="bg-white p-3 border border-gray-300 rounded-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{keyword.keyword}</h3>
                        {keyword.description && (
                          <p className="text-sm text-gray-500 mt-1">{keyword.description}</p>
                        )}
                        <div className="mt-1 text-xs text-gray-400">
                          <span>ID: {keyword.id}</span>
                          <span className="ml-4">
                            タイプ: {keyword.keyword_type === 'tag' ? 'タグ' : 'カテゴリ'}
                          </span>
                          <span className="ml-4">
                            作成日: {new Date(keyword.created_at).toLocaleDateString('ja-JP')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                孤立したキーワードはありません
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowOrphanedKeywords(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
