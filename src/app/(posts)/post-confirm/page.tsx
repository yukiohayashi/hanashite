import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RightSidebar from '@/components/RightSidebar';
import MyPageMenu from '@/components/MyPageMenu';
import PostConfirmView from './PostConfirmView';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'アンケート確認',
};

export default async function PostConfirmPage() {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      
      <div className="wrapper md:flex md:max-w-full md:mx-2.5 md:mt-2 md:justify-center pt-20 md:pt-2 mx-auto">
        <main className="article__contents md:min-w-[690px] mx-1 md:mx-1.5">
          <h1 className="mb-4 p-0 font-bold text-[#ff6b35] text-2xl">
            アンケート作成確認
          </h1>
          
          <PostConfirmView />
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
