'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

interface User {
  id: number;
  name: string;
  points: number;
  participate_points: boolean;
}

export default function AnkeworksSidebar() {
  // 仮のユーザー情報（実際はセッションから取得）
  const [user] = useState<User>({
    id: 1,
    name: '離波ママ',
    points: 10661,
    participate_points: true
  });

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
          <Link href="/favorite" className="block border-b border-gray-200 text-sm p-3 hover:bg-gray-100 text-black">
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
          <Link href="/anke-create" className="block border-b border-gray-200 text-sm p-3 hover:bg-gray-100 text-black">
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
