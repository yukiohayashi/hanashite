'use client';

import { useState, useEffect } from 'react';
import { Tag, Sparkles, AlertCircle } from 'lucide-react';

interface Post {
  id: number;
  title: string;
  created_at: string;
  ai_tagged: boolean;
  ai_tagged_date: string | null;
}

export default function AITaggerPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [selectedPosts, setSelectedPosts] = useState<number[]>([]);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/posts?limit=100');
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
    setLoading(false);
  };

  const handleTagPost = async (postId: number) => {
    setProcessing(postId);
    setMessage('');

    try {
      const response = await fetch(`/api/posts/${postId}/ai-tag`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ 投稿ID ${postId} にタグを付けました`);
        fetchPosts();
      } else {
        setMessage(`❌ エラー: ${data.error}`);
      }
    } catch (error) {
      setMessage('❌ エラーが発生しました');
    }

    setProcessing(null);
  };

  const handleBulkTag = async () => {
    if (selectedPosts.length === 0) {
      setMessage('❌ 投稿を選択してください');
      return;
    }

    if (!confirm(`${selectedPosts.length}件の投稿にタグを付けますか？`)) {
      return;
    }

    setMessage('');
    let successCount = 0;
    let errorCount = 0;

    for (const postId of selectedPosts) {
      setProcessing(postId);
      try {
        const response = await fetch(`/api/posts/${postId}/ai-tag`, {
          method: 'POST',
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }

    setProcessing(null);
    setMessage(`✅ 完了: 成功 ${successCount}件、失敗 ${errorCount}件`);
    setSelectedPosts([]);
    fetchPosts();
  };

  const toggleSelectPost = (postId: number) => {
    setSelectedPosts(prev =>
      prev.includes(postId)
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPosts.length === posts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(posts.map(p => p.id));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI自動タグ付け</h1>
        <p className="mt-1 text-sm text-gray-600">
          投稿にカテゴリとキーワードを自動割り当て
        </p>
      </div>

      {/* API設定リンク */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          OpenAI APIキーは <a href="/admin/api-settings" className="font-medium underline hover:text-blue-600">API設定</a> で管理されています
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg ${message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      {/* 説明 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div>
          <h3 className="font-bold text-yellow-900">AI自動タグ付けについて</h3>
          <ul className="text-sm text-yellow-800 mt-2 space-y-1">
            <li>• AI を使用して投稿内容を分析し、最適なカテゴリとキーワードを自動割り当てします</li>
            <li>• カテゴリは信頼度が高いもの1つのみを割り当てます</li>
            <li>• キーワードは最大5つまで抽出します</li>
            <li>• OpenAI APIキーは <a href="/admin/api-settings" className="underline hover:text-yellow-900">API設定</a> で管理してください</li>
          </ul>
        </div>
      </div>

      {/* 一括操作 */}
      {selectedPosts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">
              {selectedPosts.length}件選択中
            </span>
            <button
              onClick={handleBulkTag}
              disabled={processing !== null}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              一括タグ付け
            </button>
          </div>
        </div>
      )}

      {/* 投稿一覧 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">読み込み中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedPosts.length === posts.length && posts.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    タイトル
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    作成日
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    タグ付け状態
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedPosts.includes(post.id)}
                        onChange={() => toggleSelectPost(post.id)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {post.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <a
                        href={`/posts/${post.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {post.title}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(post.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-4 py-3">
                      {post.ai_tagged ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          <Tag className="w-3 h-3" />
                          タグ付け済み
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          未タグ付け
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleTagPost(post.id)}
                        disabled={processing === post.id}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-1 ml-auto"
                      >
                        {processing === post.id ? (
                          '処理中...'
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            タグ付け
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">投稿がありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
