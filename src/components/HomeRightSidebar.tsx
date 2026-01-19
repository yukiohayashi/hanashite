'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface Comment {
  id: number;
  post_id: number;
  content: string;
  created_at: string;
  posts: {
    title: string;
  } | null;
  user_name: string | null;
}

interface Post {
  id: number;
  title: string;
  created_at: string;
}

export default function HomeRightSidebar() {
  const { data: session, status } = useSession();
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [latestComments, setLatestComments] = useState<Comment[]>([]);
  const [latestPosts, setLatestPosts] = useState<Post[]>([]);
  const [adminPosts, setAdminPosts] = useState<Post[]>([]);

  useEffect(() => {
    const fetchComments = async () => {
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('id, post_id, user_id, content, created_at')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('コメント取得エラー:', error);
        return;
      }
      
      if (commentsData && commentsData.length > 0) {
        const postIds = commentsData.map(c => c.post_id);
        const { data: postsData } = await supabase
          .from('posts')
          .select('id, title')
          .in('id', postIds);
        
        const userIds = [...new Set(commentsData.map(c => c.user_id).filter(id => id !== null))];
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name')
          .in('id', userIds);
        
        const formattedData = commentsData.map(comment => ({
          ...comment,
          posts: postsData?.find(p => p.id === comment.post_id) || null,
          user_name: usersData?.find(u => u.id === comment.user_id)?.name || null
        }));
        
        setLatestComments(formattedData);
      }
    };

    const fetchAdminPosts = async () => {
      const { data } = await supabase
        .from('posts')
        .select('id, title, created_at')
        .eq('user_id', 33)
        .in('status', ['publish', 'published'])
        .order('created_at', { ascending: false })
        .limit(2);
      
      if (data) {
        setAdminPosts(data);
      }
    };

    const fetchPosts = async () => {
      const { data } = await supabase
        .from('posts')
        .select('id, title, created_at')
        .in('status', ['publish', 'published'])
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data) {
        setLatestPosts(data);
      }
    };

    fetchComments();
    fetchAdminPosts();
    fetchPosts();

    if (session?.user?.id) {
      // ポイント合計を取得
      fetch(`/api/phistory?userId=${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.totalPoints !== undefined) {
            setTotalPoints(data.totalPoints);
          }
        })
        .catch(err => console.error('ポイント取得エラー:', err));
      
      // profile_slugとuser_nicenameを取得
      fetch(`/api/user/${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.profile_slug) {
            setProfileSlug(data.profile_slug);
          }
          setUserName(data.user_nicename || data.user_nicename || data.name || session.user.name || 'ゲスト');
        })
        .catch(err => console.error('ユーザー情報取得エラー:', err));
    }
  }, [session]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear().toString().slice(-2);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  };

  if (status === 'loading') {
    return (
      <div className="my-2.5 text-center">
        <p className="text-gray-600 text-sm">読み込み中...</p>
      </div>
    );
  }

  const userSection = status === 'authenticated' && session ? (
    <>
      <div className="my-2.5 text-center">
        <div className="md:hidden relative bg-gray-300 rounded-full w-20 h-20 overflow-hidden mx-auto mb-2">
          <div className="absolute top-[16px] left-1/2 bg-white rounded-full w-[36px] h-[36px] -translate-x-1/2"></div>
          <div className="absolute top-[44px] left-1/2 bg-white rounded-[50%_50%_50%_50%/60%_60%_40%_40%] w-[54px] h-[40px] -translate-x-1/2"></div>
        </div>
        <Link href="/profileset" className="text-[#ff6b35]">
          {userName || session.user?.name || 'ゲスト'}
        </Link>
        さん<br />
        獲得ポイント: {totalPoints !== null ? totalPoints.toLocaleString() : '...'}pt
      </div>
      
      <div className="my-2.5 text-center">
        <Link href="/ankeworks" className="inline-block">
          <Image 
            src="/images/ankeworks.webp" 
            alt="アンケワークス" 
            width={64}
            height={64}
            className="w-16 h-auto"
          />
        </Link>
      </div>
      
      <div className="flex justify-center my-2.5 w-full pc">
        <Link 
          href={profileSlug ? `/users/${profileSlug}` : `/users/${session.user.id}`}
          className="inline-flex justify-center items-center bg-[#ff6b35] hover:bg-[#e58a2f] px-6 py-3 rounded font-bold text-white text-sm no-underline transition-colors"
          style={{ minWidth: '180px' }}
        >
          プロフィール
        </Link>
      </div>
    </>
  ) : (
    <>
      <div className="flex flex-col items-center my-2.5 w-full">
        <Link 
          href="/login" 
          className="inline-flex justify-center items-center bg-[#ff6b35] hover:bg-[#e58a2f] px-6 py-3 rounded font-bold text-white text-sm no-underline transition-colors"
          style={{ minWidth: '180px' }}
        >
          ログイン
        </Link>
        <div className="mt-2">
          <Link href="/resetpassword" className="text-[#ff6b35] hover:text-[#e55a2b] text-xs underline">
            パスワードを忘れた方はこちら
          </Link>
        </div>
      </div>
     
      <div className="my-2.5 text-center">
        ＼新規会員登録したら3,000pt獲得/
      </div>
      <div className="flex justify-center w-full">
        <Link 
          href="/regist" 
          className="inline-flex justify-center items-center bg-green-600 hover:bg-green-700 px-6 py-3 rounded font-bold text-white text-sm no-underline transition-colors"
          style={{ minWidth: '180px' }}
        >
          新規無料登録
        </Link>
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      {userSection}
      
      {/* 運営からお知らせ */}
      <div>
        <h3 className="mb-2 px-2 font-bold text-base" style={{ color: '#ff6b35' }}>
          運営からお知らせ <i className="fa fa-info-circle" aria-hidden="true"></i>
        </h3>
        <ul className="bg-white shadow m-0 p-0 rounded-lg list-none">
          {adminPosts.length > 0 ? (
            adminPosts.map((post) => (
              <li key={post.id} className="border-gray-200 border-b last:border-b-0">
                <Link href={`/posts/${post.id}`} className="block hover:bg-gray-100 px-2 py-2 transition-colors">
                  <span className="text-gray-900">{post.title}</span>
                  <br />
                  <span className="text-gray-500 text-xs">{formatDate(post.created_at)}</span>
                </Link>
              </li>
            ))
          ) : (
            <li className="px-2 py-2 text-gray-600 text-sm">お知らせはありません</li>
          )}
        </ul>
      </div>

      {/* 最新コメント */}
      <div>
        <h3 className="mt-4 mb-2 px-2 font-bold text-base" style={{ color: '#ff6b35' }}>
          最新コメント <i className="fas fa-comment"></i>
        </h3>
        <ul className="bg-white shadow m-0 p-0 rounded-lg list-none">
          {latestComments.length > 0 ? (
            latestComments.map((comment) => (
              <li key={comment.id} className="border-gray-200 border-b last:border-b-0">
                <Link href={`/posts/${comment.post_id}`} className="block hover:bg-gray-100 px-2 py-2 transition-colors">
                  <span className="block text-gray-900 text-sm">{truncateText(comment.content, 26)}</span>
                  <span className="block text-gray-500 text-xs">{comment.posts?.title || ''}</span>
                  <span className="text-gray-400 text-xs">{comment.user_name || 'ゲスト'}さん</span>
                </Link>
              </li>
            ))
          ) : (
            <li className="px-2 py-2 text-gray-600 text-sm">コメントなし</li>
          )}
        </ul>
      </div>

      {/* 最新アンケート */}
      <div>
        <h3 className="mt-4 mb-2 px-2 font-bold text-base" style={{ color: '#ff6b35' }}>
          最新アンケート <i className="fas fa-poll"></i>
        </h3>
        <ul className="flex flex-col gap-2 bg-white shadow m-0 p-0 rounded-lg list-none">
          {latestPosts.length > 0 ? (
            latestPosts.map((post) => (
              <li key={post.id} className="border-gray-200 border-b last:border-b-0">
                <Link href={`/posts/${post.id}`} className="block hover:bg-gray-100 px-2 py-2 transition-colors">
                  <span className="block text-gray-900 text-sm">{post.title}</span>
                  <span className="text-gray-500 text-xs">{formatDate(post.created_at)}</span>
                </Link>
              </li>
            ))
          ) : (
            <li className="px-2 py-2 text-gray-600 text-sm">アンケートなし</li>
          )}
        </ul>
      </div>
    </div>
  );
}
