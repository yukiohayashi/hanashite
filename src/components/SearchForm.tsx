'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { checkNgWord } from '../lib/ngWordCheck';

interface SearchFormProps {
  userId: string | number | null;
}

export default function SearchForm({ userId: _userId }: SearchFormProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  

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
      <form 
        role="search" 
        onSubmit={handleSubmit}
        className="flex flex-col justify-center items-center mx-auto w-full max-w-2xl"
      >
        <label className="flex-1 w-full">
          <input
            type="search"
            className="p-2.5 border border-gray-300 focus:border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 w-full text-base"
            placeholder="コメントも検索できます"
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
