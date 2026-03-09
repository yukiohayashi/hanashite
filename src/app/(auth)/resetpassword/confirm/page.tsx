import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ResetPasswordConfirmForm from './ResetPasswordConfirmForm';

interface ResetPasswordConfirmPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordConfirmPage({ searchParams }: ResetPasswordConfirmPageProps) {
  const params = await searchParams;
  const token = params.token || '';

  return (
    <div className="bg-white min-h-screen">
      <Header />
      
      <div className="flex justify-center items-center px-4 py-16 min-h-[calc(100vh-200px)]">
        <div className="bg-white shadow-lg mx-auto p-8 rounded-lg w-full max-w-md">
          <h1 className="mb-6 font-bold text-2xl text-[#ff6b35] text-center">
            新しいパスワードの設定
          </h1>
          <p className="mb-6 text-gray-600 text-sm text-center">
            新しいパスワードを入力してください。
          </p>
          <ResetPasswordConfirmForm token={token} />
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
