'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';

interface Post {
  id: number;
  title: string;
  content: string;
  created_at: string;
  deadline_at: string | null;
  user_name: string | null;
  avatar_url: string;
  category_id: number | null;
  category_name: string | null;
}

interface InfinitePostListProps {
  initialPosts: Post[];
  sortBy: string;
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export default function InfinitePostList({ initialPosts, sortBy: initialSortBy }: InfinitePostListProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // ソート済み投稿
  const sortedPosts = useMemo(() => {
    if (sortBy === 'deadline') {
      // 締切が近い順：deadline_atが近い順、nullは除外
      return [...posts]
        .filter(p => p.deadline_at && new Date(p.deadline_at) >= new Date())
        .sort((a, b) => {
          const aTime = a.deadline_at ? new Date(a.deadline_at).getTime() : Infinity;
          const bTime = b.deadline_at ? new Date(b.deadline_at).getTime() : Infinity;
          return aTime - bTime;
        });
    }
    // デフォルトは最新順（created_at降順）
    return posts;
  }, [posts, sortBy]);

  const loadMorePosts = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/posts/list?sort=${sortBy}&page=${page + 1}&limit=10`);
      const data = await response.json();
      
      if (data.posts && data.posts.length > 0) {
        setPosts(prev => [...prev, ...data.posts]);
        setPage(prev => prev + 1);
        setHasMore(data.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, sortBy]);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMorePosts, hasMore, loading]);

  // sortByが変わったらリセット
  useEffect(() => {
    setPosts(initialPosts);
    setPage(1);
    setHasMore(true);
  }, [initialPosts]);

  return (
    <div>
      {/* タブメニュー */}
      <div className="px-1 py-0 mb-2">
        <ul className="flex justify-center m-0 p-0 w-full list-none">
          <li className="m-0 mx-1.5 my-1.5 w-auto text-xs">
            <button
              onClick={() => setSortBy('top_post')}
              className={`block w-full h-full underline ${sortBy === 'top_post' || sortBy === 'recommend' ? 'font-bold text-gray-900' : 'text-gray-600'}`}
            >
              最新順
            </button>
          </li>
          <li className="m-0 mx-1.5 my-1.5 w-auto text-xs">
            <button
              onClick={() => setSortBy('deadline')}
              className={`block w-full h-full underline ${sortBy === 'deadline' ? 'font-bold text-gray-900' : 'text-gray-600'}`}
            >
              締切が近い順
            </button>
          </li>
        </ul>
      </div>

      <div className="space-y-2 p-2">
        {sortedPosts.map((post) => {
        const cleanContent = stripHtmlTags(post.content || '');
        const contentPreview = cleanContent.length > 0
          ? cleanContent.substring(0, 50) + (cleanContent.length > 50 ? '...' : '')
          : '';
        return (
          <div key={post.id} className="relative block bg-white hover:shadow-md p-3 border border-gray-300 rounded-md transition-all hover:-translate-y-1">
          <Link 
            href={`/posts/${post.id}`} 
            className="block"
          >
            <h3 className="font-bold text-gray-900 text-base md:text-lg leading-relaxed">
              {post.title}
            </h3>
            {contentPreview && (
              <p className="mt-1 text-gray-600 text-sm line-clamp-1 md:line-clamp-2 overflow-hidden text-ellipsis">
                {contentPreview}
              </p>
            )}
            <div className="mt-2 flex items-center justify-between gap-2 text-gray-500 text-xs">
              <div className="flex items-center min-w-0 flex-1 overflow-hidden">
                <img 
                  src={post.avatar_url || 'https://api.dicebear.com/9.x/big-smile/svg?seed=guest&size=20'} 
                  alt="相談者"
                  className="w-4 h-4 rounded-full border border-gray-200 inline-block mr-1 flex-shrink-0"
                />
                <span className="truncate">{post.user_name || 'ゲスト'}さんからの相談</span>
                {post.deadline_at && (
                  <span className="ml-2 flex-shrink-0 hidden md:inline">締切: {new Date(post.deadline_at).toLocaleDateString('ja-JP')}</span>
                )}
              </div>
              {post.category_name && post.category_id && (
                <Link
                  href={`/category/${post.category_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-block px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-200 rounded whitespace-nowrap flex-shrink-0 hover:bg-gray-300 transition-colors"
                >
                  {post.category_name}
                </Link>
              )}
            </div>
          </Link>
          </div>
        );
      })}
      
      {/* ローディングインジケーター / 読み込みトリガー */}
      {sortBy !== 'deadline' && (
        <div ref={loadMoreRef} className="py-4 text-center">
        {loading && (
          <div className="flex justify-center items-center gap-2 text-gray-500">
            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">読み込み中...</span>
          </div>
        )}
          {!hasMore && posts.length > 0 && (
            <p className="text-gray-400 text-sm">すべての相談を表示しました</p>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
