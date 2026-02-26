import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RightSidebar from '@/components/RightSidebar';
import MyPageMenu from '@/components/MyPageMenu';
import PostConfirmView from './PostConfirmView';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '相談記事の確認',
};

export default async function PostConfirmPage() {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      
      <div className="wrapper md:flex md:max-w-7xl md:mx-auto md:mt-2 md:justify-center md:gap-4 pt-20 md:pt-4 mx-auto px-4 sm:px-6 lg:px-8">
        <main className="flex-1 max-w-[760px]">
          <h1 className="mb-4 py-1 font-bold text-[#ff6b35] text-2xl">
            相談記事の確認画面
          </h1>
          
          <PostConfirmView />
        </main>
        
        <aside className="hidden md:block w-[280px]">
          <MyPageMenu />
        </aside>
      </div>
      
      <Footer />
    </div>
  );
}
