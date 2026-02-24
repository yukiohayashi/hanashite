'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

interface Post {
  id: number;
  title: string;
  content: string;
  created_at: string;
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

export default function InfinitePostList({ initialPosts, sortBy }: InfinitePostListProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

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
  }, [initialPosts, sortBy]);

  return (
    <div className="space-y-2 p-2">
      {posts.map((post) => {
        const cleanContent = stripHtmlTags(post.content || '');
        const contentPreview = cleanContent.length > 0
          ? cleanContent.substring(0, 50) + (cleanContent.length > 50 ? '...' : '')
          : '';
        return (
          <Link 
            key={post.id} 
            href={`/posts/${post.id}`} 
            className="block bg-white hover:shadow-md p-3 border border-gray-300 rounded-md transition-all hover:-translate-y-1"
          >
            <h3 className="font-bold text-gray-900 text-base md:text-lg leading-relaxed">
              {post.title}
            </h3>
            {contentPreview && (
              <p className="mt-1 text-gray-600 text-sm line-clamp-2">
                {contentPreview}
              </p>
            )}
            <div className="mt-2 flex items-center justify-between text-gray-500 text-xs">
              <div className="flex items-center">
                <img 
                  src={post.avatar_url || 'https://api.dicebear.com/9.x/big-smile/svg?seed=guest&size=20'} 
                  alt="相談者"
                  className="w-4 h-4 rounded-full border border-gray-200 inline-block mr-1"
                />
                <span>{post.user_name || 'ゲスト'}さんからの相談</span>
                <span className="ml-2">{new Date(post.created_at).toLocaleDateString('ja-JP')}</span>
              </div>
              {post.category_name && (
                <span className="inline-block px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-200 rounded">
                  {post.category_name}
                </span>
              )}
            </div>
          </Link>
        );
      })}
      
      {/* ローディングインジケーター / 読み込みトリガー */}
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
    </div>
  );
}
