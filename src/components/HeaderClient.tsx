'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function HeaderClient() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (session?.user?.id) {
      // ユーザーのアバター画像を取得
      fetch(`/api/user/${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          console.log('HeaderClient - User data:', data);
          console.log('HeaderClient - user_img_url:', data.user_img_url);
          if (data.user_img_url) {
            setAvatarUrl(data.user_img_url);
            console.log('HeaderClient - Avatar URL set:', data.user_img_url);
          } else {
            console.log('HeaderClient - No user_img_url found');
          }
        })
        .catch((error) => {
          console.error('HeaderClient - Error fetching user:', error);
        });
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
    <div className="flex items-center gap-4">
      {status === 'loading' ? (
        <span className="text-gray-500 text-sm">読み込み中...</span>
      ) : session ? (
        <>
          <Link href="/mypage" className="relative flex flex-col items-center">
            <div className="relative">
              {avatarUrl ? (
                <span className="flex items-center">
                  <img 
                    src={avatarUrl}
                    alt="プロフィール画像" 
                    className="border border-gray-300 rounded-full w-10 h-10 object-cover"
                    id="header-avatar"
                  />
                </span>
              ) : (
                <div className="relative bg-gray-300 rounded-full w-10 h-10 overflow-hidden" id="header-avatar">
                  <div className="absolute top-[8px] left-1/2 bg-white rounded-full w-[18px] h-[18px] -translate-x-1/2"></div>
                  <div className="absolute top-[22px] left-1/2 bg-white rounded-[50%_50%_50%_50%/60%_60%_40%_40%] w-[27px] h-[20px] -translate-x-1/2"></div>
                </div>
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
          <div className="relative bg-gray-300 rounded-full w-10 h-10 overflow-hidden" id="header-avatar">
            <div className="absolute top-[8px] left-1/2 bg-white rounded-full w-[18px] h-[18px] -translate-x-1/2"></div>
            <div className="absolute top-[22px] left-1/2 bg-white rounded-[50%_50%_50%_50%/60%_60%_40%_40%] w-[27px] h-[20px] -translate-x-1/2"></div>
          </div>
        </Link>
      )}
    </div>
  );
}
