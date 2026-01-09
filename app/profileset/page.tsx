import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';
import RightSidebar from '../mypage/RightSidebar';
import MyPageMenu from '../mypage/MyPageMenu';
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
      
      <div className="md:flex md:justify-center md:mx-auto mt-14 md:mt-[70px] md:pt-0 md:max-w-7xl">
        <main className="flex-1 px-4 max-w-3xl">
          <h1 className="mb-4 p-0 font-bold text-orange-500 text-2xl">
            {isFirstTime ? 'プロフィール登録' : 'プロフィール設定'}
          </h1>
          
          <ProfileSetForm 
            user={user}
            categories={categories || []}
            isFirstTime={isFirstTime}
          />
        </main>
        
        <aside className="hidden md:block md:shrink-0 md:w-80">
          <div className="mb-4">
            <RightSidebar />
          </div>
          <MyPageMenu />
        </aside>
      </div>
      
      <Footer />
    </div>
  );
}
