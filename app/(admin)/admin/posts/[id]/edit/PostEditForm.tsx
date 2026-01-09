'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Post {
  id: number;
  title: string;
  content: string;
  status: string;
  created_at: string;
  users: {
    id: number;
    name: string;
  } | null;
}

interface PostEditFormProps {
  post: Post;
}

export default function PostEditForm({ post }: PostEditFormProps) {
  const router = useRouter();
  
  console.log('Post data:', post);
  console.log('Post status:', post.status);
  
  const [formData, setFormData] = useState({
    title: post.title || '',
    content: post.content || '',
    status: post.status || 'draft',
  });
  const [loading, setLoading] = useState(false);
  
  console.log('Form data status:', formData.status);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Sending update request:', formData);
      
      const response = await fetch(`/api/admin/posts/${post.id}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      console.log('Response status:', response.status);
      console.log('Response:', JSON.stringify(result, null, 2));

      if (response.ok) {
        alert('投稿を更新しました');
        router.push('/admin/posts');
      } else {
        console.error('Update failed:', JSON.stringify(result, null, 2));
        alert(`更新に失敗しました: ${result.error || '不明なエラー'}\n詳細: ${JSON.stringify(result.details || {})}`);
      }
    } catch (error) {
      console.error('Error updating post:', error);
      alert('更新に失敗しました: ネットワークエラー');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本情報 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              投稿ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={post.id}
                disabled
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
              <a
                href={`/posts/${post.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap"
              >
                実際のページを見る
              </a>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              rows={15}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ステータス
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="draft">下書き</option>
              <option value="published">公開</option>
              <option value="trash">ゴミ箱</option>
            </select>
          </div>
        </div>
      </div>

      {/* その他の情報 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">その他の情報</h2>
        
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <span className="font-medium">投稿者:</span>{' '}
            {post.users?.name || 'ゲスト'}
          </p>
          <p>
            <span className="font-medium">作成日:</span>{' '}
            {new Date(post.created_at).toLocaleString('ja-JP')}
          </p>
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '保存中...' : '投稿を更新'}
        </button>
        <a
          href="/admin/posts"
          className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          キャンセル
        </a>
      </div>
    </form>
  );
}
