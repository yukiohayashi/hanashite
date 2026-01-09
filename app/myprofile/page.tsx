import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function MyProfilePage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  // ユーザーのprofile_slugを取得してリダイレクト
  const { supabase } = await import('../lib/supabase');
  const { data: user } = await supabase
    .from('users')
    .select('id, profile_slug')
    .eq('id', parseInt(session.user.id))
    .single();

  if (user?.profile_slug) {
    redirect(`/user/${user.profile_slug}`);
  } else {
    redirect(`/user/${user.id}`);
  }
}
