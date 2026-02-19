'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { useSession } from 'next-auth/react';

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

const MATERIAL_COLORS = [
  '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
  '#2196F3', '#03A9F4', '#00BCD4', '#009688',
  '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B',
  '#FFC107', '#FF5722'
];

export default function Sidebar() {
  const { data: session } = useSession();
  const [bestAnswerRanking, setBestAnswerRanking] = useState<RankingUser[]>([]);
  const [commentLikesRanking, setCommentLikesRanking] = useState<RankingUser[]>([]);
  const [userCategories, setUserCategories] = useState<Category[]>([]);

  const fetchBestAnswerRanking = async () => {
    // ベストアンサーを持つ投稿を取得
    const { data: postsWithBestAnswer, error: postsError } = await supabase
      .from('posts')
      .select('best_answer_id')
      .not('best_answer_id', 'is', null)
      .in('status', ['publish', 'published']);

    if (postsError || !postsWithBestAnswer || postsWithBestAnswer.length === 0) {
      return;
    }

    // ベストアンサーのコメントIDを取得
    const bestAnswerIds = postsWithBestAnswer.map(p => p.best_answer_id).filter(id => id !== null);
    
    // コメントからユーザーIDを取得
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select('id, user_id')
      .in('id', bestAnswerIds);

    if (commentsError || !commentsData) {
      return;
    }

    // ユーザーごとにベストアンサー数を集計
    const userBestAnswerCounts = new Map<string, number>();
    commentsData.forEach(comment => {
      if (comment.user_id) {
        userBestAnswerCounts.set(comment.user_id, (userBestAnswerCounts.get(comment.user_id) || 0) + 1);
      }
    });

    // ユーザー情報を取得
    const userIds = Array.from(userBestAnswerCounts.keys());
    
    if (userIds.length === 0) {
      return;
    }

    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds);

    if (usersError || !usersData) {
      return;
    }

    // ランキングデータを作成
    const ranking = usersData
      .map(user => ({
        user_id: user.id,
        name: user.name || '名無し',
        like_count: userBestAnswerCounts.get(user.id) || 0
      }))
      .sort((a, b) => b.like_count - a.like_count)
      .slice(0, 5);

    setBestAnswerRanking(ranking);
  };

  const fetchCommentLikesRanking = async () => {
    // コメントへのいいねを集計（コメント投稿者別）- 最新10000件に制限
    const { data: likesData, error: likesError } = await supabase
      .from('likes')
      .select('target_id')
      .eq('like_type', 'comment')
      .order('id', { ascending: false })
      .limit(10000);

    if (likesError || !likesData || likesData.length === 0) {
      return;
    }

    // コメントIDからコメント投稿者を取得（最初の100件のみ）
    const commentIds = [...new Set(likesData.map(l => l.target_id))].slice(0, 100);
    
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select('id, user_id')
      .in('id', commentIds);


    if (!commentsData) {
      return;
    }

    // コメント投稿者ごとにいいね数を集計
    const userLikeCounts = new Map<string, number>();
    likesData.forEach(like => {
      const comment = commentsData.find(c => c.id === like.target_id);
      if (comment && comment.user_id) {
        userLikeCounts.set(comment.user_id, (userLikeCounts.get(comment.user_id) || 0) + 1);
      }
    });

    // ユーザー情報を取得
    const userIds = Array.from(userLikeCounts.keys());
    
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds);


    if (!usersData) {
      return;
    }

    // ランキングデータを作成
    const ranking = usersData
      .map(user => ({
        user_id: user.id,
        name: user.name || '名無し',
        like_count: userLikeCounts.get(user.id) || 0
      }))
      .sort((a, b) => b.like_count - a.like_count)
      .slice(0, 5);

    setCommentLikesRanking(ranking);
  };

  const fetchUserCategories = async () => {
    // 全カテゴリを取得してデフォルト表示
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('id, name, slug, icon')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    setUserCategories(categoriesData || []);
  };

  useEffect(() => {
    const fetchRankings = async () => {
      await fetchBestAnswerRanking();
      await fetchCommentLikesRanking();
      await fetchUserCategories();
    };
    fetchRankings();
  }, []);

  const getBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-[#f06292]';
    if (rank === 2) return 'bg-[#ffb74d]';
    if (rank === 3) return 'bg-[#4db6ac]';
    return 'bg-[#ff6b35]';
  };

  const getProfileUrl = (user: RankingUser) => {
    return `/users/${user.user_id}`;
  };

  return (
    <nav className="space-y-4">
      {/* カテゴリ（常時表示） */}
      <div>
        <h3 className="mb-2 px-0 font-bold text-base" style={{ color: '#ff6b35' }}>
          カテゴリ
        </h3>
        <ul className="m-0 p-0 list-none">
          {/* 全カテゴリを表示 */}
          {userCategories.length > 0 && userCategories.map((category, index) => {
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
                    <span className={`inline-block flex-shrink-0 mr-1.5 px-0.5 py-0.5 rounded min-w-[30px] font-bold text-white text-sm text-center ${getBadgeColor(rank)}`}>
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
                    <span className={`inline-block flex-shrink-0 mr-1.5 px-0.5 py-0.5 rounded min-w-[30px] font-bold text-white text-sm text-center ${getBadgeColor(rank)}`}>
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
