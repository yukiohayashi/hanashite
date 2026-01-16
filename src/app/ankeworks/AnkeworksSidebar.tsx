'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface User {
  id: string;
  name: string;
  points: number;
  participate_points: boolean;
}

export default function AnkeworksSidebar() {
  const { data: session } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/user/${session.user.id}`);
        if (response.ok) {
          const userData = await response.json();
          console.log('AnkeworksSidebar - User data:', userData);
          setUser({
            id: userData.id,
            name: userData.user_nicename || userData.name || session.user.name || 'ユーザー',
            points: userData.points || 0,
            participate_points: true
          });
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [session]);

  if (loading) {
    return (
      <div className="bg-white p-4">
        <div className="text-center text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white p-4">
        <div className="text-center mb-4">
          <div className="mb-3">
            <Image
              src="/images/ankeworks.webp"
              alt="アンケワークス"
              width={100}
              height={25}
              className="mx-auto"
            />
          </div>
          <p className="text-sm text-gray-700 mb-4">
            ログインしてアンケワークスを利用しましょう
          </p>
          <Link
            href="/login"
            className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded transition-colors text-center text-sm"
          >
            ログイン
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* ユーザー情報 */}
      <div className="text-center p-4 border-b border-gray-200">
        <div className="font-bold text-base mb-1 text-orange-500">{user.name}さん</div>
        <div className="text-xs text-gray-800 mb-3">獲得ポイント: {user.points.toLocaleString()}pt</div>
        
        {/* アンケワークスロゴ */}
        <div className="mb-3">
          <Image
            src="/images/ankeworks.webp"
            alt="アンケワークス"
            width={100}
            height={25}
            className="mx-auto"
          />
        </div>

        <Link
          href="/profileset"
          className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded transition-colors text-center text-sm"
        >
          プロフィール
        </Link>
      </div>

      {/* メニューリスト */}
      <ul className="list-none p-0 m-0">
        <li>
          <Link href="/mypage" className="block border-b border-gray-200 text-sm p-3 hover:bg-gray-100 text-black">
            通知
          </Link>
        </li>
        <li>
          <Link href={`/user/${user.id}`} className="block border-b border-gray-200 text-sm p-3 hover:bg-gray-100 text-black">
            プロフィール
          </Link>
        </li>
        <li>
          <Link href="/favorites" className="block border-b border-gray-200 text-sm p-3 hover:bg-gray-100 text-black">
            お気に入り
          </Link>
        </li>
        <li>
          <Link href="/myanke" className="block border-b border-gray-200 text-sm p-3 hover:bg-gray-100 text-black">
            作成したアンケート
          </Link>
        </li>
        {user.participate_points && (
          <>
            <li>
              <Link href="/phistory" className="block border-b border-gray-200 text-sm p-3 hover:bg-gray-100 text-black">
                ポイント履歴
              </Link>
            </li>
            <li>
              <Link href="/point" className="block border-b border-gray-200 text-sm p-3 hover:bg-gray-100 text-black">
                ポイント交換
              </Link>
            </li>
          </>
        )}
        <li>
          <Link href="/post-create" className="block border-b border-gray-200 text-sm p-3 hover:bg-gray-100 text-black">
            アンケート作成
          </Link>
        </li>
        <li>
          <Link href="/password" className="block border-b border-gray-200 text-sm p-3 hover:bg-gray-100 text-black">
            パスワード
          </Link>
        </li>
        <li>
          <Link href="/inquiry" className="block border-b border-gray-200 text-sm p-3 hover:bg-gray-100 text-black">
            お問い合わせ
          </Link>
        </li>
        <li>
          <Link href="/regist?a=logout" className="block border-b border-gray-200 text-sm p-3 hover:bg-gray-100 text-black">
            ログアウト
          </Link>
        </li>
        <li>
          <Link href="/report" className="block text-sm p-3 hover:bg-gray-100 text-black">
            [通報する]
          </Link>
        </li>
      </ul>
    </div>
  );
}
