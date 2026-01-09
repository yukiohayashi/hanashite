'use client';

import { useState } from 'react';
import { Trash2, ExternalLink } from 'lucide-react';

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

interface CommentsTableProps {
  comments: Comment[];
}

export default function CommentsTable({ comments: initialComments }: CommentsTableProps) {
  const [comments, setComments] = useState(initialComments);
  const [loading, setLoading] = useState<number | null>(null);

  const handleDelete = async (commentId: number) => {
    if (!confirm('このコメントを削除しますか？この操作は取り消せません。')) {
      return;
    }

    setLoading(commentId);
    try {
      const response = await fetch(`/api/admin/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setComments(comments.filter(c => c.id !== commentId));
        alert('コメントを削除しました');
      } else {
        alert('削除に失敗しました');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('削除に失敗しました');
    } finally {
      setLoading(null);
    }
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                コメント内容
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                投稿者
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                投稿
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                作成日
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {comments.map((comment) => (
              <tr key={comment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <a
                    href={`/admin/comments/${comment.id}/edit`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {comment.id}
                  </a>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                  <div className="line-clamp-2">
                    {truncateContent(comment.content)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {comment.users?.name || 'ゲスト'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                  <a
                    href={`/posts/${comment.post_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                  >
                    <span className="truncate">
                      {comment.posts?.title || `投稿 #${comment.post_id}`}
                    </span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(comment.created_at).toLocaleDateString('ja-JP')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleDelete(comment.id)}
                    disabled={loading === comment.id}
                    className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    title="削除"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {comments.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">コメントがありません</p>
        </div>
      )}
    </div>
  );
}
