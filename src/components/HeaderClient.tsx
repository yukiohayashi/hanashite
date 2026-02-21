'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function HeaderClient() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState('');

  // ユーザーのアバター画像を取得（DiceBear対応）
  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/user/${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.use_custom_image && data.image) {
            setAvatarUrl(data.image);
          } else if (data.avatar_seed) {
            const style = data.avatar_style || 'big-smile';
            setAvatarUrl(`https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(data.avatar_seed)}&size=40`);
          } else {
            setAvatarUrl('');
          }
        })
        .catch(() => {
          setAvatarUrl('');
        });
    } else {
      setAvatarUrl('');
    }
  }, [session]);

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
      {status === 'loading' ? (
        <span className="text-gray-500 text-sm">読み込み中...</span>
      ) : session ? (
        <>
          <Link href="/notifications" className="relative flex flex-col items-center">
            <div className="relative">
              {avatarUrl ? (
                <img 
                  src={avatarUrl}
                  alt="プロフィール画像" 
                  className="border-1 border-gray-300 rounded-full w-10 h-10 object-cover"
                  id="header-avatar"
                />
              ) : (
                <img src="/images/default-avatar.svg" alt="デフォルトアバター" id="header-avatar" className="rounded-full w-10 h-10 object-cover" />
              )}
            </div>
            {/* 未読通知ドット */}
            {unreadCount > 0 && (
              <div className="top-[23px] right-0 z-50 absolute flex justify-center items-center bg-red-600 rounded-full w-4 h-4 text-[0.7rem] text-white text-center leading-4 animate-pulse">
                {unreadCount}
              </div>
            )}
          </Link>
        </>
      ) : (
        <Link href="/login" className="flex items-center">
          <img src="/images/default-avatar.svg" alt="デフォルトアバター" id="header-avatar" className="rounded-full w-10 h-10 object-cover" />
        </Link>
      )}
    </div>
  );
}
