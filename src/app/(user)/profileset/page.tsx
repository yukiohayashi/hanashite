import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MyPageMenu from '@/components/MyPageMenu';
import ProfileSetForm from './ProfileSetForm';

export default async function ProfileSetPage() {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  // ユーザー情報を取得
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (!user) {
    redirect('/login');
  }

  // カテゴリー一覧を取得
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .neq('slug', 'gambling')
    .neq('slug', 'news')
    .order('display_order', { ascending: true });

  const isFirstTime = !user.profile_registered;

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      
      <div className="wrapper max-w-[1260px] mx-auto mt-16 md:mt-4 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-5">
        <main className="flex-1 md:min-w-[690px] w-full">
          <h1 className="mb-4 p-0 font-bold text-orange-500 text-2xl">
            {isFirstTime ? 'プロフィール登録' : 'プロフィール設定'}
          </h1>
          
          <ProfileSetForm 
            user={user}
            categories={categories || []}
            isFirstTime={isFirstTime}
          />
        </main>
        
        <aside className="hidden md:block w-full md:w-[280px] md:min-w-[280px]">
          <MyPageMenu />
        </aside>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
