'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface LoginRequiredProps {
  children: React.ReactNode;
  pageName: string;
}

export default function LoginRequired({ children, pageName }: LoginRequiredProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // デバッグ用
  console.log('LoginRequired - status:', status);
  console.log('LoginRequired - session:', session);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center bg-gray-50 min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="wrapper" style={{ display: 'flex', maxWidth: '1260px', margin: '70px auto 0', justifyContent: 'center' }}>
          <main className="article__contents" style={{ minWidth: '690px', margin: '0 5px' }}>
            <h1 className="mb-4 p-0 font-bold text-[#ff6b35] text-2xl">{pageName}</h1>
            <div className="bg-white shadow-sm p-6 rounded-lg text-center">
              <p className="mb-4 text-gray-600">ログインしてください。</p>
              <a href="/login" className="inline-block bg-[#ff6b35] hover:bg-orange-600 px-10 py-4 rounded font-bold text-white transition-colors">
                ログイン
              </a>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
