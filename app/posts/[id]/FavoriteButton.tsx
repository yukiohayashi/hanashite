'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface FavoriteButtonProps {
  postId: number;
}

export default function FavoriteButton({ postId }: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    fetchFavoriteStatus();
  }, [postId, status]);

  const fetchFavoriteStatus = async () => {
    if (!session?.user?.id) return;
    
    try {
      const response = await fetch(`/api/favorites?userId=${session.user.id}&limit=1000`);
      const data = await response.json();
      
      if (data.success && data.posts) {
        const favorited = data.posts.some((p: any) => p.id === postId);
        setIsFavorited(favorited);
      }
    } catch (error) {
      console.error('お気に入り状態の取得エラー:', error);
    }
  };

  const handleFavorite = async () => {
    if (status !== 'authenticated' || !session?.user?.id) {
      alert('お気に入りに追加するにはログインが必要です');
      window.location.href = '/login';
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: session.user.id,
          postId: postId 
        }),
      });

      if (!response.ok) {
        throw new Error('お気に入りの更新に失敗しました');
      }

      const data = await response.json();
      
      if (data.success) {
        setIsFavorited(data.action === 'added');
        setCount(data.count);
      }
    } catch (error) {
      console.error('お気に入りエラー:', error);
      alert('お気に入りの操作に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleFavorite}
      disabled={isLoading}
      className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
        isFavorited 
          ? 'text-yellow-600' 
          : 'text-gray-600 hover:text-yellow-500'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className="text-xl">{isFavorited ? '⭐' : '☆'}</span>
      {count > 0 && <span className="text-xs">({count})</span>}
    </button>
  );
}
