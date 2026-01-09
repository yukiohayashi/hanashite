import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function UserNotFound() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      
      <div className="wrapper md:flex md:justify-center md:mx-auto mt-14 md:mt-[70px] md:pt-0 md:max-w-7xl">
        <main className="flex-1 px-4 py-10">
          <div className="bg-white shadow-sm p-10 rounded-lg text-center">
            <h1 className="mb-4 font-bold text-2xl text-gray-800">ユーザーが見つかりません</h1>
            <p className="mb-6 text-gray-600">指定されたユーザーは存在しないか、削除されました。</p>
            <Link 
              href="/" 
              className="inline-block bg-orange-500 hover:bg-orange-600 px-6 py-3 rounded text-white transition-colors"
            >
              トップページへ戻る
            </Link>
          </div>
        </main>
      </div>
      
      <Footer />
    </div>
  );
}
