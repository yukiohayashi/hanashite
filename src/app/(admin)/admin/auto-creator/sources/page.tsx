'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/hooks/usePageTitle';

interface Source {
  id: number;
  source_type: string;
  source_url: string | null;
  source_title: string;
  source_content: string | null;
  category_id: number | null;
  is_processed: boolean;
  post_id: number | null;
  created_at: string;
  processed_at: string | null;
}

export default function AutoCreatorSources() {
  usePageTitle('ソース一覧');
  
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'processed' | 'unprocessed'>('all');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>('all');
  const [scraping, setScraping] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postingId, setPostingId] = useState<number | null>(null);

  const fetchSources = async () => {
    setLoading(true);
    
    let query = supabase
      .from('auto_consultation_sources')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter === 'processed') {
      query = query.eq('is_processed', true);
    } else if (filter === 'unprocessed') {
      query = query.eq('is_processed', false);
    }

    if (sourceTypeFilter !== 'all') {
      query = query.eq('source_type', sourceTypeFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching sources:', error);
    } else {
      setSources(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchSources();
  }, [filter, sourceTypeFilter]);

  const handleScrapeYahoo = async () => {
    setScraping(true);
    setMessage('');

    try {
      const response = await fetch('/api/auto-creator/fetch-yahoo-chiebukuro');
      const data = await response.json();

      if (data.success) {
        setMessage(`✅ ${data.total}件の新しいソースを取得しました（スクレイピング: ${data.scraped}件）`);
        await fetchSources();
        setTimeout(() => setMessage(''), 5000);
      } else {
        setMessage(`❌ エラー: ${data.error}`);
      }
    } catch (error) {
      console.error('スクレイピングエラー:', error);
      setMessage('❌ スクレイピングに失敗しました');
    } finally {
      setScraping(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(sources.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`選択した${selectedIds.length}件のソースを削除しますか？`)) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('auto_consultation_sources')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      setMessage(`✅ ${selectedIds.length}件のソースを削除しました`);
      setSelectedIds([]);
      await fetchSources();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('削除エラー:', error);
      setMessage('❌ 削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteOne = async (id: number) => {
    if (!confirm('このソースを削除しますか？')) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('auto_consultation_sources')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessage('✅ ソースを削除しました');
      await fetchSources();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('削除エラー:', error);
      setMessage('❌ 削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  const handlePostFromSource = async (sourceId: number) => {
    if (!confirm('このソースから投稿を作成しますか？')) return;

    setPosting(true);
    setPostingId(sourceId);
    setMessage('');

    try {
      const response = await fetch('/api/auto-creator/post-from-source', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source_id: sourceId }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ 投稿を作成しました（ID: ${data.postId}）`);
        await fetchSources();
        setTimeout(() => setMessage(''), 5000);
      } else {
        setMessage(`❌ エラー: ${data.error}`);
      }
    } catch (error) {
      console.error('投稿作成エラー:', error);
      setMessage('❌ 投稿の作成に失敗しました');
    } finally {
      setPosting(false);
      setPostingId(null);
    }
  };

  const getSourceTypeLabel = (type: string) => {
    switch (type) {
      case 'yahoo_chiebukuro':
        return 'Yahoo!知恵袋';
      case 'google_trends':
        return 'Googleトレンド';
      case 'gpt_generated':
        return 'GPT自動生成';
      default:
        return type;
    }
  };

  const getSourceTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'yahoo_chiebukuro':
        return 'bg-purple-100 text-purple-800';
      case 'google_trends':
        return 'bg-blue-100 text-blue-800';
      case 'gpt_generated':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ソース一覧</h1>
          <p className="mt-2 text-gray-600">Yahoo!知恵袋、Googleトレンド、GPT自動生成から取得したソースを確認</p>
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 inline-block">
            <p className="text-sm text-green-800">
              <strong>🕒 Yahoo!知恵袋自動取得:</strong> 毎日 9:00, 15:00, 21:00　JST
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 font-medium"
            >
              {deleting ? '削除中...' : `選択した${selectedIds.length}件を削除`}
            </button>
          )}
          <button
            onClick={handleScrapeYahoo}
            disabled={scraping}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 font-medium"
          >
            {scraping ? 'スクレイピング中...' : 'Yahoo!知恵袋から取得'}
          </button>
        </div>
      </div>

      {/* メッセージ表示 */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.startsWith('✅') 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message}
        </div>
      )}

      {/* フィルター */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">処理状態</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                すべて
              </button>
              <button
                onClick={() => setFilter('unprocessed')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === 'unprocessed'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                未処理
              </button>
              <button
                onClick={() => setFilter('processed')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === 'processed'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                投稿済み
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ソースタイプ</label>
            <select
              value={sourceTypeFilter}
              onChange={(e) => setSourceTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべて</option>
              <option value="yahoo_chiebukuro">Yahoo!知恵袋</option>
              <option value="google_trends">Googleトレンド</option>
              <option value="gpt_generated">GPT自動生成</option>
            </select>
          </div>
        </div>
      </div>

      {/* ソース一覧 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">読み込み中...</div>
        ) : sources.length === 0 ? (
          <div className="p-8 text-center text-gray-500">ソースがありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={sources.length > 0 && selectedIds.length === sources.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ソースタイプ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    タイトル
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Yahoo URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    投稿済み
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    投稿ページ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    取得日時
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sources.map((source) => (
                  <tr key={source.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(source.id)}
                        onChange={(e) => handleSelectOne(source.id, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSourceTypeBadgeColor(source.source_type)}`}>
                        {getSourceTypeLabel(source.source_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 line-clamp-2">{source.source_title}</div>
                    </td>
                    <td className="px-6 py-4">
                      {source.source_url ? (
                        <a
                          href={source.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          リンク
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {source.is_processed ? (
                        <span className="text-green-600 font-medium">✓</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {source.is_processed && source.post_id ? (
                        <a
                          href={`/posts/${source.post_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline text-sm"
                        >
                          投稿を見る
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(() => {
                        const date = new Date(source.created_at);
                        return date.toLocaleString('ja-JP', { 
                          timeZone: 'Asia/Tokyo',
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        });
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        {!source.is_processed && (
                          <button
                            onClick={() => handlePostFromSource(source.id)}
                            disabled={posting && postingId === source.id}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                          >
                            {posting && postingId === source.id ? '投稿中...' : '投稿'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteOne(source.id)}
                          disabled={deleting}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          削除
                        </button>
                      </div>
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
          <div className="text-sm text-gray-500">総ソース数</div>
          <div className="text-2xl font-bold text-gray-900">{sources.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">未処理</div>
          <div className="text-2xl font-bold text-yellow-600">
            {sources.filter(s => !s.is_processed).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">投稿済み</div>
          <div className="text-2xl font-bold text-green-600">
            {sources.filter(s => s.is_processed).length}
          </div>
        </div>
      </div>
    </div>
  );
}
