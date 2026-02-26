import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MyPageMenu from '@/components/MyPageMenu';
import FavoritesList from './FavoritesList';

export default async function FavoritesPage() {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      
      <div className="wrapper max-w-[1260px] mx-auto mt-16 md:mt-4 px-2 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-5">
        <main className="flex-1 md:min-w-[690px] w-full">
          <h1 className="mb-4 py-1 font-bold text-[#ff6b35] text-2xl">
            お気に入り
          </h1>
          
          <FavoritesList />
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
