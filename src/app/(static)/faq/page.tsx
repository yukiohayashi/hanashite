import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function FAQPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      
      <main className="mx-auto mt-14 md:mt-[70px] px-4 py-8 max-w-4xl">
        <h1 className="mb-8 font-bold text-gray-900 text-3xl">よくあるご質問</h1>
        
        <div className="space-y-4">
          <div className="bg-white shadow-sm p-6 rounded-lg">
            <h2 className="mb-3 font-bold text-gray-900 text-lg">Q. ハナシテとは何ですか？</h2>
            <p className="text-gray-700">
              A. ハナシテは、誰でも簡単にアンケートを作成・回答できるコミュニティサイトです。
              様々なテーマのアンケートに参加したり、自分でアンケートを作成して意見を集めることができます。
            </p>
          </div>

          <div className="bg-white shadow-sm p-6 rounded-lg">
            <h2 className="mb-3 font-bold text-gray-900 text-lg">Q. 利用料金はかかりますか？</h2>
            <p className="text-gray-700">
              A. 基本的な機能は無料でご利用いただけます。一部の有料機能については、別途ご案内いたします。
            </p>
          </div>

          <div className="bg-white shadow-sm p-6 rounded-lg">
            <h2 className="mb-3 font-bold text-gray-900 text-lg">Q. 会員登録は必須ですか？</h2>
            <p className="text-gray-700">
              A. アンケートの閲覧や回答は会員登録なしでも可能ですが、
              アンケートの作成やコメント投稿、ポイント獲得には会員登録が必要です。
            </p>
          </div>

          <div className="bg-white shadow-sm p-6 rounded-lg">
            <h2 className="mb-3 font-bold text-gray-900 text-lg">Q. ポイントはどのように貯まりますか？</h2>
            <p className="text-gray-700">
              A. アンケートへの回答、コメント投稿、アンケート作成などでポイントが貯まります。
              詳細はアンケワークスのページをご確認ください。
            </p>
          </div>

          <div className="bg-white shadow-sm p-6 rounded-lg">
            <h2 className="mb-3 font-bold text-gray-900 text-lg">Q. ポイントは何に交換できますか？</h2>
            <p className="text-gray-700">
              A. 貯まったポイントは、Amazonギフト券やその他の電子マネーに交換できます。
              交換方法の詳細はポイントページをご確認ください。
            </p>
          </div>

          <div className="bg-white shadow-sm p-6 rounded-lg">
            <h2 className="mb-3 font-bold text-gray-900 text-lg">Q. パスワードを忘れてしまいました</h2>
            <p className="text-gray-700">
              A. ログインページの「パスワードを忘れた方」からパスワードの再設定が可能です。
              登録されているメールアドレスに再設定用のリンクをお送りします。
            </p>
          </div>

          <div className="bg-white shadow-sm p-6 rounded-lg">
            <h2 className="mb-3 font-bold text-gray-900 text-lg">Q. 退会したい場合はどうすればいいですか？</h2>
            <p className="text-gray-700">
              A. マイページの設定から退会手続きが可能です。
              退会されると、保有ポイントや投稿データは削除されますのでご注意ください。
            </p>
          </div>

          <div className="bg-white shadow-sm p-6 rounded-lg">
            <h2 className="mb-3 font-bold text-gray-900 text-lg">Q. その他のお問い合わせ</h2>
            <p className="text-gray-700">
              A. 上記以外のご質問は、以下のメールアドレスまでお問い合わせください。<br />
              <a href="mailto:info@dokujo.com" className="text-blue-600 hover:text-blue-800 hover:underline">info@dokujo.com</a>
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
