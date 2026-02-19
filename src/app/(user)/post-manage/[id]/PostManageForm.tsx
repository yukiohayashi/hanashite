'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Post {
  id: number;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  deadline_at: string | null;
  status: string;
  best_answer_id: number | null;
}

interface Comment {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
  user_name: string;
  avatar_url?: string;
}

interface PostManageFormProps {
  post: Post;
  comments: Comment[];
}

export default function PostManageForm({ post, comments }: PostManageFormProps) {
  // deadline_atをdate形式（YYYY-MM-DD）に変換
  const formatDeadlineForInput = (deadline: string | null) => {
    if (!deadline) return '';
    try {
      const date = new Date(deadline);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  const [title, setTitle] = useState(post.title);
  const [content] = useState(post.content);
  const [deadline, setDeadline] = useState(formatDeadlineForInput(post.deadline_at));
  const [addendum, setAddendum] = useState('');
  const [bestAnswerId, setBestAnswerId] = useState(post.best_answer_id || null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [showConfirm, setShowConfirm] = useState(false);

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleShowConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleUpdatePost = async () => {
    setLoading(true);

    try {
      // 追記がある場合、contentの末尾に追加
      let updatedContent = content;
      if (addendum.trim()) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('ja-JP', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        updatedContent = `${content}\n\n【追記】${dateStr}\n${addendum.trim()}`;
      }

      // 締切日時をISO形式に変換（時刻は00:00固定）
      let deadlineAt = null;
      if (deadline) {
        deadlineAt = new Date(`${deadline}T00:00:00`).toISOString();
      }

      const requestBody = {
          title,
          content: updatedContent,
          deadline_at: deadlineAt,
        };

      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        // 更新成功後、直接記事公開ページに遷移（メッセージはクエリパラメータで渡す）
        window.location.href = `/posts/${post.id}?updated=true`;
      } else {
        showMessage(data.error || '更新に失敗しました', 'error');
      }
    } catch {
      showMessage('エラーが発生しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  
  const handleSelectBestAnswer = async (commentId: number) => {
    setLoading(true);

    try {
      const response = await fetch(`/api/posts/${post.id}/best-answer`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          best_answer_id: commentId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setBestAnswerId(commentId);
        showMessage('ベストアンサーを選択しました', 'success');
      } else {
        showMessage(data.error || '選択に失敗しました', 'error');
      }
    } catch {
      showMessage('エラーが発生しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBestAnswer = async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/posts/${post.id}/best-answer`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setBestAnswerId(null);
        showMessage('ベストアンサーを解除しました', 'success');
      } else {
        showMessage(data.error || '解除に失敗しました', 'error');
      }
    } catch {
      showMessage('エラーが発生しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveToTrash = async () => {
    if (!confirm('この記事を削除しますか？')) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'trash',
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage('記事を削除しました', 'success');
        setTimeout(() => {
          window.location.href = '/my-posts';
        }, 1500);
      } else {
        showMessage(data.error || '削除に失敗しました', 'error');
      }
    } catch {
      showMessage('エラーが発生しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 確認画面の表示
  if (showConfirm) {
    const updatedContent = addendum.trim() 
      ? `${content}\n\n【追記】${new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n${addendum.trim()}`
      : content;

    return (
      <div className="space-y-6">
        {message && (
          <div className={`p-4 rounded-md ${
            messageType === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-500 rounded-md p-4">
          <p className="text-blue-800">以下の内容で更新します。よろしければ「この内容で更新」ボタンをクリックしてください。</p>
        </div>

        <div className="bg-white shadow-sm p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">更新内容の確認</h2>
          
          <div className="space-y-4">
            <div>
              <p className="font-bold text-gray-700 text-sm">タイトル</p>
              <p className="mt-1 text-lg">{title}</p>
            </div>
            
            <div>
              <p className="font-bold text-gray-700 text-sm">内容</p>
              <div className="mt-1 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200">
                {updatedContent}
              </div>
            </div>
            
            {deadline && (
              <div>
                <p className="font-bold text-gray-700 text-sm">締切日時</p>
                <p className="mt-1">{deadline}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            戻る
          </button>
          <button
            type="button"
            onClick={handleUpdatePost}
            disabled={loading}
            className="bg-[#ff6b35] hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {loading ? '更新中...' : 'この内容で更新する'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* メッセージ表示 */}
      {message && (
        <div className={`p-4 rounded-md ${
          messageType === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* 記事編集フォーム */}
      <div className="bg-white shadow-sm p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">記事の編集</h2>
          <Link
            href={`/posts/${post.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
          >
            記事ページを見る →
          </Link>
        </div>
        <form onSubmit={handleShowConfirm} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              タイトル
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              maxLength={35}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              内容
            </label>
            <div
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 min-h-[200px] whitespace-pre-wrap"
              style={{ minHeight: '800px' }}
              dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br>') }}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              締切日時（任意）
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              追記（任意）
            </label>
            <textarea
              value={addendum}
              onChange={(e) => setAddendum(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              rows={4}
              placeholder="追記したい内容を入力してください。更新すると本文の末尾に【追記】として追加されます。"
            />
          </div>
          
          <div className="flex justify-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#ff6b35] hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              確認画面へ進む
            </button>
            <button
              type="button"
              onClick={handleMoveToTrash}
              disabled={loading || bestAnswerId !== null}
              className="bg-gray-500 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
              title={bestAnswerId !== null ? 'ベストアンサーが選択されているため削除できません' : ''}
            >
              削除する
            </button>
          </div>
        </form>
      </div>

      {/* ベストアンサー選択 */}
      <div className="bg-white shadow-sm p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">ベストアンサーの選択</h2>
          {bestAnswerId && (
            <button
              onClick={handleRemoveBestAnswer}
              disabled={loading}
              className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              ベストアンサーを解除
            </button>
          )}
        </div>
        
        {comments.length === 0 ? (
          <p className="text-gray-500">まだ回答がありません</p>
        ) : (
          <div className="space-y-3">
            {comments
              .filter(comment => comment.user_id !== post.user_id) // 投稿者自身のコメントを除外
              .map((comment) => (
              <div
                key={comment.id}
                className={`p-4 border rounded-md ${
                  bestAnswerId === comment.id
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Link 
                    href={`/users/${comment.user_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Image
                      src={comment.avatar_url || `https://api.dicebear.com/9.x/adventurer/svg?seed=${comment.user_id}&size=40`}
                      alt={comment.user_name}
                      width={40}
                      height={40}
                      unoptimized
                      className="w-10 h-10 rounded-full hover:opacity-80 transition-opacity"
                    />
                  </Link>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <Link 
                        href={`/users/${comment.user_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-gray-900 hover:text-orange-600 transition-colors"
                      >
                        {comment.user_name}
                      </Link>
                      <span className="text-sm text-gray-500">
                        {new Date(comment.created_at).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                    
                    <div className="mt-3 flex items-center gap-2">
                      {bestAnswerId === comment.id ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          ✓ ベストアンサー
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSelectBestAnswer(comment.id)}
                          disabled={loading}
                          className="text-sm text-orange-600 hover:text-orange-800 disabled:opacity-50"
                        >
                          この回答をベストアンサーにする
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
