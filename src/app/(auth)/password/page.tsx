import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MyPageMenu from '@/components/MyPageMenu';
import LoginRequired from '@/components/LoginRequired';
import PasswordChangeForm from './PasswordChangeForm';

export default async function PasswordPage() {
  return (
    <LoginRequired pageName="パスワード変更">
      <div className="bg-gray-50 min-h-screen">
        <Header />
      
      <div className="wrapper max-w-[1260px] mx-auto mt-16 md:mt-4 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-5">
        <main className="flex-1 md:min-w-[690px] w-full">
          <h1 className="mb-4 py-1 font-bold text-[#ff6b35] text-2xl">
            パスワード変更
          </h1>
          <PasswordChangeForm />
        </main>
        
        <aside className="hidden md:block w-full md:w-[280px] md:min-w-[280px]">
          <MyPageMenu />
        </aside>
        </div>
      </div>
      
        <Footer />
      </div>
    </LoginRequired>
  );
}
