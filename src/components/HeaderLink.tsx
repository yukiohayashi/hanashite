'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function HeaderLink() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [participatePoints, setParticipatePoints] = useState<number>(0);
  const isAnkeworks = pathname?.startsWith('/ankeworks') || pathname?.startsWith('/workers');

  useEffect(() => {
    if (session?.user?.id) {
      // ユーザーのparticipate_pointsを取得
      fetch(`/api/user/${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          setParticipatePoints(data.participate_points || 0);
        })
        .catch(() => {
          setParticipatePoints(0);
        });
    }
  }, [session]);

  // アンケワークスページにいる場合は、アンケートへのリンクを表示
  if (isAnkeworks) {
    return (
      <a 
        href="/" 
        className="hidden md:flex md:items-center md:bg-[#FFE3D6] md:pr-[5px] md:pl-[85px] md:border-gray-300 md:border-r md:border-l md:max-w-[200px] md:text-[0.8rem] md:text-left pc"
        style={{
          backgroundImage: 'url(/images/anke.webp)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'left center',
          backgroundSize: '80px'
        }}
      >
        <div>
          アンケートで<br />
          人と繋がる! <i className="fa-arrow-circle-right fa"></i>
        </div>
      </a>
    );
  }

  // ポイント獲得に参加していないユーザーには表示しない
  if (participatePoints !== 1) {
    return null;
  }

  // ポイント獲得に参加しているユーザーにはアンケワークスへのリンクを表示
  return (
    <a 
      href="/ankeworks" 
      className="hidden md:flex md:items-center md:bg-[#FFE3D6] md:pr-[5px] md:pl-[85px] md:border-gray-300 md:border-r md:border-l md:max-w-[200px] md:text-[0.8rem] md:text-left pc"
      style={{
        backgroundImage: 'url(/images/ankeworks.webp)',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'left center',
        backgroundSize: '80px'
      }}
    >
      <div>
        アンケートで<br />
        副業!! <i className="fa-arrow-circle-right fa"></i>
      </div>
    </a>
  );
}
