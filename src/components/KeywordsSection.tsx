import Link from 'next/link';
import { getPopularKeywords, getLatestKeywords } from '@/lib/keywords';

export default async function KeywordsSection() {
  // 人気検索ワードを取得（keyword_search_historyから集計）
  const popularKeywords = await getPopularKeywords(5);
  
  // 最新キーワードを取得（keywordsテーブルから）
  const latestKeywords = await getLatestKeywords(3);

  return (
    <div className="space-y-4 mb-4">
      {/* みんなの検索ワード */}
      {popularKeywords.length > 0 && (
        <div className="mb-4">
          <span className="block mb-2 font-bold text-sm text-[#ff6b6b]">
            <i className="fas fa-fire"></i> みんなの検索ワード：
          </span>
          <div className="flex flex-wrap gap-2">
            {popularKeywords.map((item, index) => (
              <a
                key={index}
                href={`/?s=${encodeURIComponent(item.keyword)}`}
                className="hover:bg-pink-50 px-3 py-1 border border-[#d32f2f] rounded-full text-[#d32f2f] text-sm font-semibold transition-colors"
              >
                {item.keyword}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 最新キーワード */}
      {latestKeywords.length > 0 && (
        <div>
          <span className="block mb-2 font-bold text-sm text-[#ff6b6b]">
            <i className="fas fa-clock"></i> 最新キーワード：
          </span>
          <div className="flex flex-wrap gap-2">
            {latestKeywords.map((keyword) => (
              <Link
                key={keyword.id}
                href={`/keyword/${keyword.id}`}
                className="hover:bg-pink-50 px-3 py-1 border border-[#d32f2f] rounded-full text-[#d32f2f] text-sm font-semibold transition-colors"
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
