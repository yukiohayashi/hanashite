'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function HeaderClient() {
  const { data: session, status } = useSession();
  const defaultAvatarUrl = 'https://anke.jp/wp-content/themes/anke/images/default_avatar.jpg';
  const [avatarUrl, setAvatarUrl] = useState(defaultAvatarUrl);

  useEffect(() => {
    if (session?.user?.id) {
      // ユーザーのアバター画像を取得
      fetch(`/api/user/${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.user?.worker_img_url) {
            setAvatarUrl(data.user.worker_img_url);
          } else if (session.user.image) {
            setAvatarUrl(session.user.image);
          }
        })
        .catch(() => {
          // エラー時はデフォルトアバターを使用
          if (session.user.image) {
            setAvatarUrl(session.user.image);
          }
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
            <span className="flex items-center">
              <img 
                src={avatarUrl}
                alt="プロフィール画像" 
                className="border border-gray-300 rounded-full w-10 h-10 object-cover"
                id="header-avatar"
              />
            </span>
          </Link>
        </>
      ) : (
        <Link href="/login" className="flex items-center">
          <img 
            src={defaultAvatarUrl}
            alt="デフォルトアバター" 
            className="rounded-full w-10 h-10 object-cover"
            id="header-avatar"
          />
        </Link>
      )}
    </div>
  );
}
