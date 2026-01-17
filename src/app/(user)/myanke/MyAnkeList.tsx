'use client';

import { useState, useEffect } from 'react';
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
}

export default function MyAnkeList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.id) {
      fetchPosts(1);
    }
  }, [session]);

  const fetchPosts = async (pageNum: number) => {
    if (!session?.user?.id) return;

    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await fetch(
        `/api/myanke?userId=${session.user.id}&page=${pageNum}&limit=20`
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
  };

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
        まだアンケートを作成していません
      </div>
    );
  }

  return (
    <div id="bbsitems_myanke">
      <ul id="related-entries" className="flex flex-col gap-2 m-0 p-0 list-none">
        {posts.map((post) => {
          const imageUrl = post.og_image || post.thumbnail_url || '/images/noimage.webp';
          
          return (
            <li 
              key={post.id}
              className="relative flex gap-3 hover:shadow-md mx-auto mb-2 p-2 border border-gray-300 rounded-md w-full overflow-hidden font-bold transition-all related-entry"
            >
              <Link 
                href={`/posts/${post.id}`}
                className="flex gap-3 w-full text-inherit no-underline entry-link"
              >
                <div className="flex-1 order-1 min-w-0">
                  <div className="overflow-hidden text-lg md:text-xl line-clamp-3 md:line-clamp-4 leading-tight">
                    {post.title}
                  </div>
                  <div className="mt-1 font-normal text-[10px] text-gray-400">
                    {post.vote_count}票 {post.comment_count} <i className="fas fa-comment"></i> {getTimeAgo(post.created_at)}
                  </div>
                </div>
                <div className="shrink-0 order-2 w-20 h-20">
                  <img 
                    src={imageUrl}
                    alt={post.title}
                    className="w-full h-full object-cover object-center rounded"
                    loading="lazy"
                  />
                </div>
              </Link>
              <Link
                href={`/post-edit/${post.id}`}
                className="inline-block top-2 right-2 z-10 absolute bg-[#ff6b35] hover:bg-orange-600 px-2 py-1 rounded text-white text-xs transition-colors edit-link"
                onClick={(e) => e.stopPropagation()}
              >
                編集する
              </Link>
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
