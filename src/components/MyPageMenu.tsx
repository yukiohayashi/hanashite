'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function MyPageMenu() {
  const { data: session } = useSession();
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [userName, setUserName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  useEffect(() => {
    if (session?.user?.id) {
      // ユーザー情報を取得
      fetch(`/api/user/${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.profile_slug) {
            setProfileSlug(data.profile_slug);
          }
          setUserName(data.name || session.user.name || 'ゲスト');
          setAvatarUrl(data.user_img_url || '');
        })
        .catch(err => console.error('ユーザー情報取得エラー:', err));

      // ポイント情報を取得
      fetch(`/api/phistory?userId=${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.totalPoints !== undefined) {
            setTotalPoints(data.totalPoints);
          }
        })
        .catch(err => console.error('ポイント取得エラー:', err));
    }
  }, [session]);

  if (!session) {
    return null;
  }

  const profileUrl = profileSlug ? `/users/${profileSlug}` : `/users/${session.user.id}`;

  return (
    <div className="space-y-4">
      {/* ユーザー情報セクション */}
      <div className="my-2.5 text-center">
        {avatarUrl ? (
          <img 
            src={avatarUrl}
            alt={userName || 'ゲスト'} 
            className="md:hidden mx-auto mb-2 rounded-full w-20 h-20 object-cover"
          />
        ) : (
          <div className="md:hidden relative bg-gray-300 rounded-full w-20 h-20 overflow-hidden mx-auto mb-2">
            <div className="absolute top-[16px] left-1/2 bg-white rounded-full w-[36px] h-[36px] -translate-x-1/2"></div>
            <div className="absolute top-[44px] left-1/2 bg-white rounded-[50%_50%_50%_50%/60%_60%_40%_40%] w-[54px] h-[40px] -translate-x-1/2"></div>
          </div>
        )}
        <Link href="/profileset" className="text-[#ff6b35]">
          {userName || 'ゲスト'}
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
          href={profileUrl}
          className="inline-flex justify-center items-center bg-[#ff6b35] hover:bg-[#e58a2f] px-6 py-3 rounded font-bold text-white text-sm no-underline transition-colors"
          style={{ minWidth: '180px' }}
        >
          プロフィール
        </Link>
      </div>

      {/* メニューリスト */}
      <ul className="p-0 overflow-hidden list-none">
      <Link href="/mypage" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline">
        <li>通知</li>
      </Link>
      <Link href={profileUrl} className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline">
        <li>プロフィール</li>
      </Link>
      <Link href="/favorites" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline">
        <li>お気に入り</li>
      </Link>
      <Link href="/myanke" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline">
        <li>作成したアンケート</li>
      </Link>
      <Link href="/phistory" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline">
        <li>ポイント履歴</li>
      </Link>
      <Link href="/point" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline">
        <li>ポイント交換</li>
      </Link>
      <Link href="/post-create" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline">
        <li>アンケート作成</li>
      </Link>
      <Link href="/password" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline">
        <li>パスワード</li>
      </Link>
      <Link href="/inquiry" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline">
        <li>お問い合わせ</li>
      </Link>
      <Link href="/logout" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline">
        <li>ログアウト</li>
      </Link>
      <Link href="/report" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline">
        <li>[通報する]</li>
      </Link>
    </ul>
    </div>
  );
}
