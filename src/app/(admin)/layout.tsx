import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // 管理者権限チェック（status: 1=運営者, 2=編集者）
  const hasAccess = session && session.user?.status && (session.user.status === 1 || session.user.status === 2);

  if (!hasAccess) {
    redirect('/');
  }

  return <>{children}</>;
}
