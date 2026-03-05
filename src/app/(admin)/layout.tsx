import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // デバッグ用ログ
  console.log('Admin Layout - Session:', JSON.stringify(session, null, 2));
  console.log('Admin Layout - User ID:', session?.user?.id);
  console.log('Admin Layout - User Status:', session?.user?.status);

  // 管理者権限チェック（status: 1=運営者, 2=編集者）
  const hasAccess = session && session.user?.status && (session.user.status === 1 || session.user.status === 2);

  if (!hasAccess) {
    console.log('Admin Layout - Access denied, redirecting to /');
    redirect('/');
  }

  return <>{children}</>;
}
