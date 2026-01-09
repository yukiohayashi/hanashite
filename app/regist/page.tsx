'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegistPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          invite_code: inviteCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('メールアドレス宛に認証メールを送信しました。メールをご確認ください。');
        setEmail('');
        setInviteCode('');
      } else {
        setError(data.error || '登録に失敗しました。');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('登録に失敗しました。しばらくしてから再度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ファーストビュー */}
      {!message && (
        <div className="relative w-full min-h-[50vh] md:min-h-[70vh] flex items-center justify-center bg-cover bg-center bg-no-repeat overflow-hidden" style={{ backgroundImage: 'url(/images/title_bg_element.webp)' }}>
          <div className="relative w-full min-h-[50vh] md:min-h-[70vh] border border-green-500 overflow-hidden">
            {/* ヘッダーロゴ（左上） */}
            <Link href="/" className="absolute top-0 left-0 w-[20%] md:w-[10%] max-w-[100px] z-[100000] m-1">
              <img 
                src="/images/head_logo.webp" 
                alt="anke" 
                className="w-full"
              />
            </Link>

            {/* メインロゴ（中央） */}
            <div className="absolute top-[45%] md:top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] md:w-[100vh] md:h-[100vh] z-[10000]">
              <h1 className="w-full animate-gentle-bounce">
                <img 
                  src="/images/title_logo.webp" 
                  alt="楽しく簡単お小遣い稼ぎ anke" 
                  className="w-full"
                />
              </h1>
            </div>

            {/* 緑の円（左上） */}
            <img 
              src="/images/title_circle_left.webp" 
              alt="" 
              className="absolute top-0 left-0 w-[40%] md:w-[20%] z-10 max-w-none"
            />

            {/* 女性画像（左下） */}
            <img 
              src="/images/title_image_left.webp" 
              alt="" 
              className="absolute bottom-0 left-0 w-[50%] md:w-[28%] z-10 max-w-none"
            />

            {/* 女性画像（右上） */}
            <img 
              src="/images/title_image_right.webp" 
              alt="" 
              className="absolute top-0 right-0 w-[50%] md:w-[28%] z-10 max-w-none"
            />

            {/* 緑の円（右下） */}
            <img 
              src="/images/title_circle_right.webp" 
              alt="" 
              className="absolute bottom-0 right-0 w-[40%] md:w-[18%] z-10 max-w-none"
            />
          </div>

          {/* カスタムアニメーション */}
          <style jsx>{`
            @keyframes gentle-bounce {
              0%, 100% {
                transform: translateY(0);
              }
              50% {
                transform: translateY(-10px);
              }
            }
            .animate-gentle-bounce {
              animation: gentle-bounce 4s ease-in-out infinite;
            }
          `}</style>
        </div>
      )}

      {/* 登録フォームセクション - 緑の背景 */}
      <section className="relative bg-green-500 py-4 md:py-8 bg-no-repeat bg-contain" style={{ 
        backgroundImage: 'url(/images/mialForm_coin.webp)',
        backgroundPosition: 'left bottom'
      }}>
        <div className="max-w-4xl mx-auto px-3">
          <div className="bg-white rounded-2xl p-3 md:p-6">
            {/* 黄色の内側ボックス */}
            <div className="bg-yellow-50 rounded-2xl p-3 md:p-6 mb-3 md:mb-4">
              <div className="text-center mb-2 md:mb-4">
                <img src="/images/mialForm_text.webp" alt="" className="mx-auto max-w-full" />
              </div>
            </div>

            {/* フォームコンテンツ */}
            <div className="text-center mb-4 md:mb-6">
              {!message && (
                <>
                  <p className="text-gray-700 mb-2 md:mb-4 text-sm md:text-base">
                    メールアドレスと招待コードを入力して、「認証メールを送る」ボタンを押してください。
                  </p>
                  <p className="text-orange-600 font-bold text-base md:text-lg">
                    ＼たった60秒！無料で会員登録／
                  </p>
                </>
              )}
            </div>

            {message && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 md:px-6 md:py-4 rounded-lg mb-4 md:mb-6">
                <p className="font-bold">{message}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 md:px-6 md:py-4 rounded-lg mb-4 md:mb-6">
                <p className="font-bold">{error}</p>
              </div>
            )}

            {!message && (
              <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                <div className="mb-4 md:mb-6">
                  <label htmlFor="email" className="block text-gray-700 font-bold mb-1 md:mb-2 text-sm md:text-base">
                
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm md:text-base"
                    placeholder="example@email.com"
                  />
                </div>

                <div className="mb-4 md:mb-6 text-center">
                  <label htmlFor="invite_code" className="block text-gray-700 font-bold mb-1 md:mb-2 text-sm md:text-base">
                    招待コード <span className="text-gray-500 text-xs md:text-sm">(任意)</span>
                  </label>
                  <input
                    type="text"
                    id="invite_code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="w-1/2 px-3 py-2 md:px-4 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm md:text-base"
                    placeholder="招待コード"
                  />
                </div>

                <div className="mt-4 md:mt-8">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 md:py-4 md:px-8 rounded-lg text-base md:text-lg disabled:bg-gray-400 transition-colors"
                  >
                    {loading ? '送信中...' : '認証メールを送る'}
                  </button>
                </div>
              </form>
            )}

            {!message && (
              <div className="mt-4 pt-4 md:mt-8 md:pt-8 border-t border-gray-200">
                <p className="text-center text-gray-600 text-xs md:text-sm mb-3 md:mb-4">または</p>
                <div className="flex justify-center">
                  <Link
                    href="/api/auth/signin/twitter"
                    className="inline-flex items-center gap-2 bg-black hover:bg-gray-800 text-white font-bold py-3 px-6 md:py-4 md:px-8 rounded-lg transition-colors text-sm md:text-base"
                  >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    で新規登録
                  </Link>
                </div>
              </div>
            )}

            {!message && (
              <div className="mt-4 md:mt-6 text-center text-xs md:text-sm text-gray-600 space-y-1">
                <p>※受信トレイにメールがない場合は、迷惑メールに紛れていないかご確認ください</p>
                <p>※パスワードは自動生成されます（登録後に変更可）</p>
                <p>※ニックネームは次のステップで作成してください</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* explainセクション - ポイントの貯め方説明 */}
      {!message && (
        <section className="relative py-8 md:py-12 bg-yellow-50 bg-cover" style={{ backgroundImage: 'url(/images/explain_bg.webp)' }}>
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-white rounded-2xl p-6 md:p-12">
                <div className="text-center mb-8">
                  <p className="text-orange-600 font-bold text-xl mb-4">
                    10,000pt=Amazonギフト1,000円交換♪
                  </p>
                  <h2 className="text-3xl md:text-5xl font-bold text-green-500 mb-6">
                    どうやってポイントを貯めるの？
                  </h2>
                </div>

                <div className="text-center mb-8">
                  <Link href="/ankeworks">
                    <img src="/images/ankeworks.svg" alt="アンケワークス" className="mx-auto w-1/2" />
                  </Link>
                </div>

                <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">
                  アンケ内の<span className="text-orange-500">アンケワークス</span>案件から、アンケートを作成してポイントを貯めていきます！
                </h2>

                <div className="mb-8">
                  <img src="/images/anke-works01.webp" alt="" className="w-full max-w-3xl mx-auto" />
                  <p className="text-center mt-4 text-gray-700">
                    アンケワークスは、企業様からのご依頼に基づき、アンケワーカーの皆様にアンケート作成や投票代行をお願いするサービスです。
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="text-center">
                    <img src="/images/explainWoman_01.webp" alt="" className="mx-auto" />
                  </div>
                  <div className="text-center">
                    <img src="/images/explainWoman_02.webp" alt="" className="mx-auto" />
                  </div>
                  <div className="text-center">
                    <img src="/images/explainWoman_03.webp" alt="" className="mx-auto" />
                  </div>
                </div>

                <h2 className="text-2xl md:text-3xl font-bold text-green-500 text-center mb-6">
                  アンケが選ばれる理由
                </h2>
                <ul className="space-y-3 text-gray-700 text-lg mb-8 pl-5">
                  <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-1 before:w-2 before:h-4 before:border-r-2 before:border-b-2 before:border-green-500 before:rotate-45">
                    自分でアンケートを作成でポイントゲット！
                  </li>
                  <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-1 before:w-2 before:h-4 before:border-r-2 before:border-b-2 before:border-green-500 before:rotate-45">
                    登録料・利用料がすべて無料！
                  </li>
                  <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-1 before:w-2 before:h-4 before:border-r-2 before:border-b-2 before:border-green-500 before:rotate-45">
                    投票&コメントでもポイントがつくから簡単&楽しい♪
                  </li>
                  <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-1 before:w-2 before:h-4 before:border-r-2 before:border-b-2 before:border-green-500 before:rotate-45">
                    社会貢献をしながらポイントが稼げる！
                  </li>
                  <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-1 before:w-2 before:h-4 before:border-r-2 before:border-b-2 before:border-green-500 before:rotate-45">
                    2005年創業の女性向けメディア企業が運営で安心！
                  </li>
                </ul>

                <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">
                  アンケートに<span className="text-orange-500">投票</span>される毎に<br />
                  ポイント獲得できます！
                </h2>
            </div>
          </div>
        </section>
      )}

      {/* makingセクション - アンケートを作って小遣いゲット */}
      {!message && (
        <section className="relative py-12 bg-green-500 bg-cover bg-center" style={{ backgroundImage: 'url(/images/making_bg.webp)' }}>
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-8">
              <img src="/images/making_title.webp" alt="独自サービスアンケートを作って小遣いゲット" className="mx-auto animate-bounce" style={{ animationDuration: '3s' }} />
            </div>
          </div>
        </section>
      )}

      {/* secondViewセクション - スキマ時間がもったいない */}
      {!message && (
        <section className="relative py-12 bg-cover bg-bottom" style={{ backgroundImage: 'url(/images/secondview_bg.webp)' }}>
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex flex-row justify-center items-end gap-2 md:gap-4 mb-8">
              <div className="text-center w-1/4">
                <p className="text-xs md:text-xl mb-2 leading-tight">スキマ時間が<br />もったいない</p>
                <img src="/images/secondview_line.webp" alt="" className="mx-auto w-full" />
              </div>
              <div className="text-center w-1/4">
                <p className="text-xs md:text-xl mb-2 leading-tight">たくさんの意見も<br className="md:hidden" />見てみたい</p>
                <img src="/images/secondview_line.webp" alt="" className="mx-auto w-full" />
              </div>
              <div className="text-center w-1/4">
                <p className="text-xs md:text-xl mb-2 leading-tight">難しい操作は<br className="md:hidden" />したくない</p>
                <img src="/images/secondview_line.webp" alt="" className="mx-auto w-full" />
              </div>
              <div className="text-center w-1/4">
                <p className="text-xs md:text-xl mb-2 leading-tight">Amazonで<br className="md:hidden" />使いたい…</p>
                <img src="/images/secondview_line.webp" alt="" className="mx-auto w-full" />
              </div>
            </div>
            <div className="text-center">
              <img src="/images/secondview_title.webp" alt="" className="mx-auto mb-4 animate-bounce" style={{ animationDuration: '3s' }} />
              <img src="/images/secondview_images.webp" alt="" className="mx-auto" />
            </div>
          </div>
        </section>
      )}

      {/* characterセクション - アンケワークス3つの特徴 */}
      {!message && (
        <section className="bg-white py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl md:text-5xl font-bold text-green-500 text-center mb-12">アンケワークス３つの特徴</h2>
            
            {/* 特徴1 */}
            <div className="flex flex-col md:flex-row items-center gap-8 mb-8 bg-white rounded-xl border-4 border-green-500 border-r-4 border-b-4 p-6">
              <div className="md:w-2/3">
                <p className="text-xl md:text-2xl font-bold text-green-700 mb-4">
                  <span className="text-orange-500">企業のアンケートに答えるから</span><br />
                  社会に貢献できる！
                </p>
                <p className="text-gray-700">アンケートの作成や回答を通して、企業のお悩みを解決しましょう！</p>
              </div>
              <div className="md:w-1/3">
                <img src="/images/character_image01.webp" alt="" className="w-full" />
              </div>
            </div>

            {/* 特徴2 */}
            <div className="flex flex-col md:flex-row items-center gap-8 mb-8 bg-white rounded-xl border-4 border-green-500 border-r-4 border-b-4 p-6">
              <div className="md:w-2/3">
                <p className="text-xl md:text-2xl font-bold text-green-700 mb-4">
                  興味がある話題を選んで<br />
                  <span className="text-orange-500">アンケートを作成できる！</span>
                </p>
                <p className="text-gray-700">興味のあるネタを選んでアンケートを作ってポイ活を楽しめます！</p>
              </div>
              <div className="md:w-1/3">
                <img src="/images/character_image02.webp" alt="" className="w-full" />
              </div>
            </div>

            {/* 特徴3 */}
            <div className="flex flex-col md:flex-row items-center gap-8 mb-8 bg-white rounded-xl border-4 border-green-500 border-r-4 border-b-4 p-6">
              <div className="md:w-2/3">
                <p className="text-xl md:text-2xl font-bold text-green-700 mb-4">
                  アンケートに投票を集めて<br />
                  <span className="text-orange-500">高額ポイントを稼ぐことができる！</span>
                </p>
                <p className="text-gray-700">SNSでフォロワーが多い方ほど効率よくお小遣いが稼げます！</p>
              </div>
              <div className="md:w-1/3">
                <img src="/images/character_image03.webp" alt="" className="w-full" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* stepセクション - 3つのステップ */}
      {!message && (
        <section className="bg-gray-50 py-12">
          <div className="max-w-4xl mx-auto px-4">
              <div className="text-center mb-12">
                <img src="/images/step_title.webp" alt="3つのステップ" className="mx-auto animate-bounce" style={{ animationDuration: '3s' }} />
              </div>

              {/* STEP 1 */}
              <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
                <div className="md:w-1/2">
                  <img src="/images/step_image01.webp" alt="" className="w-full" />
                </div>
                <div className="md:w-1/2">
                  <img src="/images/step_01.webp" alt="ポイント1" className="mb-4" />
                  <h2 className="text-2xl font-bold mb-4">毎日コツコツ、貯める</h2>
                  <p className="text-gray-700">
                    アンケのポイントを貯める方法は4つ。ログインボーナス20ptは毎日ゲットしましょう。
                  </p>
                </div>
              </div>

              {/* STEP 2 */}
              <div className="flex flex-col md:flex-row-reverse items-center gap-8 mb-12">
                <div className="md:w-1/2">
                  <img src="/images/step_image02.webp" alt="" className="w-full" />
                </div>
                <div className="md:w-1/2">
                  <img src="/images/step_02.webp" alt="ポイント2" className="mb-4" />
                  <h2 className="text-2xl font-bold mb-4">10,000pt貯めて、Amazonギフト交換</h2>
                  <p className="text-gray-700">
                    マイページから貯まったポイントをAmazonギフトのクーポンコード変換する申請を行います。
                  </p>
                </div>
              </div>

              {/* STEP 3 */}
              <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
                <div className="md:w-1/2">
                  <img src="/images/step_image03.webp" alt="" className="w-full" />
                </div>
                <div className="md:w-1/2">
                  <img src="/images/step_03.webp" alt="ポイント3" className="mb-4" />
                  <h2 className="text-2xl font-bold mb-4">お好きなものをAmazonで購入する</h2>
                  <p className="text-gray-700">
                    アンケからAmazonクーポンコードが届いたら、Amazonからお好きなものを購入しましょう。
                  </p>
                </div>
              </div>
          </div>
        </section>
      )}

      {/* voiceセクション - ユーザーの声 */}
      {!message && (
        <section className="bg-green-500 py-12">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-8 bg-contain bg-center bg-no-repeat py-8" style={{ backgroundImage: 'url(/images/voice_title.webp)' }}>
              <p className="text-2xl md:text-3xl font-bold text-white">報酬ランキング上位ユーザーの声</p>
            </div>

            {/* 1行目 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* ユーザー1 */}
              <div className="bg-white border-2 border-orange-500 rounded-lg overflow-hidden">
                <div className="bg-orange-500 relative p-4">
                  <img src="/images/voice_rank01.webp" alt="" className="absolute left-4 top-0 w-24 -mt-4" />
                  <p className="font-bold text-white pl-28">メルモさん</p>
                </div>
                <div className="p-6 flex flex-col items-center">
                  <img src="/images/voice_woman01.webp" alt="" className="w-32 mb-4" />
                  <p className="font-bold mb-2">頑張った甲斐がありました!ankeでよかった…！</p>
                  <p className="text-sm text-gray-700">
                    本当にただスキマ時間にぽちぽちしていただけなんです…！<br />
                    目標もなく時間が埋まる限りスマホを触ってたら、いつの間にか第一位に！<br />
                    <br />
                    達成感もありますし、なによりポイントがAmazonギフトに変わって少しだけ生活も明るくなりました!!<br />
                    まだまだ続けたいサイトですanke！
                  </p>
                </div>
              </div>

              {/* ユーザー2 */}
              <div className="bg-white border-2 border-orange-500 rounded-lg overflow-hidden">
                <div className="bg-orange-500 relative p-4">
                  <img src="/images/voice_rank02.webp" alt="" className="absolute left-4 top-0 w-24 -mt-4" />
                  <p className="font-bold text-white pl-28">ワインと魔法のお手伝いさん</p>
                </div>
                <div className="p-6 flex flex-col items-center">
                  <img src="/images/voice_woman02.webp" alt="" className="w-32 mb-4" />
                  <p className="font-bold mb-2">時間のお得とお金のお得</p>
                  <p className="text-sm text-gray-700">
                    アンケートサイトを触ったことがない人に是非入ってほしいです。<br />
                    <br />
                    私も実はankeが初めてのアンケートサイトでした。<br />
                    <br />
                    ほかのサイトと違い、特に身近な話題を皆さんが出してくれるのは不思議と安心感がありました。
                  </p>
                </div>
              </div>
            </div>

            {/* 2行目 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ユーザー3 */}
              <div className="bg-white border-2 border-orange-500 rounded-lg overflow-hidden">
                <div className="bg-orange-500 relative p-4">
                  <img src="/images/voice_rank03.webp" alt="" className="absolute left-4 top-0 w-24 -mt-4" />
                  <p className="font-bold text-white pl-28">明星オタクさん</p>
                </div>
                <div className="p-6 flex flex-col items-center">
                  <img src="/images/voice_woman03.webp" alt="" className="w-32 mb-4" />
                  <p className="font-bold mb-2">アンケート作れるのはどこにもない楽しさ…</p>
                  <p className="text-sm text-gray-700">
                    正直回答だけだと単調だったんです。<br />
                    <br />
                    ほかサイトもめぐって飽きて、めぐって飽きて…そしたら友人伝いでankeが舞い込んできて！<br />
                    <br />
                    アンケート作ってもポイント溜まりますし、ここの一番のいいところは飽きないとこかもしれません！
                  </p>
                </div>
              </div>

              {/* ユーザー4 */}
              <div className="bg-white border-2 border-orange-500 rounded-lg overflow-hidden">
                <div className="bg-orange-500 relative p-4">
                  <img src="/images/voice_rank04.webp" alt="" className="absolute left-4 top-0 w-24 -mt-4" />
                  <p className="font-bold text-white pl-28">乙女のレシピさん</p>
                </div>
                <div className="p-6 flex flex-col items-center">
                  <img src="/images/voice_woman04.webp" alt="" className="w-32 mb-4" />
                  <p className="font-bold mb-2">本当に始めてみてほしい！！</p>
                  <p className="text-sm text-gray-700">
                    アンケート初心者の方へ一言、本当に始めてほしい！！！！！<br />
                    <br />
                    私も完全初心者でしたがいつのまにか時間も忘れるほどピコピコしてて。。。<br />
                    <br />
                    ほかのサイトよりは個人的には推し！！
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FAQセクション */}
      {!message && (
        <section className="bg-yellow-50 py-12">
          <div className="max-w-4xl mx-auto px-4">
              <div className="text-center mb-8 bg-contain bg-center bg-no-repeat py-8" style={{ backgroundImage: 'url(/images/question_title.webp)' }}>
                <h2 className="text-3xl font-bold text-white">よくあるご質問</h2>
              </div>
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="font-bold text-lg mb-2">Q.運営会社について教えてください</h3>
                  <p className="text-gray-700">
                    運営会社は株式会社サクメディアが運営しております。2005年に創業し、15年以上の運営実績があるメディア事業を手がけております。
                  </p>
                </div>
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="font-bold text-lg mb-2">Q.無料でポイントをもらえるのはなぜですか？</h3>
                  <p className="text-gray-700">アンケート結果を企業様にご提供しております。</p>
                </div>
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="font-bold text-lg mb-2">Q.ankeの利用にお金はかかりますか？</h3>
                  <p className="text-gray-700">完全無料となっております。</p>
                </div>
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="font-bold text-lg mb-2">Q.ポイントはいつ交換できますか？</h3>
                  <p className="text-gray-700">
                    10,000pt以上貯まったら、10ポイント＝1円換算でアマゾンギフトと交換申請できます。
                  </p>
                </div>
              </div>
          </div>
        </section>
      )}

      {/* フッター */}
      <footer className="bg-white py-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="mb-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900 mx-2">TOP</Link>
            <span className="text-gray-400">｜</span>
            <Link href="/company" className="text-gray-600 hover:text-gray-900 mx-2">特商法表記</Link>
            <span className="text-gray-400">｜</span>
            <Link href="/termsofservice" className="text-gray-600 hover:text-gray-900 mx-2">利用規約</Link>
          </div>
          <p className="text-sm text-gray-600">&copy;Sucmedia,Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
