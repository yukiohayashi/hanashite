'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

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
}

interface WaitingPost {
  id: number;
  title: string;
  content: string;
  created_at: string;
  deadline_at: string | null;
  user_name: string | null;
  avatar_url: string;
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

export default function ResolvedSection({ bestAnswers, waitingPosts }: ResolvedSectionProps) {
  const [activeTab, setActiveTab] = useState<'latest' | 'waiting'>('latest');

  if (bestAnswers.length === 0 && waitingPosts.length === 0) {
    return null;
  }

  return (
    <>
      <h3 className="m-1.5 mb-2 px-0 font-bold text-base" style={{ color: '#ff6b35' }}>
        <i className="fas fa-trophy mr-1"></i>解決済み
      </h3>

      {/* タブメニュー */}
      <div className="px-1 py-0">
        <ul className="flex justify-center m-0 p-0 w-full list-none">
          <li className="m-0 mx-1.5 my-1.5 w-auto text-xs">
            <button
              onClick={() => setActiveTab('latest')}
              className={`block w-full h-full underline ${
                activeTab === 'latest' ? 'font-bold text-gray-900' : 'text-gray-600'
              }`}
            >
              最新順
            </button>
          </li>
          <li className="m-0 mx-1.5 my-1.5 w-auto text-xs">
            <button
              onClick={() => setActiveTab('waiting')}
              className={`block w-full h-full underline ${
                activeTab === 'waiting' ? 'font-bold text-gray-900' : 'text-gray-600'
              }`}
            >
              ベストアンサー待ち
            </button>
          </li>
        </ul>
      </div>

      {/* 最新順 */}
      {activeTab === 'latest' && (
        <div className="mx-1.5 mb-4 space-y-2">
          {bestAnswers.length > 0 ? (
            bestAnswers.map((answer) => {
              const contentPreview = stripHtmlTags(answer.content).substring(0, 80);
              return (
                <Link
                  key={answer.id}
                  href={`/posts/${answer.post_id}`}
                  className="block bg-white hover:shadow-md p-3 border border-gray-300 rounded-md transition-all"
                >
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                    <Image
                      src={answer.avatar_url}
                      alt={answer.user_name}
                      width={20}
                      height={20}
                      unoptimized
                      className="w-5 h-5 rounded-full border border-gray-200"
                    />
                    <span className="font-medium text-gray-700">{answer.user_name}さんのベストアンサー</span>
                  </div>
                  <p className="text-gray-800 text-sm line-clamp-2">
                    {contentPreview}...
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-gray-500 text-xs">
                    <span className="truncate flex-1 min-w-0">相談: {answer.post_title.substring(0, 40)}{answer.post_title.length > 40 ? '...' : ''}</span>
                    {answer.category_name && (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-200 rounded whitespace-nowrap shrink-0">
                        {answer.category_name}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">解決済みの相談はありません</p>
          )}
        </div>
      )}

      {/* ベストアンサー待ち */}
      {activeTab === 'waiting' && waitingPosts.length > 0 && (
        <div className="mx-1.5 mb-4 space-y-2">
          {waitingPosts.slice(0, 3).map((post) => {
            const cleanContent = post.content ? post.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() : '';
            const contentPreview = cleanContent.length > 0
              ? cleanContent.substring(0, 50) + (cleanContent.length > 50 ? '...' : '')
              : '';
            return (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="block bg-white hover:shadow-md p-3 border border-gray-300 rounded-md transition-all"
              >
                <h4 className="font-bold text-gray-900 text-sm leading-relaxed">
                  {post.title}
                </h4>
                {contentPreview && (
                  <p className="mt-1 text-gray-600 text-xs line-clamp-1">
                    {contentPreview}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between gap-2 text-gray-500 text-xs">
                  <div className="flex items-center min-w-0 flex-1 overflow-hidden">
                    <span className="truncate">{post.user_name || 'ゲスト'}さんからの相談</span>
                    {post.deadline_at && (
                      <span className="ml-2 flex-shrink-0 text-red-600">締切: {new Date(post.deadline_at).toLocaleDateString('ja-JP')}</span>
                    )}
                  </div>
                  {post.categories?.name && (
                    <span className="inline-block px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-200 rounded whitespace-nowrap flex-shrink-0">
                      {post.categories.name}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
