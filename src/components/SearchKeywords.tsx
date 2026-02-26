'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Keyword {
  keyword: string;
  last_searched?: string;
}

export default function SearchKeywords() {
  // ハードコードされたキーワードを削除（空配列で初期化）
  const [latestKeywords] = useState<Keyword[]>([]);
  const [popularKeywords] = useState<Keyword[]>([]);

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
