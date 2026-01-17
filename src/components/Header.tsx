'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import HeaderClient from './HeaderClient';
import HeaderLink from './HeaderLink';
import MobileLeftSidebar from './MobileLeftSidebar';
import MobileRightSidebar from './MobileRightSidebar';

interface HeaderProps {
  postsCount?: number;
}

export default function Header({ postsCount = 0 }: HeaderProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (session?.user?.id) {
      // ユーザーのアバター画像を取得
      fetch(`/api/user/${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.user_img_url) {
            setAvatarUrl(data.user_img_url);
          }
        })
        .catch(() => {
          // エラー時はデフォルトアバターを使用
        });
    } else {
      setAvatarUrl('');
      setUnreadCount(0);
    }
  }, [session]);

  // 未読通知数を取得（ページ遷移時に再取得）
  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/notifications/unread?userId=${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.count !== undefined) {
            setUnreadCount(data.count);
          }
        })
        .catch(() => {
          setUnreadCount(0);
        });
    }
  }, [session, pathname]);

  return (
    <>
      {/* スマホビュー用ヘッダー */}
      <header className="md:hidden top-0 right-0 left-0 z-[50] fixed bg-white shadow-md">
        {/* カラフルなボーダー */}
        <div className="bg-gradient-to-r from-pink-500 via-orange-500 to-yellow-500 h-1"></div>
        
        <div className="relative flex justify-center items-center py-2">
          {/* 左: 検索アイコン */}
          <button
            className="top-1/2 left-[3%] z-[101] absolute text-gray-700 text-xl -translate-y-1/2"
            onClick={() => setLeftSidebarOpen(true)}
          >
            <i className="fas fa-search"></i>
          </button>

          {/* 中央: ロゴ */}
          <div className="flex flex-col justify-center items-center">
            <Link href="/" className="mx-auto w-[150px] text-center">
              <Image 
                src="/anke.svg" 
                alt="アンケ" 
                width={150} 
                height={40}
                className="w-full"
              />
            </Link>
            <div className="w-full text-[0.5rem] text-center text-gray-600">
              ニュース × アンケート × コミュニティ。みんなの意見が見える新しいSNS
            </div>
          </div>

          {/* 右: アバターアイコン */}
          <button
            className="top-1/2 right-[2%] z-[99999] absolute text-center cursor-pointer -translate-y-1/2"
            onClick={() => setRightSidebarOpen(true)}
          >
            <div className="relative">
              <div className="relative rounded-full w-10 h-10 overflow-hidden">
                {status === 'loading' ? (
                  <div className="relative bg-gray-300 rounded-full w-10 h-10 overflow-hidden">
                    <div className="absolute top-[8px] left-1/2 bg-white rounded-full w-[18px] h-[18px] -translate-x-1/2"></div>
                    <div className="absolute top-[22px] left-1/2 bg-white rounded-[50%_50%_50%_50%/60%_60%_40%_40%] w-[27px] h-[20px] -translate-x-1/2"></div>
                  </div>
                ) : session && avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="プロフィール画像"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="relative bg-gray-300 rounded-full w-10 h-10 overflow-hidden">
                    <div className="absolute top-[8px] left-1/2 bg-white rounded-full w-[18px] h-[18px] -translate-x-1/2"></div>
                    <div className="absolute top-[22px] left-1/2 bg-white rounded-[50%_50%_50%_50%/60%_60%_40%_40%] w-[27px] h-[20px] -translate-x-1/2"></div>
                  </div>
                )}
              </div>
              {/* 通知ドット */}
              {session && unreadCount > 0 && (
                <span className="top-0 right-0 absolute flex justify-center items-center bg-red-500 rounded-full w-4 h-4 text-[10px] text-white font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          </button>
        </div>
      </header>

      {/* PC/タブレットビュー用ヘッダー */}
      <header className="hidden md:block bg-white shadow-md">
        {/* カラフルなボーダー */}
        <div className="bg-gradient-to-r from-pink-500 via-orange-500 to-yellow-500 h-1"></div>
        
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex justify-between items-stretch min-h-[60px]">
            {/* ロゴとアンケート情報 */}
            <div className="flex items-center gap-4 py-2">
              <Link href="/" className="flex flex-col items-center">
                <div className="w-[150px] text-center">
                  <Image 
                    src="/anke.svg" 
                    alt="アンケ" 
                    width={150} 
                    height={40}
                    className="w-full"
                  />
                </div>
              </Link>
              
              {/* アンケート統計情報 */}
              <div className="flex flex-col text-gray-600 text-xs">
                <div className="font-semibold text-gray-800">
                  アンケート合計数: {postsCount.toLocaleString()}本
                </div>
                <div className="mt-0.5 text-[0.65rem] leading-tight">
                  ニュース × アンケート × コミュニティ。みんなの意見が見える新しいSNS
                </div>
              </div>
            </div>
            
            {/* ユーザーメニューとリンク */}
            <div className="flex items-stretch">
              {/* ユーザーメニュー */}
              <div className="flex items-center px-4">
                <HeaderClient />
              </div>
              
              {/* アンケ/アンケワークス切り替えリンク */}
              <HeaderLink />
            </div>
          </div>
        </div>
      </header>

      {/* 左サイドバー */}
      <MobileLeftSidebar 
        isOpen={leftSidebarOpen} 
        onClose={() => setLeftSidebarOpen(false)} 
      />

      {/* 右サイドバー */}
      <MobileRightSidebar 
        isOpen={rightSidebarOpen} 
        onClose={() => setRightSidebarOpen(false)} 
      />
    </>
  );
}
