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

interface SiteSettings {
  powered_by_text: string;
  total_posts_count: string;
  site_catchphrase: string;
}

interface HeaderProps {
  siteSettings?: SiteSettings;
}

export default function Header({ siteSettings: initialSettings }: HeaderProps = {}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(initialSettings || {
    powered_by_text: '',
    total_posts_count: '',
    site_catchphrase: '',
  });

  useEffect(() => {
    // 初期値がない場合のみAPIから取得
    if (!initialSettings) {
      fetch('/api/admin/settings')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            const settings: SiteSettings = {
              powered_by_text: data.data.find((s: any) => s.setting_key === 'powered_by_text')?.setting_value || '',
              total_posts_count: data.data.find((s: any) => s.setting_key === 'total_posts_count')?.setting_value || '',
              site_catchphrase: data.data.find((s: any) => s.setting_key === 'site_catchphrase')?.setting_value || '',
            };
            setSiteSettings(settings);
          }
        })
        .catch(() => {
          // エラー時は空文字のまま
        });
    }
  }, [initialSettings]);

  // ユーザーのアバター画像を取得（ローカルアバター対応）
  useEffect(() => {
    if (session?.user?.id) {
      // APIから詳細情報を取得
      fetch(`/api/user/${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.use_custom_image && data.image) {
            setAvatarUrl(data.image);
          } else if (data.avatar_seed && data.avatar_seed.startsWith('f20_') || data.avatar_seed?.startsWith('f30_') || data.avatar_seed?.startsWith('f40_') || 
                     data.avatar_seed?.startsWith('m20_') || data.avatar_seed?.startsWith('m30_') || data.avatar_seed?.startsWith('m40_') ||
                     data.avatar_seed?.startsWith('cat_') || data.avatar_seed?.startsWith('dog_') || data.avatar_seed?.startsWith('rabbit_') ||
                     data.avatar_seed?.startsWith('bear_') || data.avatar_seed?.startsWith('other_')) {
            setAvatarUrl(`/images/local-avatars/${data.avatar_seed}.webp`);
          } else {
            setAvatarUrl('/images/local-avatars/default-avatar.webp');
          }
        })
        .catch(() => {
          // エラー時はデフォルトアバター
          setAvatarUrl('/images/local-avatars/default-avatar.webp');
        });
    } else {
      setAvatarUrl('');
      setUnreadCount(0);
    }
  }, [session?.user?.id]);

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
      <header className="md:hidden top-0 right-0 left-0 z-[50] fixed bg-[#ff6b6b] shadow-md">
        <div className="relative flex justify-center items-center py-2">
          {/* 左: 検索アイコン */}
          <button
            className="top-1/2 left-[3%] z-[101] absolute text-white text-xl -translate-y-1/2"
            onClick={() => setLeftSidebarOpen(true)}
          >
            <i className="fas fa-search"></i>
          </button>

          {/* 中央: ロゴ */}
          <div className="flex flex-col justify-center items-center">
            <Link href="/" className="w-[120px] text-center">
              <Image 
                src="/images/logo.png" 
                alt="ハナシテ" 
                width={120} 
                height={32}
                className="w-full"
              />
            </Link>
            <div className="hidden md:block text-[0.45rem] text-white text-center">powered by {siteSettings.powered_by_text}</div>
            <div className="w-full text-[0.5rem] text-center text-white">
              {siteSettings.site_catchphrase}
            </div>
          </div>

          {/* 右: アバターアイコン */}
          {session ? (
            <button
              className="top-1/2 right-[2%] z-[99999] absolute text-center cursor-pointer -translate-y-1/2"
              onClick={() => setRightSidebarOpen(true)}
            >
              <div className="relative w-12 h-12">
                <div className="rounded-full overflow-hidden w-full h-full">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="プロフィール画像"
                      id="header-avatar"
                      className="rounded-full w-full h-full object-cover scale-125"
                    />
                  ) : (
                    <div className="bg-[#ff6b6b] rounded-full w-12 h-12" />
                  )}
                </div>
                {/* 通知ドット */}
                {unreadCount > 0 && (
                  <span className="top-0 right-0 absolute flex justify-center items-center bg-red-500 rounded-full w-4 h-4 text-[10px] text-white font-bold z-10">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            </button>
          ) : (
            <Link
              href="/login"
              className="top-1/2 right-[2%] z-[99999] absolute text-center cursor-pointer -translate-y-1/2"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white">
                <img src="/images/local-avatars/default-avatar.webp" alt="デフォルトアバター" id="header-avatar" className="w-full h-full object-cover scale-125" />
              </div>
            </Link>
          )}
        </div>
      </header>

      {/* PC/タブレットビュー用ヘッダー */}
      <header className="hidden md:block bg-[#ff6b6b] shadow-md">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex justify-between items-stretch min-h-[64px]">
            {/* ロゴと相談情報 */}
            <div className="flex items-center gap-4 py-2">
              <Link href="/" className="flex flex-col items-center">
                <div className="w-[120px] text-center">
                  <Image 
                    src="/images/logo.png" 
                    alt="ハナシテ" 
                    width={120} 
                    height={32}
                    className="w-full"
                  />
                </div>
                <span className="text-[0.55rem] text-white">powered by {siteSettings.powered_by_text}</span>
              </Link>
              
              {/* 相談統計情報 */}
              <div className="flex flex-col text-white text-xs">
                <div className="font-semibold text-white">
                  相談合計数: {siteSettings.total_posts_count}件超
                </div>
                <div className="mt-0.5 text-[0.65rem] leading-tight">
                  {siteSettings.site_catchphrase}
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
