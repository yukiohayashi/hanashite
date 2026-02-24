'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Keyword {
  id: number;
  keyword: string;
  description: string | null;
  keyword_type: string;
  is_featured: boolean;
  post_count: number;
  search_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
}

interface Post {
  id: number;
  title: string;
  created_at: string;
  user_id: number;
  status: string;
  users?: { name: string };
}

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'tag' | 'category'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<Keyword | null>(null);
  const [keywordPosts, setKeywordPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [sortBy, setSortBy] = useState<'post_count' | 'search_count' | 'view_count' | 'created_at' | 'updated_at'>('post_count');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [editKeyword, setEditKeyword] = useState({
    id: 0,
    keyword: '',
    description: '',
    keyword_type: 'tag',
    is_featured: false,
  });
  const [newKeyword, setNewKeyword] = useState({
    keyword: '',
    description: '',
    keyword_type: 'tag',
    is_featured: false,
  });

  useEffect(() => {
    fetchKeywords();
  }, [filter, sortBy, sortOrder]);

  const fetchKeywords = async () => {
    setLoading(true);

    let query = supabase
      .from('keywords')
      .select('*')
      .order(sortBy, { ascending: sortOrder === 'asc' });

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

    const { error } = await supabase.from('keywords').insert({
      keyword: newKeyword.keyword,
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

  const handlePostCountClick = async (keyword: Keyword) => {
    setSelectedKeyword(keyword);
    setLoadingPosts(true);

    // post_keywordsテーブルから投稿IDを取得
    const { data: postKeywords } = await supabase
      .from('post_keywords')
      .select('post_id')
      .eq('keyword_id', keyword.id);

    if (postKeywords && postKeywords.length > 0) {
      const postIds = postKeywords.map(pk => pk.post_id);

      // 投稿情報を取得
      const { data: posts } = await supabase
        .from('posts')
        .select('id, title, created_at, user_id, status')
        .in('id', postIds)
        .order('created_at', { ascending: false });

      if (posts) {
        // ユーザー情報を取得
        const userIds = [...new Set(posts.map(p => p.user_id).filter(Boolean))];
        const { data: users } = await supabase
          .from('users')
          .select('id, name')
          .in('id', userIds);

        const userMap = new Map(users?.map(u => [u.id, u]) || []);
        const postsWithUsers = posts.map(post => ({
          ...post,
          users: post.user_id ? userMap.get(post.user_id) : null
        }));

        setKeywordPosts(postsWithUsers as Post[]);
      }
    } else {
      setKeywordPosts([]);
    }

    setLoadingPosts(false);
  };

  const handleEditClick = (keyword: Keyword) => {
    setEditKeyword({
      id: keyword.id,
      keyword: keyword.keyword,
      description: keyword.description || '',
      keyword_type: keyword.keyword_type,
      is_featured: keyword.is_featured,
    });
    setShowEditModal(true);
  };

  const handleUpdateKeyword = async () => {
    if (!editKeyword.keyword.trim()) {
      alert('キーワードを入力してください');
      return;
    }

    const { error } = await supabase
      .from('keywords')
      .update({
        keyword: editKeyword.keyword,
        description: editKeyword.description || null,
        keyword_type: editKeyword.keyword_type,
        is_featured: editKeyword.is_featured,
      })
      .eq('id', editKeyword.id);

    if (error) {
      alert('キーワードの更新に失敗しました: ' + error.message);
      return;
    }

    setShowEditModal(false);
    fetchKeywords();
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('post_count')}>
                    投稿数 {sortBy === 'post_count' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('search_count')}>
                    検索回数 {sortBy === 'search_count' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('view_count')}>
                    閲覧数 {sortBy === 'view_count' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('created_at')}>
                    作成日 {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('updated_at')}>
                    更新日 {sortBy === 'updated_at' && (sortOrder === 'asc' ? '↑' : '↓')}
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
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handlePostCountClick(keyword)}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {keyword.post_count}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{keyword.search_count}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{keyword.view_count}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(keyword.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(keyword.updated_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditClick(keyword)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDeleteKeyword(keyword.id)}
                          className="text-red-600 hover:text-red-800"
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

      {/* 編集モーダル */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">キーワード編集</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  キーワード *
                </label>
                <input
                  type="text"
                  value={editKeyword.keyword}
                  onChange={(e) => setEditKeyword({ ...editKeyword, keyword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  説明
                </label>
                <textarea
                  value={editKeyword.description}
                  onChange={(e) => setEditKeyword({ ...editKeyword, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="キーワードの説明を入力"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  タイプ
                </label>
                <select
                  value={editKeyword.keyword_type}
                  onChange={(e) => setEditKeyword({ ...editKeyword, keyword_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="tag">タグ</option>
                  <option value="category">カテゴリ</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-featured"
                  checked={editKeyword.is_featured}
                  onChange={(e) => setEditKeyword({ ...editKeyword, is_featured: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="edit-featured" className="text-sm text-gray-700">
                  注目キーワードとして表示
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateKeyword}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                更新
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 投稿一覧モーダル */}
      {selectedKeyword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                「{selectedKeyword.keyword}」に紐付いた投稿一覧
              </h2>
              <button
                onClick={() => setSelectedKeyword(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {loadingPosts ? (
              <div className="text-center py-8">読み込み中...</div>
            ) : keywordPosts.length > 0 ? (
              <div className="space-y-2">
                {keywordPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/admin/posts/${post.id}/edit`}
                    className="block bg-white hover:bg-gray-50 p-3 border border-gray-300 rounded-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{post.title}</h3>
                        <div className="mt-1 text-sm text-gray-500">
                          <span>ID: {post.id}</span>
                          <span className="ml-4">
                            投稿者: {post.users?.name || 'ゲスト'}
                          </span>
                          <span className="ml-4">
                            {new Date(post.created_at).toLocaleDateString('ja-JP')}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className={`px-2 py-1 text-xs rounded ${
                          post.status === 'publish' || post.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {post.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                このキーワードに紐付いた投稿はありません
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedKeyword(null)}
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
