'use client';

import { useState, useMemo } from 'react';
import { Ban, CheckCircle, ArrowUpDown, Trash2 } from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  user_img_url: string | null;
  created_at: string;
  is_banned?: boolean;
  status?: number;
  profile_slug?: string | null;
}

interface UsersTableProps {
  users: User[];
}

type SortField = 'id' | 'name' | 'email' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function UsersTable({ users: initialUsers }: UsersTableProps) {
  const [users, setUsers] = useState(initialUsers);
  const [loading, setLoading] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const handleToggleBan = async (userId: number, currentBanStatus: boolean) => {
    const action = currentBanStatus ? '解除' : 'BAN';
    
    if (!confirm(`このユーザーを${action}しますか？`)) {
      return;
    }

    setLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_banned: !currentBanStatus }),
      });

      if (response.ok) {
        setUsers(users.map(u => 
          u.id === userId ? { ...u, is_banned: !currentBanStatus } : u
        ));
        alert(`ユーザーを${action}しました`);
      } else {
        alert(`${action}に失敗しました`);
      }
    } catch (error) {
      console.error('Error toggling user ban:', error);
      alert(`${action}に失敗しました`);
    } finally {
      setLoading(null);
    }
  };

  const handleChangeStatus = async (userId: number, newStatus: number) => {
    setLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setUsers(users.map(u => 
          u.id === userId ? { ...u, status: newStatus } : u
        ));
        alert('権限を変更しました');
      } else {
        alert('権限変更に失敗しました');
      }
    } catch (error) {
      console.error('Error changing user status:', error);
      alert('権限変更に失敗しました');
    } finally {
      setLoading(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: number, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) {
      alert('削除するユーザーを選択してください');
      return;
    }

    if (!confirm(`${selectedUsers.length}人のユーザーを削除しますか？この操作は取り消せません。`)) {
      return;
    }

    setBulkDeleting(true);
    try {
      const response = await fetch('/api/admin/users/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: selectedUsers }),
      });

      if (response.ok) {
        setUsers(users.filter(u => !selectedUsers.includes(u.id)));
        setSelectedUsers([]);
        alert(`${selectedUsers.length}人のユーザーを削除しました`);
      } else {
        alert('削除に失敗しました');
      }
    } catch (error) {
      console.error('Error deleting users:', error);
      alert('削除に失敗しました');
    } finally {
      setBulkDeleting(false);
    }
  };

  const sortedUsers = useMemo(() => {
    const sorted = [...users].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [users, sortField, sortDirection]);

  const getStatusColor = (status?: number) => {
    switch (status) {
      case 6: return 'bg-yellow-100 text-yellow-800';
      case 4: return 'bg-red-100 text-red-800';
      case 3: return 'bg-purple-100 text-purple-800';
      case 2: return 'bg-blue-100 text-blue-800';
      case 1: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* 一括操作バー */}
      {selectedUsers.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-blue-800">
            {selectedUsers.length}人のユーザーを選択中
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {bulkDeleting ? '削除中...' : '選択したユーザーを削除'}
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('id')}>
                <div className="flex items-center gap-1">
                  ID
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                アバター
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">
                  ユーザー名
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('email')}>
                <div className="flex items-center gap-1">
                  メールアドレス
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1">
                  権限
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('created_at')}>
                <div className="flex items-center gap-1">
                  登録日
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <a
                    href={`/admin/users/${user.id}/edit`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {user.id}
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                    {user.user_img_url ? (
                      <img
                        src={user.user_img_url}
                        alt={user.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400">?</div>';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        ?
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.profile_slug ? (
                    <a
                      href={`/users/${user.profile_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {user.name}
                    </a>
                  ) : (
                    <span className="text-gray-500">{user.name}</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <a
                    href={`/admin/users/${user.id}/edit`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {user.email}
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={user.status || 0}
                    onChange={(e) => handleChangeStatus(user.id, parseInt(e.target.value))}
                    disabled={loading === user.id}
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)} disabled:opacity-50`}
                  >
                    <option value="1">会員</option>
                    <option value="2">編集者</option>
                    <option value="3">運営者</option>
                    <option value="4">停止</option>
                    <option value="6">AI会員</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.is_banned
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {user.is_banned ? 'BAN' : 'アクティブ'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString('ja-JP')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleToggleBan(user.id, user.is_banned || false)}
                    disabled={loading === user.id}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded text-sm font-medium disabled:opacity-50 ${
                      user.is_banned
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                    title={user.is_banned ? 'BAN解除' : 'BANする'}
                  >
                    {user.is_banned ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        BAN解除
                      </>
                    ) : (
                      <>
                        <Ban className="w-4 h-4" />
                        BAN
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">ユーザーがいません</p>
        </div>
      )}
    </div>
  );
}
