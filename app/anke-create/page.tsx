import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import RightSidebar from '../mypage/RightSidebar';
import MyPageMenu from '../mypage/MyPageMenu';
import AnkeCreateForm from './AnkeCreateForm';

export default async function AnkeCreatePage() {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      
      <div className="wrapper" style={{ display: 'flex', maxWidth: '1260px', margin: '70px auto 0', justifyContent: 'center' }}>
        <main className="article__contents" style={{ minWidth: '690px', margin: '0 5px' }}>
          <h1 className="mb-4 p-0 font-bold text-[#ff6b35] text-2xl">
            アンケート作成
          </h1>
          
          <AnkeCreateForm />
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
