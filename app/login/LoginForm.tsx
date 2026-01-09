'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('メールアドレスまたはパスワードが正しくありません。');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError('ログインに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form method="post" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-100 my-5 p-4 border border-red-300 rounded font-bold text-red-800 text-base">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <div className="mb-4">
          <label className="block mb-2 font-bold text-gray-700">メールアドレス：</label>
          <input
            id="em"
            className="px-4 py-3 border border-gray-300 focus:border-green-500 rounded focus:outline-none focus:ring-2 focus:ring-green-200 w-full text-gray-900 transition-all"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            name="email"
            tabIndex={1}
            placeholder="メールアドレスを入力してください"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2 font-bold text-gray-700">パスワード：</label>
          <div className="relative">
            <input
              className="px-4 py-3 pr-12 border border-gray-300 focus:border-green-500 rounded focus:outline-none focus:ring-2 focus:ring-green-200 w-full text-gray-900 transition-all"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              tabIndex={2}
              id="textPassword"
              placeholder="パスワード8文字以上"
              required
            />
            <i
              className={`top-1/2 right-4 z-2 absolute text-gray-600 hover:text-gray-800 text-lg -translate-y-1/2 cursor-pointer fa ${showPassword ? 'fa-eye' : 'fa-eye-slash'}`}
              onClick={() => setShowPassword(!showPassword)}
            ></i>
          </div>
        </div>
      </div>
      
      <div className="mt-5 text-center">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-[#ff6b35] hover:bg-[#e55a2b] disabled:opacity-50 shadow-md px-10 py-3 border-0 rounded w-full max-w-[400px] font-bold text-white text-base transition-colors cursor-pointer"
        >
          {isLoading ? 'ログイン中...' : 'ログインする'}
        </button>
      </div>
      <div className="mt-3 text-center">
        <Link href="/resetpassword" className="text-[#ff6b35] hover:text-[#e55a2b] text-sm underline">
          パスワードを忘れた方はこちら
        </Link>
      </div>
      <div className="mt-4 text-center">
        <Link
          href="/regist"
          className="inline-block bg-green-600 hover:bg-green-700 shadow-md px-10 py-3 rounded w-full max-w-[400px] font-bold text-white text-base text-center no-underline transition-colors"
        >
          無料会員登録はこちら
        </Link>
      </div>
    </form>
  );
}
