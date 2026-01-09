'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';

interface Like {
  id: number;
  like_type: string;
  target_id: number;
  user_id: number;
  created_at: string;
  user: {
    id: number;
    name: string;
  } | null;
  post: {
    id: number;
    title: string;
  } | null;
}

interface LikesTableProps {
  likes: Like[];
}

export default function LikesTable({ likes: initialLikes }: LikesTableProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);

  // 全選択/全解除
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(likes.map(l => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  // 個別選択
  const handleSelectLike = (likeId: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, likeId]);
    } else {
      setSelectedIds(selectedIds.filter(id => id !== likeId));
    }
  };

  // 一括削除
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      alert('削除するいいねを選択してください');
      return;
    }

    if (!confirm(`選択した${selectedIds.length}件のいいねを削除しますか？この操作は取り消せません。`)) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch('/api/admin/likes/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ likeIds: selectedIds }),
      });

      const data = await response.json();

      if (response.ok) {
        setLikes(likes.filter(l => !selectedIds.includes(l.id)));
        setSelectedIds([]);
        alert(data.message);
      } else {
        alert(data.error || '削除に失敗しました');
      }
    } catch (error) {
      console.error('Error bulk deleting likes:', error);
      alert('削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* 一括削除ボタン */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 px-6 py-3 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedIds.length}件選択中
            </span>
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 text-sm font-medium"
            >
              {deleting ? '削除中...' : '選択したいいねを削除'}
            </button>
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.length === likes.length && likes.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                種別
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ユーザー
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                対象
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                日時
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {likes.map((like) => (
              <tr key={like.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(like.id)}
                    onChange={(e) => handleSelectLike(like.id, e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {like.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {like.like_type === 'post' ? (
                    <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      投稿
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                      コメント
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <strong>{like.user?.name || '不明'}</strong>
                  <br />
                  <small className="text-gray-500">ID: {like.user_id}</small>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {like.like_type === 'post' && like.post ? (
                    <a href={`/posts/${like.target_id}`} target="_blank" className="text-blue-600 hover:underline">
                      {like.post.title.substring(0, 50)}
                      {like.post.title.length > 50 ? '...' : ''}
                    </a>
                  ) : (
                    <span className="text-gray-500">
                      {like.like_type} ID: {like.target_id}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(like.created_at).toLocaleDateString('ja-JP')}
                  <br />
                  {new Date(like.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {likes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">いいねがありません</p>
        </div>
      )}
    </div>
  );
}
