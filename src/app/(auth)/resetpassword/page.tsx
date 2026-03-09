import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ResetPasswordForm from './ResetPasswordForm';

export const metadata: Metadata = {
  title: 'パスワードリセット｜ハナシテ',
};

export default function ResetPasswordPage() {
  return (
    <div className="bg-white min-h-screen">
      <Header />
      
      <div className="flex justify-center items-center px-4 py-16 min-h-[calc(100vh-200px)]">
        <div className="bg-white shadow-lg mx-auto p-8 rounded-lg w-full max-w-md">
          <h1 className="mb-6 font-bold text-2xl text-[#ff6b35] text-center">
            パスワードリセット
          </h1>
          <p className="mb-6 text-gray-600 text-sm text-center">
            登録されているメールアドレスを入力してください。<br />
            パスワードリセット用のリンクをお送りします。
          </p>
          <ResetPasswordForm />
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
