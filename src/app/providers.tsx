'use client';

import { SessionProvider } from 'next-auth/react';
import { auth } from '@/lib/auth';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
