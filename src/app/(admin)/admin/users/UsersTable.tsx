'use client';

import { useState, useMemo } from 'react';
import { ArrowUpDown, Trash2 } from 'lucide-react';

interface User {
  id: string | number;
  name: string;
  email: string;
  image: string | null;
  created_at: string;
  is_banned?: boolean;
  status?: number;
  profile_slug?: string | null;
  avatar_seed?: string | null;
  use_custom_image?: boolean | null;
  post_count?: number;
  marriage?: string | null;
}

interface UsersTableProps {
  users: User[];
}

type SortField = 'id' | 'name' | 'email' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function UsersTable({ users: initialUsers }: UsersTableProps) {
  const [users, setUsers] = useState(initialUsers);
  const [loading, setLoading] = useState<string | number | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedUsers, setSelectedUsers] = useState<(string | number)[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const handleDelete = async (userId: string | number) => {
    setLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_banned: true }),
      });

      if (response.ok) {
        setUsers(users.map(u => 
          u.id === userId ? { ...u, is_banned: true } : u
        ));
        alert(`ユーザーを削除しました`);
      } else {
        alert(`削除に失敗しました`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(`削除に失敗しました`);
    } finally {
      setLoading(null);
    }
  };

  const handleChangeStatus = async (userId: string | number, newStatus: number) => {
    console.log('🔄 ステータス変更開始:', { userId, newStatus });
    setLoading(userId);
    try {
      const url = `/api/admin/users/${userId}`;
      const body = { status: newStatus };
      console.log('📤 リクエスト:', { url, body });
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      console.log('📥 レスポンス:', { status: response.status, ok: response.ok });
      const data = await response.json();
      console.log('📥 レスポンスボディ:', data);

      if (response.ok) {
        setUsers(users.map(u => 
          u.id === userId ? { ...u, status: newStatus } : u
        ));
        alert('権限を変更しました');
      } else {
        alert(`権限変更に失敗しました: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error changing user status:', error);
      alert('権限変更に失敗しました');
    } finally {
      setLoading(null);
    }
  };

  const handleChangeMarriage = async (userId: string | number, newMarriage: string | null) => {
    setLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ marriage: newMarriage }),
      });

      if (response.ok) {
        setUsers(users.map(u => 
          u.id === userId ? { ...u, marriage: newMarriage } : u
        ));
        alert('恋愛ステータスを変更しました');
      } else {
        alert('恋愛ステータス変更に失敗しました');
      }
    } catch (error) {
      console.error('Error changing marriage status:', error);
      alert('恋愛ステータス変更に失敗しました');
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

  const handleSelectUser = (userId: string | number, checked: boolean) => {
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
      case 1: return 'bg-purple-100 text-purple-800';
      case 2: return 'bg-blue-100 text-blue-800';
      case 3: return 'bg-green-100 text-green-800';
      case 4: return 'bg-yellow-100 text-yellow-800';
      case 9: return 'bg-red-100 text-red-800';
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
          <thead className="bg-white">
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
                  ニックネーム
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
                恋愛ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                相談件数
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
              <tr 
                key={user.id} 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => handleSelectUser(user.id, !selectedUsers.includes(user.id))}
              >
                <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={`/admin/users/${user.id}/edit`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {user.id}
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                    {user.use_custom_image && user.image ? (
                      <img
                        src={user.image}
                        alt={user.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400">?</div>';
                        }}
                      />
                    ) : user.avatar_seed && (user.avatar_seed.startsWith('f20_') || user.avatar_seed.startsWith('f30_') || user.avatar_seed.startsWith('f40_') || 
                               user.avatar_seed.startsWith('m20_') || user.avatar_seed.startsWith('m30_') || user.avatar_seed.startsWith('m40_') ||
                               user.avatar_seed.startsWith('cat_') || user.avatar_seed.startsWith('dog_') || user.avatar_seed.startsWith('rabbit_') ||
                               user.avatar_seed.startsWith('bear_') || user.avatar_seed.startsWith('other_')) ? (
                      <img
                        src={`/images/local-avatars/${user.avatar_seed}.webp`}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src="/images/local-avatars/default-avatar.webp"
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
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
                <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={user.status || 0}
                    onChange={(e) => handleChangeStatus(user.id, parseInt(e.target.value))}
                    disabled={loading === user.id}
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)} disabled:opacity-50`}
                  >
                    <option value="1">運営者</option>
                    <option value="2">編集者</option>
                    <option value="3">会員</option>
                    <option value="4">AI会員</option>
                    <option value="9">停止</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={user.marriage || ''}
                    onChange={(e) => handleChangeMarriage(user.id, e.target.value || null)}
                    disabled={loading === user.id}
                    className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50"
                  >
                    <option value="">未設定</option>
                    <option value="private">非公開</option>
                    <option value="single">独身</option>
                    <option value="dating">交際中</option>
                    <option value="married">既婚</option>
                    <option value="divorced">離婚</option>
                    <option value="other">その他</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={`/admin/users/${user.id}/posts`}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  >
                    {user.post_count || 0}件
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString('ja-JP')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleDelete(user.id)}
                    disabled={loading === user.id}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded text-sm font-medium disabled:opacity-50 bg-red-100 text-red-700 hover:bg-red-200"
                  >
                    削除
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
