import Header from '../components/Header';
import Footer from '../components/Footer';
import Link from 'next/link';

export default function ServiceGuidePage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      
      <main className="mx-auto mt-14 md:mt-[70px] px-4 py-8 max-w-4xl">
        <h1 className="mb-8 font-bold text-gray-900 text-3xl">アンケワークス</h1>
        
        <div className="space-y-6">
          <div className="bg-white shadow-sm p-6 rounded-lg">
            <h2 className="mb-4 font-bold text-gray-900 text-xl">アンケワークスとは</h2>
            <p className="mb-4 text-gray-700 leading-relaxed">
              アンケワークスは、アンケ.jpが提供するアンケート回答サービスです。
              企業や団体からの依頼を受けて、会員の皆様にアンケートにご回答いただき、
              その対価としてポイントを獲得できます。
            </p>
          </div>

          <div className="bg-white shadow-sm p-6 rounded-lg">
            <h2 className="mb-4 font-bold text-gray-900 text-xl">ポイントの獲得方法</h2>
            <ul className="space-y-2 text-gray-700 list-disc list-inside">
              <li>アンケートに回答する</li>
              <li>コメントを投稿する</li>
              <li>アンケートを作成する</li>
              <li>デイリーボーナス</li>
            </ul>
          </div>

          <div className="bg-white shadow-sm p-6 rounded-lg">
            <h2 className="mb-4 font-bold text-gray-900 text-xl">ポイント交換</h2>
            <p className="mb-4 text-gray-700 leading-relaxed">
              貯まったポイントは、Amazonギフト券やその他の電子マネーに交換できます。
            </p>
            <p className="text-gray-700 leading-relaxed">
              詳細は<Link href="/point" className="text-blue-600 hover:text-blue-800 hover:underline">ポイントページ</Link>をご確認ください。
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
