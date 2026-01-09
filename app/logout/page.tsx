'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    signOut({ callbackUrl: '/' });
  }, []);

  return (
    <div className="flex justify-center items-center bg-gray-50 min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">ログアウト中...</p>
      </div>
    </div>
  );
}
