'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';

interface MobileLeftSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RankingUser {
  user_id: string;
  name: string;
  like_count: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
}

interface Keyword {
  id: number;
  keyword: string;
}

const MATERIAL_COLORS = [
  '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
  '#2196F3', '#03A9F4', '#00BCD4', '#009688',
  '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B',
  '#FFC107', '#FF5722'
];

export default function MobileLeftSidebar({ isOpen, onClose }: MobileLeftSidebarProps) {
  const { data: session } = useSession();
  const [popularKeywords, setPopularKeywords] = useState<Keyword[]>([]);
  const [latestKeywords, setLatestKeywords] = useState<Keyword[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [interestCategories, setInterestCategories] = useState<string[]>([]);
  const [interestCategoryObjects, setInterestCategoryObjects] = useState<Category[] | null>(null);
  const [bestAnswerRanking, setBestAnswerRanking] = useState<RankingUser[]>([]);
  const [commentLikesRanking, setCommentLikesRanking] = useState<RankingUser[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // 人気キーワード
      const { data: popularData } = await supabase
        .from('keywords')
        .select('id, keyword')
        .order('view_count', { ascending: false })
        .limit(7);
      if (popularData) setPopularKeywords(popularData);

      // 最新キーワード
      const { data: latestData } = await supabase
        .from('keywords')
        .select('id, keyword')
        .order('created_at', { ascending: false })
        .limit(5);
      if (latestData) setLatestKeywords(latestData);

      // カテゴリ
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name, slug, icon')
        .eq('is_active', true)
        .neq('slug', 'announcement')
        .order('display_order', { ascending: true });
      if (categoriesData) setCategories(categoriesData);

      // ベストアンサー獲得ランキング
      const { data: postsWithBestAnswer } = await supabase
        .from('posts')
        .select('best_answer_id')
        .not('best_answer_id', 'is', null)
        .in('status', ['publish', 'published'])
        .order('best_answer_selected_at', { ascending: false })
        .limit(100);

      if (postsWithBestAnswer && postsWithBestAnswer.length > 0) {
        const bestAnswerIds = postsWithBestAnswer.map(p => p.best_answer_id).filter(id => id !== null);
        const { data: commentsData } = await supabase
          .from('comments')
          .select('user_id, users(id, name)')
          .in('id', bestAnswerIds);

        if (commentsData) {
          const userCounts = new Map<string, { name: string; count: number }>();
          commentsData.forEach(comment => {
            if (comment.user_id && comment.users) {
              const userId = comment.user_id;
              const current = userCounts.get(userId);
              if (current) {
                current.count++;
              } else {
                userCounts.set(userId, { name: (comment.users as any).name || '名無し', count: 1 });
              }
            }
          });

          const ranking = Array.from(userCounts.entries())
            .map(([user_id, data]) => ({ user_id, name: data.name, like_count: data.count }))
            .sort((a, b) => b.like_count - a.like_count)
            .slice(0, 5);
          setBestAnswerRanking(ranking);
        }
      }

      // コメントいいね獲得ランキング
      const { data: likesData } = await supabase
        .from('likes')
        .select('target_id')
        .eq('like_type', 'comment')
        .order('id', { ascending: false })
        .limit(1000);

      if (likesData && likesData.length > 0) {
        const commentIds = [...new Set(likesData.map(l => l.target_id))].slice(0, 50);
        const { data: commentsData } = await supabase
          .from('comments')
          .select('id, user_id, users(id, name)')
          .in('id', commentIds);

        if (commentsData) {
          const commentUserMap = new Map<number, { id: string; name: string }>();
          commentsData.forEach(comment => {
            if (comment.user_id && comment.users) {
              commentUserMap.set(comment.id, {
                id: comment.user_id,
                name: (comment.users as any).name || '名無し'
              });
            }
          });

          const userLikeCounts = new Map<string, { name: string; count: number }>();
          likesData.forEach(like => {
            const user = commentUserMap.get(like.target_id);
            if (user) {
              const current = userLikeCounts.get(user.id);
              if (current) {
                current.count++;
              } else {
                userLikeCounts.set(user.id, { name: user.name, count: 1 });
              }
            }
          });

          const ranking = Array.from(userLikeCounts.entries())
            .map(([user_id, data]) => ({ user_id, name: data.name, like_count: data.count }))
            .sort((a, b) => b.like_count - a.like_count)
            .slice(0, 5);
          setCommentLikesRanking(ranking);
        }
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from('users')
      .select('interest_categories')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.interest_categories) {
          try {
            const slugs = JSON.parse(data.interest_categories);
            const validSlugs = Array.isArray(slugs) ? slugs : [];
            setInterestCategories(validSlugs);
            if (validSlugs.length > 0) {
              supabase
                .from('categories')
                .select('id, name, slug, icon')
                .in('slug', validSlugs)
                .order('display_order', { ascending: true })
                .then(({ data: catData }) => {
                  setInterestCategoryObjects(catData || []);
                });
            } else {
              setInterestCategoryObjects([]);
            }
          } catch {
            setInterestCategories([]);
            setInterestCategoryObjects([]);
          }
        } else {
          setInterestCategoryObjects([]);
        }
      });
  }, [session?.user?.id]);

  const displayCategories = interestCategoryObjects !== null
    ? (interestCategoryObjects.length > 0 ? interestCategoryObjects : categories)
    : categories;

  const getBadgeColor = (rank: number) => {
    return 'bg-[#ff6b6b]';
  };

  return (
    <>
      {/* オーバーレイ */}
      {isOpen && (
        <div 
          className="md:hidden top-0 left-0 z-[9997] fixed inset-0 bg-black/50 transition-opacity duration-500"
          onClick={onClose}
        >
          <button
            className="top-[10px] right-[5%] z-[9999] fixed text-white text-xl"
            onClick={onClose}
          >
            <i className="fas fa-window-close"></i>
          </button>
        </div>
      )}

      {/* 左サイドバー */}
      <div
        className={`md:hidden top-0 left-0 z-[9998] fixed w-[85%] h-full transition-all duration-500 ${
          isOpen ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
      >
        <div
          className={`z-[9998] relative bg-white px-[5%] pb-5 h-full overflow-y-auto transition-all duration-500 transform ${
            isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
          }`}
        >
          <div className="py-4">
            {/* みんなの検索ワード */}
            <div className="mb-6">
              <h3 className="flex items-center gap-2 mb-3 font-bold text-[#ff6b6b]">
                <span>🔥 みんなの検索ワード：</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {popularKeywords.map((keyword) => (
                  <Link
                    key={keyword.id}
                    href={`/keyword/${keyword.id}`}
                    className="inline-block bg-white hover:bg-pink-50 px-3 py-1.5 border border-[#d32f2f] rounded-full text-[#d32f2f] text-sm font-semibold transition-colors"
                    onClick={onClose}
                  >
                    {keyword.keyword}
                  </Link>
                ))}
              </div>
            </div>

            {/* 最新キーワード */}
            <div className="mb-6">
              <h3 className="flex items-center gap-2 mb-3 font-bold text-[#ff6b6b]">
                <i className="fas fa-clock"></i> 最新キーワード
              </h3>
              <div className="flex flex-wrap gap-2">
                {latestKeywords.map((keyword) => (
                  <Link
                    key={keyword.id}
                    href={`/keyword/${keyword.id}`}
                    className="inline-block bg-white hover:bg-pink-50 px-3 py-1.5 border border-[#d32f2f] rounded-full text-[#d32f2f] text-sm font-semibold transition-colors"
                    onClick={onClose}
                  >
                    {keyword.keyword}
                  </Link>
                ))}
              </div>
            </div>

            {/* カテゴリ */}
            <div className="mb-6">
              <h3 className="mb-3 font-bold text-[#ff6b6b]">カテゴリ</h3>
              <ul className="m-0 p-0 list-none">
                {displayCategories.map((category, index) => {
                  const color = MATERIAL_COLORS[(index + 1) % MATERIAL_COLORS.length];
                  return (
                    <li key={category.id} className="mb-1">
                      <Link
                        href={`/category/${category.id}`}
                        className="block hover:bg-gray-100 px-2 py-1 text-gray-900 transition-colors"
                        onClick={onClose}
                      >
                        {category.icon ? (
                          <span className="mr-2" style={{ color }} dangerouslySetInnerHTML={{ __html: category.icon }} />
                        ) : (
                          <span className="mr-2" style={{ color }}>●</span>
                        )}
                        {category.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* ベストアンサー獲得 */}
            <div className="mb-6">
              <h3 className="mb-3 font-bold text-[#ff6b6b]">ベストアンサー獲得</h3>
              <ol className="m-0 p-0 list-none">
                {bestAnswerRanking.length > 0 ? (
                  bestAnswerRanking.map((user, index) => {
                    const rank = index + 1;
                    return (
                      <li key={user.user_id} className="m-0 p-0">
                        <Link
                          href={`/users/${user.user_id}`}
                          className="flex items-end hover:bg-gray-100 py-2 pr-3 pl-0 text-gray-800 no-underline transition-colors"
                          onClick={onClose}
                        >
                          <span className={`inline-block shrink-0 mr-1.5 px-0.5 py-0.5 rounded min-w-[30px] font-bold text-white text-sm text-center ${getBadgeColor(rank)}`}>
                            {rank}
                          </span>
                          {user.name}
                          <span className="text-[0.7em] text-gray-400">さん</span>
                        </Link>
                      </li>
                    );
                  })
                ) : (
                  <li className="px-2 py-1 text-gray-600 text-sm">データがありません</li>
                )}
              </ol>
            </div>

            {/* コメントいいね!獲得 */}
            <div className="mb-6">
              <h3 className="mb-3 font-bold text-[#ff6b6b]">コメントいいね!獲得</h3>
              <ol className="m-0 p-0 list-none">
                {commentLikesRanking.length > 0 ? (
                  commentLikesRanking.map((user, index) => {
                    const rank = index + 1;
                    return (
                      <li key={user.user_id} className="m-0 p-0">
                        <Link
                          href={`/users/${user.user_id}`}
                          className="flex items-end hover:bg-gray-100 py-2 pr-3 pl-0 text-gray-800 no-underline transition-colors"
                          onClick={onClose}
                        >
                          <span className={`inline-block shrink-0 mr-1.5 px-0.5 py-0.5 rounded min-w-[30px] font-bold text-white text-sm text-center ${getBadgeColor(rank)}`}>
                            {rank}
                          </span>
                          {user.name}
                          <span className="text-[0.7em] text-gray-400">さん</span>
                        </Link>
                      </li>
                    );
                  })
                ) : (
                  <li className="px-2 py-1 text-gray-600 text-sm">データがありません</li>
                )}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
