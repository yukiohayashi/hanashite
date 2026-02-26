'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { supabase } from '../lib/supabase';

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

interface SidebarClientProps {
  categories: Category[];
}

const MATERIAL_COLORS = [
  '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
  '#2196F3', '#03A9F4', '#00BCD4', '#009688',
  '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B',
  '#FFC107', '#FF5722'
];

export default function SidebarClient({ categories }: SidebarClientProps) {
  const { data: session } = useSession();
  const [bestAnswerRanking, setBestAnswerRanking] = useState<RankingUser[]>([]);
  const [commentLikesRanking, setCommentLikesRanking] = useState<RankingUser[]>([]);
  const [interestCategories, setInterestCategories] = useState<string[]>([]);
  const [interestCategoryObjects, setInterestCategoryObjects] = useState<Category[] | null>(null);

  const fetchBestAnswerRanking = async () => {
    const { data: postsWithBestAnswer } = await supabase
      .from('posts')
      .select('best_answer_id')
      .not('best_answer_id', 'is', null)
      .in('status', ['publish', 'published'])
      .order('best_answer_selected_at', { ascending: false })
      .limit(100);

    if (!postsWithBestAnswer || postsWithBestAnswer.length === 0) {
      return;
    }

    const bestAnswerIds = postsWithBestAnswer.map(p => p.best_answer_id).filter(id => id !== null);
    
    const { data: commentsData } = await supabase
      .from('comments')
      .select('user_id, users(id, name)')
      .in('id', bestAnswerIds);

    if (!commentsData) {
      return;
    }

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
      .map(([user_id, data]) => ({
        user_id,
        name: data.name,
        like_count: data.count
      }))
      .sort((a, b) => b.like_count - a.like_count)
      .slice(0, 5);

    setBestAnswerRanking(ranking);
  };

  const fetchCommentLikesRanking = async () => {
    const { data: likesData } = await supabase
      .from('likes')
      .select('target_id')
      .eq('like_type', 'comment')
      .order('id', { ascending: false })
      .limit(1000);

    if (!likesData || likesData.length === 0) {
      return;
    }

    const commentIds = [...new Set(likesData.map(l => l.target_id))].slice(0, 50);
    
    const { data: commentsData } = await supabase
      .from('comments')
      .select('id, user_id, users(id, name)')
      .in('id', commentIds);

    if (!commentsData) {
      return;
    }

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
      .map(([user_id, data]) => ({
        user_id,
        name: data.name,
        like_count: data.count
      }))
      .sort((a, b) => b.like_count - a.like_count)
      .slice(0, 5);

    setCommentLikesRanking(ranking);
  };

  useEffect(() => {
    Promise.all([
      fetchBestAnswerRanking(),
      fetchCommentLikesRanking()
    ]).catch(err => console.error('Sidebar data fetch error:', err));
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
              // is_activeに関係なく選択したカテゴリを取得
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

  const getBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-[#f06292]';
    if (rank === 2) return 'bg-[#ffb74d]';
    if (rank === 3) return 'bg-[#4db6ac]';
    return 'bg-[#ff6b35]';
  };

  const getProfileUrl = (user: RankingUser) => {
    return `/users/${user.user_id}`;
  };

  // is_activeに関係なく取得した興味カテゴリを優先、未設定時は全カテゴリ表示
  const displayCategories = interestCategoryObjects !== null
    ? (interestCategoryObjects.length > 0 ? interestCategoryObjects : categories)
    : categories;

  return (
    <nav className="space-y-4">
      {/* カテゴリ */}
      <div>
        <h3 className="mb-2 px-0 font-bold text-base" style={{ color: '#ff6b35' }}>
          カテゴリ
        </h3>
        <ul className="m-0 p-0 list-none">
          {displayCategories.length > 0 && displayCategories.map((category, index) => {
            const color = MATERIAL_COLORS[(index + 1) % MATERIAL_COLORS.length];
            return (
              <li key={category.id} className="mb-1">
                <Link
                  href={`/category/${category.id}`}
                  className="block hover:bg-gray-100 px-2 py-1 text-gray-900 transition-colors"
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

      {/* ベストアンサー獲得ランキング */}
      <div>
        <h3 className="mb-2 px-0 font-bold text-base" style={{ color: '#ff6b35' }}>
          ベストアンサー獲得
        </h3>
        <ol className="m-0 p-0 list-none">
          {bestAnswerRanking.length > 0 ? (
            bestAnswerRanking.map((user, index) => {
              const rank = index + 1;
              return (
                <li key={user.user_id} className="m-0 p-0">
                  <Link
                    href={getProfileUrl(user)}
                    className="flex items-end hover:bg-gray-100 py-2 pr-3 pl-0 text-gray-800 no-underline transition-colors"
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

      {/* コメントいいね獲得ランキング */}
      <div>
        <h3 className="mt-4 mb-2 px-0 font-bold text-base" style={{ color: '#ff6b35' }}>
          コメントいいね!獲得
        </h3>
        <ol className="m-0 p-0 list-none">
          {commentLikesRanking.length > 0 ? (
            commentLikesRanking.map((user, index) => {
              const rank = index + 1;
              return (
                <li key={user.user_id} className="m-0 p-0">
                  <Link
                    href={getProfileUrl(user)}
                    className="flex items-end hover:bg-gray-100 py-2 pr-3 pl-0 text-gray-800 no-underline transition-colors"
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
    </nav>
  );
}
