'use client';

import { useState, useMemo } from 'react';
import { Trash2, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

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

type SortField = 'id' | 'content' | 'user' | 'post' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function CommentsTable({ comments: initialComments }: CommentsTableProps) {
  const [comments, setComments] = useState(initialComments);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // ソート処理
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ソートアイコン
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4 ml-1 inline" /> : 
      <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

  // ソート済みコメント
  const sortedComments = useMemo(() => {
    const sorted = [...comments].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'content':
          aValue = a.content.toLowerCase();
          bValue = b.content.toLowerCase();
          break;
        case 'user':
          aValue = a.users?.name?.toLowerCase() || '';
          bValue = b.users?.name?.toLowerCase() || '';
          break;
        case 'post':
          aValue = a.posts?.title?.toLowerCase() || '';
          bValue = b.posts?.title?.toLowerCase() || '';
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [comments, sortField, sortDirection]);

  // 全選択/全解除
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(sortedComments.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  // 個別選択
  const handleSelectComment = (commentId: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, commentId]);
    } else {
      setSelectedIds(selectedIds.filter(id => id !== commentId));
    }
  };

  // 行クリックでチェックボックスをトグル
  const handleRowClick = (commentId: number, e: React.MouseEvent) => {
    // リンクやボタンをクリックした場合は無視
    const target = e.target as HTMLElement;
    if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.closest('a') || target.closest('button')) {
      return;
    }
    
    const isSelected = selectedIds.includes(commentId);
    handleSelectComment(commentId, !isSelected);
  };

  // 一括削除
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      alert('削除するコメントを選択してください');
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch('/api/admin/comments/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ commentIds: selectedIds }),
      });

      const data = await response.json();

      if (response.ok) {
        setComments(comments.filter(c => !selectedIds.includes(c.id)));
        setSelectedIds([]);
        alert(data.message);
      } else {
        alert(data.error || '削除に失敗しました');
      }
    } catch (error) {
      console.error('Error bulk deleting comments:', error);
      alert('削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
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
      {/* 一括削除バー */}
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
              {deleting ? '削除中...' : '選択したコメントを削除'}
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
                  checked={selectedIds.length === sortedComments.length && sortedComments.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('id')}
              >
                ID <SortIcon field="id" />
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('content')}
              >
                コメント内容 <SortIcon field="content" />
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('user')}
              >
                コメント投稿者 <SortIcon field="user" />
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('post')}
              >
                投稿 <SortIcon field="post" />
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('created_at')}
              >
                作成日 <SortIcon field="created_at" />
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedComments.map((comment) => (
              <tr 
                key={comment.id} 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={(e) => handleRowClick(comment.id, e)}
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(comment.id)}
                    onChange={(e) => handleSelectComment(comment.id, e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
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
                  {comment.posts ? (
                    <a
                      href={`/posts/${comment.post_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                    >
                      <span className="truncate">
                        {comment.posts.title}
                      </span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  ) : (
                    <span className="text-red-600">
                      削除された投稿 #{comment.post_id}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(comment.created_at).toLocaleString('ja-JP', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
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

      {sortedComments.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">コメントがありません</p>
        </div>
      )}
    </div>
  );
}
