'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { PenSquare } from 'lucide-react';

export default function FloatingCreateButton() {
  const [isVisible, setIsVisible] = useState(false);
  const { data: session } = useSession();

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

  // ログインしていない場合は表示しない
  if (!session) {
    return null;
  }

  return (
    <Link href="/anke-create">
      <Button
        className={`
          fixed bottom-4 right-4 md:bottom-6 md:right-8 z-50
          w-16 h-16 md:w-20 md:h-20
          bg-gradient-to-r from-pink-400 to-orange-400
          hover:from-pink-500 hover:to-orange-500
          rounded-full shadow-lg hover:shadow-xl
          transition-all duration-500
          flex flex-col items-center justify-center
          group
          ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}
        `}
      >
        <span className="text-xs md:text-sm font-bold text-white text-center leading-tight">
          アンケート<br />作成
        </span>
        <div className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
          <PenSquare className="w-3 h-3 text-pink-500" />
        </div>
      </Button>
    </Link>
  );
}
