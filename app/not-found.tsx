import Link from 'next/link';
import Header from './components/Header';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import RightSidebar from './components/RightSidebar';

export default function NotFound() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />

      <main className="md:flex md:justify-center mx-auto mt-14 md:mt-[70px] md:pt-0 max-w-7xl">
        {/* 左サイドバー */}
        <aside className="hidden md:block w-[220px]">
          <Sidebar />
        </aside>

        {/* メインコンテンツ */}
        <div className="flex-1 md:max-w-[760px] px-4 md:px-0">
          <div className="bg-white shadow-sm rounded-lg p-8 text-center my-8">
            <div className="mb-6">
              <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">404 - ページが見つかりません</h1>
            <p className="text-xl text-gray-600 mb-4">Not Found</p>
            <p className="text-gray-600 mb-8">
              お探しのページは存在しないか、移動した可能性があります。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/" 
                className="inline-block px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                トップページに戻る
              </Link>
              <Link 
                href="/posts" 
                className="inline-block px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                投稿一覧を見る
              </Link>
            </div>
          </div>
        </div>

        {/* 右サイドバー */}
        <aside className="hidden md:block w-[280px]">
          <RightSidebar />
        </aside>
      </main>

      <Footer />
    </div>
  );
}
