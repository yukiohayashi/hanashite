'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface FavoriteButtonProps {
  postId: number;
  initialCount?: number;
  initialIsFavorited?: boolean;
}

export default function FavoriteButton({ postId, initialCount = 0, initialIsFavorited = false }: FavoriteButtonProps) {
  const { data: session, status } = useSession();
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // ログイン状態が変わったら、お気に入り状態を再取得
    if (status === 'authenticated') {
      fetchFavoriteStatus();
    }
  }, [status, postId]);

  const fetchFavoriteStatus = async () => {
    try {
      const response = await fetch(`/api/favorites/check?post_id=${postId}`);
      const data = await response.json();
      setIsFavorited(data.is_favorited);
      setCount(data.count);
    } catch (error) {
      console.error('お気に入り状態の取得エラー:', error);
    }
  };

  const handleToggle = async () => {
    if (status !== 'authenticated') {
      alert('ログインが必要です');
      window.location.href = '/login';
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ post_id: postId }),
      });

      if (!response.ok) {
        throw new Error('お気に入りの更新に失敗しました');
      }

      const data = await response.json();
      setIsFavorited(data.action === 'added');
      setCount(data.count);
    } catch (error) {
      console.error('お気に入りトグルエラー:', error);
      alert('お気に入りの更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`inline-flex items-center gap-1 px-4 py-2 rounded font-bold text-sm transition-colors ${
        isFavorited
          ? 'bg-[#ff6b35] text-white hover:bg-[#e55a2b]'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span>{isFavorited ? '★' : '☆'}</span>
      <span>{isFavorited ? 'お気に入り解除' : 'お気に入り'}</span>
      <span className="text-xs">({count})</span>
    </button>
  );
}
