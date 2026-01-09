'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { getUserSearchHistory, clearUserSearchHistory, SearchHistory as SearchHistoryType } from '../lib/api';

interface SearchHistoryProps {
  userId?: string | number | null;
}

export default function SearchHistory({ userId: _userId }: SearchHistoryProps) {
  const [history, setHistory] = useState<SearchHistoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const { data: session } = useSession();
  
  // クライアント側でセッションからuserIdを取得
  const userId = session?.user?.id || null;

  // 検索履歴を取得
  useEffect(() => {
    const fetchHistory = async () => {
      if (!userId) {
          setLoading(false);
        return;
      }

      setLoading(true);
      const data = await getUserSearchHistory(userId);
      setHistory(data);
      setLoading(false);
    };

    fetchHistory();
  }, [userId]);

  // 検索履歴をすべて削除
  const handleClearHistory = async () => {
    if (!userId) return;
    
    if (!confirm('検索履歴をすべて削除しますか？')) {
      return;
    }

    setIsClearing(true);
    const success = await clearUserSearchHistory(userId);
    
    if (success) {
      setHistory([]);
      alert('検索履歴を削除しました');
    } else {
      alert('検索履歴の削除に失敗しました');
    }
    
    setIsClearing(false);
  };

  // 履歴がない場合は表示しない
  if (loading || history.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap justify-center items-center gap-1 mt-1.5 text-gray-600 text-sm">
      <span className="mr-1 whitespace-nowrap">
        <i className="fas fa-history"></i>
      </span>
      <div className="flex flex-wrap justify-center items-center gap-1" id="search-history-list">
        {history.map((item) => (
          <Link
            key={item.id}
            href={`/?s=${encodeURIComponent(item.search_keyword)}`}
            className="bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-full text-black text-xs leading-relaxed transition-colors"
          >
            {item.search_keyword}
          </Link>
        ))}
        <button
          type="button"
          onClick={handleClearHistory}
          disabled={isClearing}
          className="bg-transparent disabled:opacity-50 ml-1 border-none text-gray-400 hover:text-gray-600 text-sm transition-colors cursor-pointer"
          aria-label="検索履歴をすべて削除"
        >
          <i className="fas fa-trash"></i>
        </button>
      </div>
    </div>
  );
}
