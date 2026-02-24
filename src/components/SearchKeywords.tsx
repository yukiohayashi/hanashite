'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Keyword {
  keyword: string;
  last_searched?: string;
}

export default function SearchKeywords() {
  const [latestKeywords, setLatestKeywords] = useState<Keyword[]>([]);
  const [popularKeywords, setPopularKeywords] = useState<Keyword[]>([]);

  useEffect(() => {
    // 最新キーワードを取得（仮データ）
    setLatestKeywords([
      { keyword: '最新' },
      { keyword: 'BTOメーカー' },
      { keyword: 'SSD' },
    ]);

    // みんなの検索キーワードを取得（仮データ）
    setPopularKeywords([
      { keyword: 'iPhone' },
      { keyword: 'レーザー脱毛' },
      { keyword: '地震の分' },
      { keyword: '太陽' },
      { keyword: '関田宗佑' },
      { keyword: 'マスエク' },
    ]);
  }, []);

  return (
    <div className="space-y-2">
      {/* 最新キーワード */}
      {latestKeywords.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 p-2 text-gray-600 text-xs">
          <span className="font-bold text-black whitespace-nowrap">最新</span>
          {latestKeywords.map((keyword, index) => (
            <Link
              key={index}
              href={`/?search=${encodeURIComponent(keyword.keyword)}`}
              className="hover:bg-gray-50 px-2 py-0.5 border border-gray-300 hover:border-gray-400 rounded-full text-black leading-relaxed transition-colors"
            >
              {keyword.keyword}
            </Link>
          ))}
        </div>
      )}

      {/* みんなの検索 */}
      {popularKeywords.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mt-1 p-2 text-gray-600 text-xs">
          <span className="font-bold text-black whitespace-nowrap">みんなの検索</span>
          {popularKeywords.map((keyword, index) => (
            <Link
              key={index}
              href={`/?s=${encodeURIComponent(keyword.keyword)}`}
              className="hover:bg-gray-50 px-2 py-0.5 border border-gray-300 hover:border-gray-400 rounded-full text-black leading-relaxed transition-colors"
            >
              {keyword.keyword}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
