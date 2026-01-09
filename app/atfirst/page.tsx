import Header from '../components/Header';
import Footer from '../components/Footer';
import RightSidebar from '../mypage/RightSidebar';
import MyPageMenu from '../mypage/MyPageMenu';
import LoginRequired from '../components/LoginRequired';

export default async function AtFirstPage() {
  return (
    <LoginRequired pageName="初めての方へ">
      <div className="bg-gray-50 min-h-screen">
        <Header />
      
      <div className="wrapper" style={{ display: 'flex', maxWidth: '1260px', margin: '70px auto 0', justifyContent: 'center' }}>
        <main className="article__contents" style={{ minWidth: '690px', margin: '0 5px' }}>
          <h1 className="mb-4 p-0 font-bold text-[#ff6b35] text-2xl">
            初めての方へ
          </h1>
          <div className="bg-white shadow-sm p-6 rounded-lg">
            <p className="text-gray-600 text-center">初めての方へページは準備中です</p>
          </div>
        </main>
        
        <aside className="hidden md:block md:flex-shrink-0 md:w-80">
          <div className="mb-4">
            <RightSidebar />
          </div>
          <MyPageMenu />
        </aside>
      </div>
      
        <Footer />
      </div>
    </LoginRequired>
  );
}
