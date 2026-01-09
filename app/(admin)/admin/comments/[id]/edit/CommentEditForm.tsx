'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Comment {
  id: number;
  content: string;
  created_at: string;
  user_id: number | null;
  post_id: number;
  users: {
    id: number;
    name: string;
  } | null;
  posts: {
    id: number;
    title: string;
  } | null;
}

interface CommentEditFormProps {
  comment: Comment;
}

export default function CommentEditForm({ comment }: CommentEditFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    content: comment.content || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Sending update request:', formData);
      
      const response = await fetch(`/api/admin/comments/${comment.id}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      console.log('Response:', result);

      if (response.ok) {
        alert('コメントを更新しました');
        router.push('/admin/comments');
      } else {
        console.error('Update failed:', result);
        alert(`更新に失敗しました: ${result.error || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('Error updating comment:', error);
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
              コメントID
            </label>
            <input
              type="text"
              value={comment.id}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
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
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* その他の情報 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">その他の情報</h2>
        
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <span className="font-medium">投稿者:</span>{' '}
            {comment.users?.name || 'ゲスト'}
          </p>
          <p>
            <span className="font-medium">投稿:</span>{' '}
            <a
              href={`/posts/${comment.post_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {comment.posts?.title || `投稿 #${comment.post_id}`}
            </a>
          </p>
          <p>
            <span className="font-medium">作成日:</span>{' '}
            {new Date(comment.created_at).toLocaleString('ja-JP')}
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
          {loading ? '保存中...' : 'コメントを更新'}
        </button>
        <a
          href="/admin/comments"
          className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          キャンセル
        </a>
      </div>
    </form>
  );
}
