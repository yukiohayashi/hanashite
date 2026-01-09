import Link from 'next/link';
import { getPopularKeywords, getLatestKeywords } from '../lib/keywords';

export default async function KeywordsSection() {
  // 人気キーワードを取得
  const popularKeywords = await getPopularKeywords(6);
  
  // 最新キーワードを取得
  const latestKeywords = await getLatestKeywords(3);

  return (
    <div className="p-2.5">
      {/* 人気キーワード */}
      {popularKeywords.length > 0 && (
        <div className="mb-4">
          <span className="block mb-2 font-bold text-sm">
            <i className="text-orange-500 fas fa-fire"></i> みんなの検索ワード：
          </span>
          <div className="flex flex-wrap gap-2">
            {popularKeywords.map((keyword) => (
              <Link
                key={keyword.id}
                href={`/keyword/${keyword.slug}`}
                className="hover:bg-gray-50 px-3 py-1 border border-gray-300 hover:border-gray-400 rounded-full text-gray-700 text-sm transition-colors"
              >
                {keyword.keyword}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 最新キーワード */}
      {latestKeywords.length > 0 && (
        <div>
          <span className="block mb-2 font-bold text-sm">
            <i className="text-blue-500 fas fa-clock"></i> 最新キーワード：
          </span>
          <div className="flex flex-wrap gap-2">
            {latestKeywords.map((keyword) => (
              <Link
                key={keyword.id}
                href={`/keyword/${keyword.slug}`}
                className="hover:bg-gray-50 px-3 py-1 border border-gray-300 hover:border-gray-400 rounded-full text-gray-700 text-sm transition-colors"
              >
                {keyword.keyword}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
