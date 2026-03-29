'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Comment {
  id: number;
  post_id: number;
  user_id: string | null;
  content: string;
  created_at: string;
  post_title: string;
  user_name: string;
}

interface Props {
  comments: Comment[];
}

const ITEMS_PER_PAGE = 5;

export default function LatestCommentsMobileClient({ comments }: Props) {
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + ITEMS_PER_PAGE);
  };

  return (
    <div>
      <ul className="bg-white shadow m-0 p-0 rounded-lg list-none">
        {comments.slice(0, displayCount).map((comment) => (
          <li key={comment.id} className="border-gray-200 border-b last:border-b-0">
            <Link href={`/posts/${comment.post_id}`} className="block hover:bg-gray-100 px-2 py-2 transition-colors">
              <span className="block text-gray-900 text-sm">{truncateText(comment.content, 26)}</span>
              <span className="block text-gray-500 text-xs">{comment.post_title}</span>
              <span className="text-gray-400 text-xs">{comment.user_name}さん　{new Date(comment.created_at).toLocaleDateString('ja-JP', { year: '2-digit', month: 'numeric', day: 'numeric' })} {new Date(comment.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
            </Link>
          </li>
        ))}
      </ul>
      {displayCount < comments.length && (
        <button
          onClick={handleLoadMore}
          className="w-full py-2 text-center text-sm text-[#ff6b6b] hover:bg-pink-50 rounded-md transition-colors mt-2"
        >
          もっと見る
        </button>
      )}
    </div>
  );
}
