'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { checkNgWord } from '../lib/ngWordCheck';
import { supabase } from '@/lib/supabase';

interface SearchFormProps {
  userId: string | number | null;
}

interface Keyword {
  id: number;
  keyword: string;
}

export default function SearchForm({ userId: _userId }: SearchFormProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [randomKeywords, setRandomKeywords] = useState<Keyword[]>([]);

  useEffect(() => {
    const fetchRandomKeywords = async () => {
      const { data } = await supabase
        .from('keywords')
        .select('id, keyword')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data && data.length > 0) {
        // ランダムに3件選択
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setRandomKeywords(shuffled.slice(0, 3));
      }
    };
    fetchRandomKeywords();
  }, []);
  

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const query = searchQuery.trim();
    if (!query) return;

    // NGワードチェック
    const ngCheck = await checkNgWord(query);
    if (ngCheck.isNg) {
      if (ngCheck.severity === 1) { // 1: block
        setErrorMessage(`「${ngCheck.matchedWord}」は検索できません。`);
        return;
      } else {
        setErrorMessage(`「${ngCheck.matchedWord}」を含む検索は推奨されません。`);
        // 警告の場合は3秒後にクリア
        setTimeout(() => setErrorMessage(''), 3000);
      }
    } else {
      setErrorMessage('');
    }

    // 検索ページに遷移（警告の場合は遷移を許可）
    // 検索履歴は検索ページ側で結果件数と共に記録
    if (!ngCheck.isNg || ngCheck.severity === 2) { // 2: warn
      router.push(`/?s=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="inline-block relative w-full">
      {/* 最新キーワード */}
      {randomKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {randomKeywords.map((kw) => (
            <Link
              key={kw.id}
              href={`/?s=${encodeURIComponent(kw.keyword)}`}
              className="px-2 py-0.5 text-xs bg-pink-50 text-[#ff6b6b] border border-pink-200 rounded-full hover:bg-pink-100 transition-colors"
            >
              {kw.keyword}
            </Link>
          ))}
        </div>
      )}
      <form 
        role="search" 
        onSubmit={handleSubmit}
        className="flex flex-col justify-center items-center mx-auto w-full max-w-2xl"
      >
        <label className="flex-1 w-full">
          <input
            type="search"
            className="p-2.5 border border-gray-300 focus:border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 w-full text-base"
            placeholder="同じ悩みを検索できます"
            name="s"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
        {errorMessage && (
          <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded w-full text-sm">
            {errorMessage}
          </div>
        )}
      </form>
    </div>
  );
}
