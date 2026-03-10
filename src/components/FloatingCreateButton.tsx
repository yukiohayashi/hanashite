'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { PenSquare } from 'lucide-react';

export default function FloatingCreateButton() {
  const [isVisible, setIsVisible] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();

  // 表示を許可するページのパターン
  const allowedPages = [
    '/', // トップページ
    /^\/posts\/\d+$/, // 記事詳細ページ
    /^\/category\/\d+$/, // カテゴリページ
    /^\/keyword\/\d+$/, // キーワードページ
    /^\/users\/[^/]+$/, // ユーザーページ
  ];

  // 現在のページが許可されているかチェック
  const isAllowedPage = allowedPages.some(pattern => 
    typeof pattern === 'string' ? pathname === pattern : pattern.test(pathname)
  );

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Link href={session ? "/post-create" : "/login"}>
      <Button
        className={`
          fixed bottom-24 right-4 md:bottom-6 md:right-8 z-50
          w-20 h-20 md:w-20 md:h-20
          bg-gradient-to-r from-pink-400 to-orange-400
          hover:from-pink-500 hover:to-orange-500
          rounded-full shadow-lg hover:shadow-xl
          transition-all duration-500
          flex flex-col items-center justify-center
          group
          ${!isVisible || !isAllowedPage ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'}
        `}
      >
        <span className="text-base md:text-lg font-bold text-white text-center leading-tight">
          相談<br />する
        </span>
        <div className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
          <PenSquare className="w-3 h-3 text-pink-500" />
        </div>
      </Button>
    </Link>
  );
}
