import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function CompanyPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      
      <main className="mx-auto mt-14 md:mt-[70px] px-4 py-8 max-w-4xl">
        <h1 className="mb-8 font-bold text-gray-900 text-3xl">運営情報</h1>
        
        <div className="bg-white shadow-sm p-6 rounded-lg">
          <table className="w-full">
            <tbody>
              <tr className="border-gray-200 border-b">
                <th className="bg-gray-50 px-6 py-4 w-1/3 font-bold text-gray-700 text-sm text-left">会社名</th>
                <td className="px-6 py-4 text-gray-900 text-sm">株式会社サクメディア</td>
              </tr>
              <tr className="border-gray-200 border-b">
                <th className="bg-gray-50 px-6 py-4 font-bold text-gray-700 text-sm text-left">代表取締役</th>
                <td className="px-6 py-4 text-gray-900 text-sm">林 征夫</td>
              </tr>
              <tr className="border-gray-200 border-b">
                <th className="bg-gray-50 px-6 py-4 font-bold text-gray-700 text-sm text-left">業務内容</th>
                <td className="px-6 py-4 text-gray-900 text-sm">Webメディア運営、Webマーケティング、システム開発</td>
              </tr>
              <tr className="border-gray-200 border-b">
                <th className="bg-gray-50 px-6 py-4 font-bold text-gray-700 text-sm text-left">資本金</th>
                <td className="px-6 py-4 text-gray-900 text-sm">10,000,000円</td>
              </tr>
              <tr className="border-gray-200 border-b">
                <th className="bg-gray-50 px-6 py-4 font-bold text-gray-700 text-sm text-left">本店所在地</th>
                <td className="px-6 py-4 text-gray-900 text-sm">〒141-0031 東京都品川区西五反田1丁目28-3</td>
              </tr>
              <tr className="border-gray-200 border-b">
                <th className="bg-gray-50 px-6 py-4 font-bold text-gray-700 text-sm text-left">会社設立日</th>
                <td className="px-6 py-4 text-gray-900 text-sm">2007年1月17日</td>
              </tr>
              <tr className="border-gray-200 border-b">
                <th className="bg-gray-50 px-6 py-4 font-bold text-gray-700 text-sm text-left">営業日</th>
                <td className="px-6 py-4 text-gray-900 text-sm">平日（土日祝日を除く）</td>
              </tr>
              <tr className="border-gray-200 border-b">
                <th className="bg-gray-50 px-6 py-4 font-bold text-gray-700 text-sm text-left">電話番号</th>
                <td className="px-6 py-4 text-gray-900 text-sm">03-6910-4968</td>
              </tr>
              <tr>
                <th className="bg-gray-50 px-6 py-4 font-bold text-gray-700 text-sm text-left">メールアドレス</th>
                <td className="px-6 py-4 text-gray-900 text-sm">
                  <a href="mailto:info@dokujo.com" className="text-blue-600 hover:text-blue-800 hover:underline">
                    info@dokujo.com
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
