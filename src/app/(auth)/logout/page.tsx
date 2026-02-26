'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();
  
  useEffect(() => {
    const performLogout = async () => {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      
      // キャッシュをクリア
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // ログアウト実行
      await signOut({ callbackUrl: baseUrl, redirect: true });
      
      // ページをリロードしてキャッシュを完全にクリア
      router.refresh();
    };
    
    performLogout();
  }, [router]);

  return (
    <div className="flex justify-center items-center bg-gray-50 min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">ログアウト中...</p>
      </div>
    </div>
  );
}
