'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface BestAnswer {
  id: number;
  content: string;
  created_at: string;
  post_id: number;
  post_title: string;
  user_name: string;
  user_id: string | null;
  avatar_url: string;
  category_name: string | null;
  category_id?: number | null;
  best_answer_selected_at?: string | null;
}

interface WaitingPost {
  id: number;
  title: string;
  content: string;
  created_at: string;
  deadline_at: string | null;
  user_name: string | null;
  avatar_url: string;
  category_id?: number | null;
  categories?: {
    name: string;
  } | null;
}

interface ResolvedSectionProps {
  bestAnswers: BestAnswer[];
  waitingPosts: WaitingPost[];
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

const ITEMS_PER_PAGE = 5;

export default function ResolvedSection({ bestAnswers, waitingPosts }: ResolvedSectionProps) {
  const [activeTab, setActiveTab] = useState<'accepting' | 'resolved'>('accepting');
  const [sortBy, setSortBy] = useState<'latest' | 'deadline'>('latest');
  const [acceptingDisplayCount, setAcceptingDisplayCount] = useState(ITEMS_PER_PAGE);
  const [resolvedDisplayCount, setResolvedDisplayCount] = useState(ITEMS_PER_PAGE);

  // 相談受付中のソート
  const sortedWaitingPosts = useMemo(() => {
    if (sortBy === 'deadline') {
      return [...waitingPosts].sort((a, b) => {
        if (!a.deadline_at && !b.deadline_at) return 0;
        if (!a.deadline_at) return 1;
        if (!b.deadline_at) return -1;
        return new Date(a.deadline_at).getTime() - new Date(b.deadline_at).getTime();
      });
    }
    // 最新順（デフォルト）
    return [...waitingPosts].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [waitingPosts, sortBy]);

  const handleLoadMoreAccepting = () => {
    setAcceptingDisplayCount(prev => prev + ITEMS_PER_PAGE);
  };

  const handleLoadMoreResolved = () => {
    setResolvedDisplayCount(prev => prev + ITEMS_PER_PAGE);
  };

  if (bestAnswers.length === 0 && waitingPosts.length === 0) {
    return null;
  }

  return (
    <>
      {/* メインタブ（Yahoo知恵袋風） */}
      <div className="mx-1.5 mb-2 border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('accepting')}
            className={`flex-1 py-3 text-center text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'accepting'
                ? 'border-[#ff6b6b] text-[#ff6b6b]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            相談受付中
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`flex-1 py-3 text-center text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'resolved'
                ? 'border-[#ff6b6b] text-[#ff6b6b]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            最新の解決済み
          </button>
        </div>
      </div>

      {/* 相談受付中 */}
      {activeTab === 'accepting' && (
        <>
          {/* ソートメニュー */}
          <div className="mx-1.5 mb-2 flex justify-center gap-4 text-xs">
            <button
              onClick={() => setSortBy('latest')}
              className={`underline ${sortBy === 'latest' ? 'font-bold text-gray-900' : 'text-gray-500'}`}
            >
              最新順
            </button>
            <button
              onClick={() => setSortBy('deadline')}
              className={`underline ${sortBy === 'deadline' ? 'font-bold text-gray-900' : 'text-gray-500'}`}
            >
              締切が近い順
            </button>
          </div>

          <div className="mx-1.5 mb-4 space-y-2">
            {sortedWaitingPosts.length > 0 ? (
              <>
                {sortedWaitingPosts.slice(0, acceptingDisplayCount).map((post) => {
                  const cleanContent = post.content ? post.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() : '';
                  const contentPreview = cleanContent.length > 0
                    ? cleanContent.substring(0, 50) + (cleanContent.length > 50 ? '...' : '')
                    : '';
                  return (
                    <div key={post.id} className="relative block bg-white hover:shadow-md p-2 border border-[#ffe0d6] rounded-md transition-all hover:-translate-y-1">
                      <Link href={`/posts/${post.id}`} className="block">
                        <h4 className="font-bold text-gray-900 text-base md:text-lg leading-relaxed">
                          {post.title}
                        </h4>
                        {contentPreview && (
                          <p className="mt-1 text-gray-600 text-sm line-clamp-1 md:line-clamp-2 overflow-hidden text-ellipsis">
                            {contentPreview}
                          </p>
                        )}
                      </Link>
                      <div className="mt-2 flex items-center justify-between gap-2 text-gray-500 text-xs">
                        <div className="flex items-center min-w-0 flex-1 overflow-hidden">
                          <div className="w-4 h-4 rounded-full overflow-hidden border border-gray-200 inline-block mr-1 shrink-0">
                            <img 
                              src={post.avatar_url || '/images/local-avatars/default-avatar.webp'} 
                              alt="相談者"
                              className="w-full h-full object-cover scale-125"
                            />
                          </div>
                          <span className="truncate">{post.user_name || 'ゲスト'}さん</span>
                          <span className="ml-2 shrink-0">{new Date(post.created_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })} {new Date(post.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {post.categories?.name && post.category_id && (
                          <Link
                            href={`/category/${post.category_id}`}
                            className="inline-block px-2 py-0.5 text-xs font-semibold text-[#d32f2f] bg-white border border-[#d32f2f] rounded whitespace-nowrap shrink-0 hover:bg-pink-50 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {post.categories.name}
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
                {acceptingDisplayCount < sortedWaitingPosts.length && (
                  <button
                    onClick={handleLoadMoreAccepting}
                    className="w-full py-2 text-center text-sm text-[#ff6b6b] hover:bg-pink-50 rounded-md transition-colors"
                  >
                    もっと見る
                  </button>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">相談受付中の投稿はありません</p>
            )}
          </div>
        </>
      )}

      {/* 最新の解決済み */}
      {activeTab === 'resolved' && (
        <div className="mx-1.5 mb-4 space-y-2">
          {bestAnswers.length > 0 ? (
            <>
              {bestAnswers.slice(0, resolvedDisplayCount).map((answer) => {
                const contentPreview = stripHtmlTags(answer.content).substring(0, 80);
                return (
                  <div key={answer.id} className="relative block bg-white hover:shadow-md p-2 border border-[#ffe0d6] border-l-4 border-l-[#ff6b6b] rounded-md transition-all hover:-translate-y-1">
                    <Link href={`/posts/${answer.post_id}`} className="block">
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <div className="w-4 h-4 rounded-full overflow-hidden border border-gray-200 shrink-0">
                          <img 
                            src={answer.avatar_url || '/images/local-avatars/default-avatar.webp'} 
                            alt="回答者"
                            className="w-full h-full object-cover scale-125"
                          />
                        </div>
                        <span className="font-medium text-gray-700">{answer.user_name}さんのベストアンサー</span>
                        {answer.best_answer_selected_at && (
                          <span className="ml-1 text-gray-400">
                            {new Date(answer.best_answer_selected_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-800 text-sm line-clamp-2">
                        {contentPreview}...
                      </p>
                      <div className="mt-2 text-gray-500 text-xs">
                        <span className="block truncate">相談: {answer.post_title}</span>
                      </div>
                    </Link>
                  </div>
                );
              })}
              {resolvedDisplayCount < bestAnswers.length && (
                <button
                  onClick={handleLoadMoreResolved}
                  className="w-full py-2 text-center text-sm text-[#ff6b6b] hover:bg-pink-50 rounded-md transition-colors"
                >
                  もっと見る
                </button>
              )}
            </>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">解決済みの相談はありません</p>
          )}
        </div>
      )}
    </>
  );
}
