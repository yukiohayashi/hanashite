'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { useSession } from 'next-auth/react';

interface RankingUser {
  user_id: string;
  user_nicename: string;
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
  const [postLikesRanking, setPostLikesRanking] = useState<RankingUser[]>([]);
  const [commentLikesRanking, setCommentLikesRanking] = useState<RankingUser[]>([]);
  const [userCategories, setUserCategories] = useState<Category[]>([]);

  const fetchPostLikesRanking = async () => {
    // 投稿へのいいねを集計（投稿者別）- 最新1000件に制限
    const { data: likesData, error: likesError } = await supabase
      .from('likes')
      .select('target_id')
      .eq('like_type', 'post')
      .order('id', { ascending: false })
      .limit(1000);


    if (likesError || !likesData || likesData.length === 0) {
      return;
    }

    // 投稿IDから投稿者を取得
    const postIds = likesData.map(l => l.target_id);
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('id, user_id')
      .in('id', postIds);


    if (!postsData) {
      return;
    }

    // 投稿者ごとにいいね数を集計
    const userLikeCounts = new Map<string, number>();
    likesData.forEach(like => {
      const post = postsData.find(p => p.id === like.target_id);
      if (post && post.user_id) {
        userLikeCounts.set(post.user_id, (userLikeCounts.get(post.user_id) || 0) + 1);
      }
    });

    // ユーザー情報を取得
    const userIds = Array.from(userLikeCounts.keys());
    
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds)
      .not('name', 'is', null)
      .neq('name', '')
      .neq('name', '匿名');


    if (!usersData) {
      return;
    }

    // ランキングデータを作成
    const ranking = usersData
      .map(user => ({
        user_id: user.id,
        user_nicename: user.name || '名無し',
        like_count: userLikeCounts.get(user.id) || 0
      }))
      .sort((a, b) => b.like_count - a.like_count)
      .slice(0, 5);

    setPostLikesRanking(ranking);
  };

  const fetchCommentLikesRanking = async () => {
    // コメントへのいいねを集計（コメント投稿者別）- 最新10000件に制限
    const { data: likesData, error: likesError } = await supabase
      .from('likes')
      .select('target_id')
      .eq('like_type', 'comment')
      .order('id', { ascending: false })
      .limit(10000);

    console.log('コメントいいねランキング - likesData:', likesData?.length);
    console.log('コメントいいねランキング - likesError:', likesError);

    if (likesError || !likesData || likesData.length === 0) {
      console.log('コメントいいねランキング - データなし');
      return;
    }

    // コメントIDからコメント投稿者を取得（最初の100件のみ）
    const commentIds = [...new Set(likesData.map(l => l.target_id))].slice(0, 100);
    console.log('コメントいいねランキング - commentIds:', commentIds.length);
    
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select('id, user_id')
      .in('id', commentIds);
    
    console.log('コメントいいねランキング - commentsData:', commentsData?.length);
    console.log('コメントいいねランキング - commentsError:', commentsError);


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
      .in('id', userIds)
      .not('name', 'is', null)
      .neq('name', '')
      .neq('name', '匿名');


    if (!usersData) {
      return;
    }

    // ランキングデータを作成
    const ranking = usersData
      .map(user => ({
        user_id: user.id,
        user_nicename: user.name || '名無し',
        like_count: userLikeCounts.get(user.id) || 0
      }))
      .sort((a, b) => b.like_count - a.like_count)
      .slice(0, 5);

    setCommentLikesRanking(ranking);
  };

  const fetchUserCategories = async () => {
    // ログインしていない場合は空配列
    if (!session?.user?.id) {
      setUserCategories([]);
      return;
    }

    // ユーザーの興味あるカテゴリを取得
    const { data: userData } = await supabase
      .from('users')
      .select('interest_categories')
      .eq('id', session.user.id)
      .single();

    if (!userData?.interest_categories) {
      setUserCategories([]);
      return;
    }

    try {
      const categoryIds = JSON.parse(userData.interest_categories);
      if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
        setUserCategories([]);
        return;
      }

      // カテゴリ情報を取得（アイコンも含める）
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name, slug, icon')
        .in('slug', categoryIds)
        .order('display_order', { ascending: true });

      setUserCategories(categoriesData || []);
    } catch (e) {
      setUserCategories([]);
    }
  };

  useEffect(() => {
    const fetchRankings = async () => {
      await fetchPostLikesRanking();
      await fetchCommentLikesRanking();
      await fetchUserCategories();
    };
    fetchRankings();
  }, [session]);

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
      {/* 興味あるカテゴリ（常時表示） */}
      <div>
        <h3 className="mb-2 px-0 font-bold text-base" style={{ color: '#ff6b35' }}>
          興味あるカテゴリ
        </h3>
        <ul className="m-0 p-0 list-none">
          {/* ニュースカテゴリ（常に表示） */}
          <li className="mb-1">
            <Link
              href="/keyword/news"
              className="block hover:bg-gray-100 px-2 py-1 text-gray-900 transition-colors"
            >
              <span className="mr-2" style={{ color: MATERIAL_COLORS[0] }}>
                <i className="far fa-newspaper"></i>
              </span>
              ニュース・話題
            </Link>
          </li>

          {/* ログインユーザーの選択したカテゴリ */}
          {session && userCategories.length > 0 && userCategories.map((category, index) => {
            const color = MATERIAL_COLORS[(index + 1) % MATERIAL_COLORS.length];
            return (
              <li key={category.id} className="mb-1">
                <Link
                  href={`/keyword/${category.slug}`}
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

          {/* 殿堂入り（常に表示） */}
          <li className="mb-1">
            <Link
              href="/?sort=statistics"
              className="block hover:bg-gray-100 px-2 py-1 text-gray-900 transition-colors"
            >
              <i className="mr-2 text-yellow-500 fas fa-crown"></i>殿堂入り
            </Link>
          </li>
        </ul>

        {/* 追加リンク（ログイン時のみ表示） */}
        {session && (
          <div className="mt-2 text-center">
            <Link href="/profileset" className="text-gray-900 hover:text-gray-600">
              追加 <i className="fas fa-plus-square"></i>
            </Link>
          </div>
        )}
      </div>

      {/* アンケートいいね獲得ランキング */}
      <div>
        <h3 className="mb-2 px-0 font-bold text-base" style={{ color: '#ff6b35' }}>
          アンケートいいね!獲得
        </h3>
        <ol className="m-0 p-0 list-none">
          {postLikesRanking.length > 0 ? (
            postLikesRanking.map((user, index) => {
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
                    {user.user_nicename}
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
                    {user.user_nicename}
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
