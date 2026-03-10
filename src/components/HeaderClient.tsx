'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function HeaderClient() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  // ユーザーのアバター画像を取得（ローカルアバター対応）
  useEffect(() => {
    if (session?.user?.id) {
      // APIから詳細情報を取得
      fetch(`/api/user/${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.use_custom_image && data.image) {
            setAvatarUrl(data.image);
          } else if (data.avatar_seed && (data.avatar_seed.startsWith('f20_') || data.avatar_seed.startsWith('f30_') || data.avatar_seed.startsWith('f40_') || 
                     data.avatar_seed.startsWith('m20_') || data.avatar_seed.startsWith('m30_') || data.avatar_seed.startsWith('m40_') ||
                     data.avatar_seed.startsWith('cat_') || data.avatar_seed.startsWith('dog_') || data.avatar_seed.startsWith('rabbit_') ||
                     data.avatar_seed.startsWith('bear_') || data.avatar_seed.startsWith('other_'))) {
            setAvatarUrl(`/images/local-avatars/${data.avatar_seed}.webp`);
          } else {
            setAvatarUrl('/images/local-avatars/f20_01.webp');
          }
        })
        .catch(() => {
          // エラー時はデフォルトアバター
          setAvatarUrl('/images/local-avatars/f20_01.webp');
        });
    } else {
      setAvatarUrl('');
    }
  }, [session?.user?.id]);

  // 未読通知数を取得
  const fetchUnreadCount = () => {
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
  };

  // ページ遷移時に未読数を再取得
  useEffect(() => {
    fetchUnreadCount();
  }, [session, pathname]);

  // マイページからの既読処理を検知
  useEffect(() => {
    const handleNotificationsRead = () => {
      setUnreadCount(0);
    };

    window.addEventListener('notificationsRead', handleNotificationsRead);
    return () => {
      window.removeEventListener('notificationsRead', handleNotificationsRead);
    };
  }, []);

  return (
    <div className="flex items-center gap-4">
      {session ? (
        <>
          <Link href="/notifications" className="relative flex flex-col items-center">
            <div className="relative">
              {avatarUrl ? (
                <img 
                  src={avatarUrl}
                  alt="プロフィール画像" 
                  className="rounded-full w-12 h-12 object-cover"
                  id="header-avatar"
                />
              ) : (
                <div className="bg-[#ff6b6b] rounded-full w-12 h-12" />
              )}
            </div>
            {/* 未読通知ドット */}
            {unreadCount > 0 && (
              <div className="top-[28px] right-0 z-50 absolute flex justify-center items-center bg-red-600 rounded-full w-4 h-4 text-[0.7rem] text-white text-center leading-4 animate-pulse">
                {unreadCount}
              </div>
            )}
          </Link>
        </>
      ) : (
        <Link href="/login" className="flex items-center">
          <img src="/images/default-avatar.webp" alt="デフォルトアバター" id="header-avatar" className="bg-white rounded-full w-10 h-10 object-cover" />
        </Link>
      )}
    </div>
  );
}
