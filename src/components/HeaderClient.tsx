'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function HeaderClient() {
  const { data: session, status } = useSession();
  const [avatarUrl, setAvatarUrl] = useState('');

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
    }
  }, [session]);

  return (
    <div className="flex items-center gap-4">
      {status === 'loading' ? (
        <span className="text-gray-500 text-sm">読み込み中...</span>
      ) : session ? (
        <>
          <Link href="/mypage" className="relative flex items-center">
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
