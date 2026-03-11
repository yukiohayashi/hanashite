'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    const checkProfile = async () => {
      if (status === 'loading') return;
      
      if (!session?.user?.id) {
        router.push('/login');
        return;
      }

      try {
        const response = await fetch('/api/user/profile-status');
        const data = await response.json();
        
        if (data.profile_registered) {
          router.push('/');
        } else {
          router.push('/profileset');
        }
      } catch (error) {
        console.error('Profile check error:', error);
        router.push('/');
      }
    };

    checkProfile();
  }, [session, status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#ff6b6b] mx-auto mb-4"></div>
        <p className="text-gray-600">ログイン処理中...</p>
      </div>
    </div>
  );
}
