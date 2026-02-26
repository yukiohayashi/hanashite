'use client';

import { useState } from 'react';

interface Point {
  id: number;
  user_id: number;
  points: number;
  type: string;
  description?: string;
  related_id?: number;
  created_at: string;
  user: {
    id: number;
    name: string;
  } | null;
}

interface PointsTableProps {
  points: Point[];
}

export default function PointsTable({ points: initialPoints }: PointsTableProps) {
  const [points, setPoints] = useState(initialPoints);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);

  // 全選択/全解除
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(points.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  // 個別選択
  const handleSelectPoint = (pointId: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, pointId]);
    } else {
      setSelectedIds(selectedIds.filter(id => id !== pointId));
    }
  };

  // 一括削除
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      alert('削除するポイント履歴を選択してください');
      return;
    }

    if (!confirm(`選択した${selectedIds.length}件のポイント履歴を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch('/api/admin/points/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pointIds: selectedIds }),
      });

      const data = await response.json();

      if (response.ok) {
        setPoints(points.filter(p => !selectedIds.includes(p.id)));
        setSelectedIds([]);
        alert(data.message);
      } else {
        alert(data.error || '削除に失敗しました');
      }
    } catch (error) {
      console.error('Error bulk deleting points:', error);
      alert('削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'vote':
        return '投票';
      case 'comment':
        return 'コメント';
      case 'like':
        return 'いいね';
      case 'favorite':
        return 'お気に入り';
      case 'manual':
        return '手動付与';
      case 'login':
        return 'ログイン';
      case 'work_vote':
        return 'ワーク投票';
      case 'work_post':
        return 'ワーク投稿';
      case 'signup':
        return '新規登録';
      case 'profile':
        return 'プロフィール編集';
      case 'post':
        return '投稿作成';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'vote':
        return 'bg-blue-100 text-blue-800';
      case 'comment':
        return 'bg-green-100 text-green-800';
      case 'like':
        return 'bg-pink-100 text-pink-800';
      case 'favorite':
        return 'bg-purple-100 text-purple-800';
      case 'manual':
        return 'bg-gray-100 text-gray-800';
      case 'login':
        return 'bg-yellow-100 text-yellow-800';
      case 'work_vote':
        return 'bg-indigo-100 text-indigo-800';
      case 'work_post':
        return 'bg-orange-100 text-orange-800';
      case 'signup':
        return 'bg-teal-100 text-teal-800';
      case 'profile':
        return 'bg-cyan-100 text-cyan-800';
      case 'post':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
              {deleting ? '削除中...' : '選択したポイント履歴を削除'}
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
                  checked={selectedIds.length === points.length && points.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ユーザー
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ポイント
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                種別
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                説明
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                日時
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {points.map((point) => (
              <tr key={point.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(point.id)}
                    onChange={(e) => handleSelectPoint(point.id, e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {point.id}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <strong>{point.user?.name || '不明'}</strong>
                  <br />
                  <small className="text-gray-500">ID: {point.user_id}</small>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`font-bold ${point.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {point.points >= 0 ? '+' : ''}{point.points}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex px-2 py-1 text-xs rounded ${getTypeColor(point.type)}`}>
                    {getTypeLabel(point.type)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {point.description || '—'}
                  {point.related_id && point.related_id > 0 && (
                    <span className="text-xs text-gray-500 ml-2">
                      (関連ID: {point.related_id})
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(point.created_at).toLocaleDateString('ja-JP')}
                  <br />
                  {new Date(point.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {points.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">ポイント履歴がありません</p>
        </div>
      )}
    </div>
  );
}
