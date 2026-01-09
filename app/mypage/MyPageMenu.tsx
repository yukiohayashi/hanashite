'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function MyPageMenu() {
  const { data: session } = useSession();
  const [profileSlug, setProfileSlug] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
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

  if (!session) {
    return null;
  }

  const profileUrl = profileSlug ? `/users/${profileSlug}` : `/users/${session.user.id}`;

  return (
    <ul className="p-0 overflow-hidden list-none">
      <Link href="/mypage" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline">
        <li>通知</li>
      </Link>
      <Link href={profileUrl} className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline">
        <li>プロフィール</li>
      </Link>
      <Link href="/mypage/favorites" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline">
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
      <Link href="/anke-create" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline">
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
  );
}
