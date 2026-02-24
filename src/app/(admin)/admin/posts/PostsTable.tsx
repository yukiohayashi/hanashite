'use client';

import { useState } from 'react';
import { Trash2, Eye, EyeOff, ArrowUpDown } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

interface Post {
  id: number;
  title: string;
  content?: string;
  status: string;
  created_at: string;
  user_id: number;
  thumbnail_url?: string | null;
  og_image?: string | null;
  category_id?: number | null;
  total_votes?: number;
  best_answer_id?: number | null;
  best_answer_selected_at?: string | null;
  deadline_at?: string | null;
  users: {
    id: number;
    name: string;
  } | null;
  categories?: { id: number; name: string }[] | { id: number; name: string } | null;
  keywords?: Array<{ id: number; keyword: string }>;
  bestAnswer?: { userId: string; userName: string } | null;
}

interface PostsTableProps {
  posts: Post[];
  initialCounts?: {
    all: number;
    published: number;
    draft: number;
    trash: number;
  };
}

export default function PostsTable({ posts: initialPosts, initialCounts }: PostsTableProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [counts, setCounts] = useState(initialCounts);
  const router = useRouter();
  const searchParams = useSearchParams();

  // URLパラメータからソート状態を取得
  const sortBy = searchParams.get('sort') || '';
  const sortOrder = searchParams.get('order') || 'desc';

  // ソート処理（URLパラメータを変更してページをリロード）
  const handleSort = (column: string) => {
    const newOrder = sortBy === column && sortOrder === 'desc' ? 'asc' : 'desc';
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', column);
    params.set('order', newOrder);
    window.location.href = `${window.location.pathname}?${params.toString()}`;
  };

  // ゴミ箱カウントを更新する関数
  const updateTrashCount = (increment: number) => {
    if (counts) {
      setCounts({
        ...counts,
        trash: counts.trash + increment,
      });
      // DOMを直接更新してゴミ箱カウントを反映
      const trashLink = document.querySelector('a[href*="status=trash"]');
      if (trashLink) {
        const match = trashLink.textContent?.match(/ゴミ箱 \((\d+)\)/);
        if (match) {
          const currentCount = parseInt(match[1]);
          trashLink.textContent = `ゴミ箱 (${currentCount + increment})`;
        }
      }
    }
  };

  // 全選択/全解除
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(posts.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  // 個別選択
  const handleSelectPost = (postId: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, postId]);
    } else {
      setSelectedIds(selectedIds.filter(id => id !== postId));
    }
  };

  // 一括削除（ゴミ箱移動または完全削除）
  const handleBulkDelete = async (permanentDelete: boolean = false) => {
    if (selectedIds.length === 0) {
      alert('削除する投稿を選択してください');
      return;
    }

    // 完全削除の場合のみ確認モーダルを表示
    if (permanentDelete) {
      const message = `選択した${selectedIds.length}件の投稿を完全に削除しますか？この操作は取り消せません。`;
      if (!confirm(message)) {
        return;
      }
    }

    setBulkDeleting(true);
    try {
      const response = await fetch('/api/admin/posts/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postIds: selectedIds, permanentDelete }),
      });

      const data = await response.json();

      if (response.ok) {
        const deletedCount = selectedIds.length;
        if (permanentDelete) {
          // 完全削除の場合はリストから削除
          setPosts(posts.filter(p => !selectedIds.includes(p.id)));
          // ゴミ箱から削除した場合、ゴミ箱カウントを減算
          updateTrashCount(-deletedCount);
        } else {
          // ゴミ箱移動の場合はステータスを更新
          setPosts(posts.map(p => 
            selectedIds.includes(p.id) ? { ...p, status: 'trash' } : p
          ));
          // ゴミ箱カウントを非同期で更新（加算）
          updateTrashCount(deletedCount);
        }
        setSelectedIds([]);
        // モーダル表示を削除（alertを削除）
      } else {
        alert(data.error || '削除に失敗しました');
      }
    } catch (error) {
      console.error('Error bulk deleting posts:', error);
      alert('削除に失敗しました');
    } finally {
      setBulkDeleting(false);
    }
  };

  // 一括復元
  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) {
      alert('復元する投稿を選択してください');
      return;
    }

    if (!confirm(`選択した${selectedIds.length}件の投稿を復元して公開しますか？`)) {
      return;
    }

    setBulkDeleting(true);
    try {
      const response = await fetch('/api/admin/posts/bulk-restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postIds: selectedIds }),
      });

      const data = await response.json();

      if (response.ok) {
        // 復元の場合はステータスを更新
        setPosts(posts.map(p => 
          selectedIds.includes(p.id) ? { ...p, status: 'published' } : p
        ));
        setSelectedIds([]);
        alert(data.message);
      } else {
        alert(data.error || '復元に失敗しました');
      }
    } catch (error) {
      console.error('Error bulk restoring posts:', error);
      alert('復元に失敗しました');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDelete = async (postId: number) => {
    if (!confirm('この投稿を削除しますか？この操作は取り消せません。')) {
      return;
    }

    setLoading(postId);
    try {
      const response = await fetch(`/api/admin/posts/${postId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPosts(posts.filter(p => p.id !== postId));
        alert('投稿を削除しました');
      } else {
        alert('削除に失敗しました');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('削除に失敗しました');
    } finally {
      setLoading(null);
    }
  };

  const handleToggleStatus = async (postId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    
    setLoading(postId);
    try {
      const response = await fetch(`/api/admin/posts/${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setPosts(posts.map(p => 
          p.id === postId ? { ...p, status: newStatus } : p
        ));
        alert(`投稿を${newStatus === 'published' ? '公開' : '非公開'}にしました`);
      } else {
        alert('ステータス変更に失敗しました');
      }
    } catch (error) {
      console.error('Error updating post status:', error);
      alert('ステータス変更に失敗しました');
    } finally {
      setLoading(null);
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
            <div className="flex gap-2">
              {/* ゴミ箱以外の場合はゴミ箱移動ボタン */}
              {posts.some(p => selectedIds.includes(p.id) && p.status !== 'trash') && (
                <button
                  onClick={() => handleBulkDelete(false)}
                  disabled={bulkDeleting}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400 text-sm font-medium"
                >
                  {bulkDeleting ? '移動中...' : 'ゴミ箱に移動'}
                </button>
              )}
              {/* ゴミ箱の場合は復元ボタンと完全削除ボタン */}
              {posts.some(p => selectedIds.includes(p.id) && p.status === 'trash') && (
                <>
                  <button
                    onClick={handleBulkRestore}
                    disabled={bulkDeleting}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium"
                  >
                    {bulkDeleting ? '復元中...' : '復元して公開'}
                  </button>
                  <button
                    onClick={() => handleBulkDelete(true)}
                    disabled={bulkDeleting}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 text-sm font-medium"
                  >
                    {bulkDeleting ? '削除中...' : '完全に削除'}
                  </button>
                </>
              )}
            </div>
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
                  checked={selectedIds.length === posts.length && posts.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                画像
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                相談者
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                タイトル
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ハナシテキーワード
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                本文
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ハナシテカテゴリ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('vote_count')}>
                合計投票数 {sortBy === 'vote_count' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('deadline_at')}>
                締め切り {sortBy === 'deadline_at' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('best_answer_id')}>
                ベストアンサー {sortBy === 'best_answer_id' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('best_answer_selected_at')}>
                ベストアンサー日付 {sortBy === 'best_answer_selected_at' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('created_at')}>
                投稿日付 {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {posts.map((post) => (
              <tr 
                key={post.id} 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={(e) => {
                  // リンクやボタンのクリックは除外
                  if ((e.target as HTMLElement).tagName === 'A' || 
                      (e.target as HTMLElement).tagName === 'BUTTON' ||
                      (e.target as HTMLElement).closest('a') ||
                      (e.target as HTMLElement).closest('button')) {
                    return;
                  }
                  handleSelectPost(post.id, !selectedIds.includes(post.id));
                }}
              >
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(post.id)}
                    onChange={(e) => handleSelectPost(post.id, e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4">
                  {post.thumbnail_url || post.og_image ? (
                    <img
                      src={post.thumbnail_url || post.og_image || ''}
                      alt={post.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                      <span className="text-gray-400 text-xs">画像なし</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {post.user_id ? (
                    <a
                      href={`/admin/users/${post.user_id}/posts`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {post.users?.name || 'ゲスト'}
                    </a>
                  ) : (
                    <span>{post.users?.name || 'ゲスト'}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <a
                    href={`/admin/posts/${post.id}/edit`}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  >
                    {post.title}
                  </a>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">ID: {post.id}</span>
                    <a
                      href={`/posts/${post.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      実際のページを見る
                    </a>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {post.keywords && post.keywords.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {post.keywords.map((kw) => (
                        <span key={kw.id} className="inline-flex px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                          {kw.keyword}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {post.content ? (
                    <span className="line-clamp-2">
                      {post.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().substring(0, 20)}
                      {post.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 20 ? '...' : ''}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {post.categories ? (
                    <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      {Array.isArray(post.categories) ? post.categories[0]?.name : post.categories.name}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="font-semibold">
                    {post.total_votes || 0}票
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {post.deadline_at ? (
                    <>
                      {new Date(post.deadline_at).toLocaleDateString('ja-JP')}
                      <div className="text-xs">
                        {new Date(post.deadline_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {post.bestAnswer ? (
                    <span className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded font-semibold">
                      {post.bestAnswer.userName}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {post.best_answer_selected_at ? (
                    <>
                      {new Date(post.best_answer_selected_at).toLocaleDateString('ja-JP')}
                      <div className="text-xs">
                        {new Date(post.best_answer_selected_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(post.created_at).toLocaleDateString('ja-JP')}
                  <div className="text-xs">
                    {new Date(post.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {posts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">投稿がありません</p>
        </div>
      )}
    </div>
  );
}
