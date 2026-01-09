'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function RightSidebar() {
  const { data: session, status } = useSession();
  const defaultAvatarUrl = 'https://anke.jp/wp-content/themes/anke/images/default_avatar.jpg';
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      // ポイント合計を取得
      fetch(`/api/point-history?userId=${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.totalPoints !== undefined) {
            setTotalPoints(data.totalPoints);
          }
        })
        .catch(err => console.error('ポイント取得エラー:', err));
      
      // profile_slugを取得
      fetch(`/api/user/${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.user?.profile_slug) {
            setProfileSlug(data.user.profile_slug);
          }
        })
        .catch(err => console.error('ユーザー情報取得エラー:', err));
    }
  }, [session]);

  // ローディング中は何も表示しない
  if (status === 'loading') {
    return (
      <div className="my-2.5 text-center">
        <p className="text-gray-600 text-sm">読み込み中...</p>
      </div>
    );
  }

  if (status === 'authenticated' && session) {
    return (
      <>
        <div className="my-2.5 text-center">
          <img 
            src={defaultAvatarUrl}
            alt={session.user?.name || 'ユーザー'} 
            className="md:hidden mx-auto mb-2 rounded-full w-20 h-20 object-cover"
          />
          <Link href="/profileset" className="text-[#ff6b35]">
            {session.user?.name || 'ゲスト'}
          </Link>
          さん<br />
          獲得ポイント: {totalPoints.toLocaleString()}pt
        </div>
        
        <div className="my-2.5 text-center">
          <Link href="/ankeworks" className="inline-block">
            <img 
              src="https://anke.jp/wp-content/themes/anke/images/ankeworks.webp" 
              alt="アンケワークス" 
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
    );
  }

  return (
    <>
      {/* LINEログインボタン */}
      <div className="flex flex-col items-center my-2.5 w-full">
        <button 
          className="inline-flex justify-center items-center gap-1 px-6 py-3 rounded font-bold text-white text-sm no-underline transition-colors"
          style={{ minWidth: '180px', backgroundColor: '#06C755' }}
        >
          <span style={{ fontWeight: 'bold' }}>LINE</span>でログイン
        </button>
      </div>
      
      {/* Xログインボタン */}
      <div className="flex flex-col items-center my-2.5 w-full">
        <button 
          className="inline-flex justify-center items-center gap-0 bg-black hover:bg-gray-800 px-6 py-3 rounded font-bold text-white text-sm no-underline transition-colors"
          style={{ minWidth: '180px' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-1">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
          </svg>
          でログイン
        </button>
      </div>
      
      {/* または */}
      <div className="my-2.5 text-center">
        <p className="text-gray-600 text-xs">または</p>
      </div>
      
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
}
