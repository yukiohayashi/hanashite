'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface FavoritePost {
  id: number;
  title: string;
  created_at: string;
  user_name: string;
  og_image?: string;
  thumbnail_url?: string;
}

export default function FavoritesList() {
  const [posts, setPosts] = useState<FavoritePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.id) {
      fetchFavorites();
    }
  }, [session]);

  const fetchFavorites = async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/favorites?userId=${session.user.id}&limit=100`
      );
      const data = await response.json();

      if (data.success) {
        setPosts(data.posts);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('お気に入りの取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (postId: number) => {
    if (!session?.user?.id) return;

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

      const data = await response.json();

      if (data.success && data.action === 'removed') {
        setPosts(posts.filter(p => p.id !== postId));
        setTotal(total - 1);
      }
    } catch (error) {
      console.error('お気に入り削除エラー:', error);
      alert('お気に入りの削除に失敗しました');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white shadow-sm p-10 rounded-lg text-center text-gray-500">
        お気に入りはまだありません
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="mb-4 p-4 border-gray-200 border-b">
        <p className="text-gray-600 text-sm">
          お気に入り登録数: <span className="font-bold text-[#ff6b35]">{total}</span>件
        </p>
      </div>

      <ul className="divide-y divide-gray-200">
        {posts.map((post) => {
          const imageUrl = post.og_image || post.thumbnail_url || '/images/anke_eye.webp';
          
          return (
            <li key={post.id} className="hover:bg-gray-50 p-4 transition-colors">
              <div className="flex gap-4">
                <Link href={`/posts/${post.id}`} className="shrink-0">
                  <img 
                    src={imageUrl}
                    alt={post.title}
                    className="rounded w-24 h-24 object-cover"
                  />
                </Link>
                
                <div className="flex-1 min-w-0">
                  <Link href={`/posts/${post.id}`} className="block group">
                    <h3 className="mb-2 font-medium text-gray-900 text-base group-hover:text-[#ff6b35] line-clamp-2">
                      {post.title}
                    </h3>
                  </Link>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-gray-500 text-xs">
                      <span>投稿者: {post.user_name}</span>
                      <span className="ml-2">{formatDate(post.created_at)}</span>
                    </div>
                    
                    <button
                      onClick={() => handleRemoveFavorite(post.id)}
                      className="bg-gray-200 hover:bg-red-100 px-3 py-1 rounded text-gray-700 hover:text-red-600 text-xs transition-colors"
                    >
                      ⭐ 解除
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
