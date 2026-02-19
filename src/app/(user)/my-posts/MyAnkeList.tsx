'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Post {
  id: number;
  title: string;
  created_at: string;
  og_image?: string;
  thumbnail_url?: string;
  vote_count: number;
  comment_count: number;
  best_answer_id?: number | null;
}

export default function MyAnkeList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const { data: session } = useSession();

  const fetchPosts = useCallback(async (pageNum: number) => {
    if (!session?.user?.id) return;

    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await fetch(
        `/api/my-posts?userId=${session.user.id}&page=${pageNum}&limit=20`
      );
      const data = await response.json();

      if (data.success) {
        if (pageNum === 1) {
          setPosts(data.posts);
        } else {
          setPosts(prev => [...prev, ...data.posts]);
        }
        setHasMore(data.hasMore);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('投稿の取得エラー:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchPosts(1);
    }
  }, [session, fetchPosts]);

  const loadMore = () => {
    fetchPosts(page + 1);
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return '今日';
    if (diffInDays === 1) return '昨日';
    if (diffInDays < 7) return `${diffInDays}日前`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}週間前`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)}ヶ月前`;
    return `${Math.floor(diffInDays / 365)}年前`;
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
        まだ相談記事を作成していません
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg">
      <ul className="divide-y divide-gray-200">
        {posts.map((post) => {
          return (
            <li 
              key={post.id}
              className="hover:bg-gray-50 p-4 transition-colors"
            >
              <div className="flex-1">
                <Link href={`/posts/${post.id}`} className="block group">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-gray-900 text-base group-hover:text-[#ff6b35] line-clamp-2 flex-1">
                      {post.title}
                    </h3>
                    {post.best_answer_id ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded whitespace-nowrap">
                        ✓ 解決済み
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded whitespace-nowrap">
                        相談受付中
                      </span>
                    )}
                  </div>
                </Link>
                
                <div className="flex justify-between items-center">
                  <div className="text-gray-500 text-xs">
                    <span>{getTimeAgo(post.created_at)}</span>
                  </div>
                  
                  <Link
                    href={`/post-manage/${post.id}`}
                    className="bg-gray-200 hover:bg-blue-100 px-3 py-1 rounded text-gray-700 hover:text-blue-600 text-xs transition-colors"
                  >
                    確認する
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="justify-center bg-[#F7DD47] hover:opacity-80 disabled:opacity-50 mx-2 p-2 rounded text-white transition-opacity cursor-pointer disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> 読み込み中...
              </>
            ) : (
              <>
                <i className="fas fa-chevron-down"></i> もっと表示
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
