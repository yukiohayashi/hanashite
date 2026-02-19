'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function UserRightSidebar() {
  const { data: session, status } = useSession();
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/phistory?userId=${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.totalPoints !== undefined) {
            setTotalPoints(data.totalPoints);
          }
        })
        .catch(err => console.error('ポイント取得エラー:', err));
      
      fetch(`/api/user/${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.profile_slug) {
            setProfileSlug(data.profile_slug);
          }
          setUserName(data.name || session.user.name || 'ゲスト');
        })
        .catch(err => console.error('ユーザー情報取得エラー:', err));
    }
  }, [session]);

  if (status === 'loading') {
    return (
      <div className="my-2.5 text-center">
        <p className="text-gray-600 text-sm">読み込み中...</p>
      </div>
    );
  }

  if (status === 'authenticated' && session) {
    const displayName = userName || session.user?.name || 'ゲスト';
    
    return (
      <>
        <div className="my-2.5 text-center">
          <div className="md:hidden relative bg-gray-300 rounded-full w-20 h-20 overflow-hidden mx-auto mb-2">
            <div className="absolute top-[16px] left-1/2 bg-white rounded-full w-[36px] h-[36px] -translate-x-1/2"></div>
            <div className="absolute top-[44px] left-1/2 bg-white rounded-[50%_50%_50%_50%/60%_60%_40%_40%] w-[54px] h-[40px] -translate-x-1/2"></div>
          </div>
          <Link href="/profileset" className="text-[#ff6b35]">
            {displayName}
          </Link>
          さん
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
    );
  }

  return null;
}
