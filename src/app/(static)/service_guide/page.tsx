import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function MediaPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      
      <main className="mx-auto mt-14 md:mt-[70px] px-4 py-8 max-w-4xl">
        <h1 className="mb-8 font-bold text-gray-900 text-3xl">データ引用について</h1>
        
        <div className="bg-white shadow-sm p-6 rounded-lg max-w-none prose prose-sm">
          <h2>ハナシテのデータ引用について</h2>
          <p>
            ハナシテで実施されたアンケート結果は、メディア、ブログ、SNSなどで自由に引用していただけます。
          </p>

          <h2>引用時のお願い</h2>
          <p>データを引用される際は、以下の点にご注意ください。</p>
          <ul>
            <li>info@dokujo.com元として「ハナシテ」を明記してください</li>
            <li>可能な限り、該当するアンケートページへのリンクを設置してください</li>
            <li>データの改変や歪曲はお控えください</li>
            <li>商用利用の場合は、事前にご連絡いただけますと幸いです</li>
          </ul>

          <h2>引用例</h2>
          <div className="bg-gray-50 p-4 rounded">
            <p className="mb-2">info@dokujo.com: ハナシテ「〇〇に関する相談」</p>
            <p className="text-gray-600 text-sm">https://anke.jp/posts/[アンケートID]</p>
          </div>

          <h2>お問い合わせ</h2>
          <p>
            データ引用に関するご質問やご相談は、以下までお気軽にお問い合わせください。
          </p>
          <p>
            メールアドレス: <a href="mailto:info@dokujo.com" className="text-blue-600 hover:text-blue-800 hover:underline">info@dokujo.com</a>
          </p>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
