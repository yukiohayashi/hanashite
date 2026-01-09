import Header from '../components/Header';
import Footer from '../components/Footer';
import LoginForm from './LoginForm';
import SocialLoginButtons from './SocialLoginButtons';

export default async function LoginPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      
      <div className="wrapper">
        <main className="article__contents">
          <section className="mx-auto px-4 max-w-2xl one_column_wrapper">
            <h1 className="mb-6 font-bold text-gray-800 text-3xl text-center">
              ログイン
            </h1>
            <p className="mb-8 text-gray-600 text-center">アンケートを作成するにはログインが必要になります。</p>
            
            {/* Better Auth.js SNSログイン */}
            <SocialLoginButtons />
            
            {/* または */}
            <div className="my-5 text-center">
              <p className="text-gray-600 text-sm">または</p>
            </div>
            
            <LoginForm />
          </section>
        </main>
      </div>
      
      <Footer />
    </div>
  );
}
