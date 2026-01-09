'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Keyword {
  id: number;
  keyword: string;
  slug: string;
  description: string | null;
  keyword_type: string;
  is_featured: boolean;
  post_count: number;
  search_count: number;
  view_count: number;
  created_at: string;
}

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'tag' | 'category'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKeyword, setNewKeyword] = useState({
    keyword: '',
    slug: '',
    description: '',
    keyword_type: 'tag',
    is_featured: false,
  });

  useEffect(() => {
    fetchKeywords();
  }, [filter]);

  const fetchKeywords = async () => {
    setLoading(true);

    let query = supabase
      .from('keywords')
      .select('*')
      .order('post_count', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('keyword_type', filter);
    }

    const { data } = await query;

    if (data) {
      setKeywords(data);
    }

    setLoading(false);
  };

  const handleAddKeyword = async () => {
    if (!newKeyword.keyword.trim()) {
      alert('キーワードを入力してください');
      return;
    }

    const slug = newKeyword.slug || newKeyword.keyword.toLowerCase().replace(/\s+/g, '-');

    const { error } = await supabase.from('keywords').insert({
      keyword: newKeyword.keyword,
      slug,
      description: newKeyword.description || null,
      keyword_type: newKeyword.keyword_type,
      is_featured: newKeyword.is_featured,
    });

    if (error) {
      alert('キーワードの追加に失敗しました: ' + error.message);
      return;
    }

    setShowAddModal(false);
    setNewKeyword({
      keyword: '',
      slug: '',
      description: '',
      keyword_type: 'tag',
      is_featured: false,
    });
    fetchKeywords();
  };

  const handleDeleteKeyword = async (id: number) => {
    if (!confirm('このキーワードを削除しますか？')) return;

    const { error } = await supabase.from('keywords').delete().eq('id', id);

    if (error) {
      alert('削除に失敗しました: ' + error.message);
      return;
    }

    fetchKeywords();
  };

  const filteredKeywords = keywords.filter((kw) =>
    kw.keyword.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">キーワード管理</h1>
          <p className="mt-1 text-sm text-gray-600">
            検索キーワードの管理・統計
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/categories"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            カテゴリ管理
          </Link>
          <Link
            href="/admin/ng-words"
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            NGワード管理
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + キーワード追加
          </button>
        </div>
      </div>

      {/* フィルター */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              タイプ
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'tag' | 'category')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">すべて</option>
              <option value="tag">タグ</option>
              <option value="category">カテゴリ</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              検索
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="キーワードを検索..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* キーワード一覧 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">読み込み中...</div>
        ) : filteredKeywords.length === 0 ? (
          <div className="p-8 text-center text-gray-500">キーワードがありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    キーワード
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    タイプ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    投稿数
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    検索回数
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    閲覧数
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredKeywords.map((keyword) => (
                  <tr key={keyword.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{keyword.keyword}</span>
                        {keyword.is_featured && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                            注目
                          </span>
                        )}
                      </div>
                      {keyword.description && (
                        <p className="text-sm text-gray-500 mt-1">{keyword.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {keyword.keyword_type === 'tag' ? 'タグ' : 'カテゴリ'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{keyword.post_count}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{keyword.search_count}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{keyword.view_count}</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleDeleteKeyword(keyword.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">キーワード追加</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  キーワード *
                </label>
                <input
                  type="text"
                  value={newKeyword.keyword}
                  onChange={(e) => setNewKeyword({ ...newKeyword, keyword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="例: 政治"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  スラッグ
                </label>
                <input
                  type="text"
                  value={newKeyword.slug}
                  onChange={(e) => setNewKeyword({ ...newKeyword, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="例: politics（空欄で自動生成）"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  説明
                </label>
                <textarea
                  value={newKeyword.description}
                  onChange={(e) => setNewKeyword({ ...newKeyword, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="キーワードの説明"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  タイプ
                </label>
                <select
                  value={newKeyword.keyword_type}
                  onChange={(e) => setNewKeyword({ ...newKeyword, keyword_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="tag">タグ</option>
                  <option value="category">カテゴリ</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={newKeyword.is_featured}
                  onChange={(e) => setNewKeyword({ ...newKeyword, is_featured: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700">注目キーワード</label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddKeyword}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                追加
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
