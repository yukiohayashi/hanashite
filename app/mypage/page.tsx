import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import RightSidebar from './RightSidebar';
import MyPageMenu from './MyPageMenu';
import NotificationList from './NotificationList';

export default async function MyPage() {
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
            通知
          </h1>
          
          <NotificationList />
        </main>
        
        <aside className="R_aside" style={{ width: '280px', minWidth: '280px' }}>
          <div className="R_login pc">
            <RightSidebar />
          </div>
          <MyPageMenu />
        </aside>
      </div>
      
      <Footer />
    </div>
  );
}
