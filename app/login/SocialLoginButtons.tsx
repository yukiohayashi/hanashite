'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function SocialLoginButtons() {
  const [isLineLoading, setIsLineLoading] = useState(false);
  const [isTwitterLoading, setIsTwitterLoading] = useState(false);

  const handleLineLogin = async () => {
    setIsLineLoading(true);
    try {
      await signIn('line', { callbackUrl: '/' });
    } catch (error) {
      console.error('LINE login error:', error);
      setIsLineLoading(false);
    }
  };

  const handleTwitterLogin = async () => {
    setIsTwitterLoading(true);
    try {
      await signIn('twitter', { callbackUrl: '/' });
    } catch (error) {
      console.error('Twitter login error:', error);
      setIsTwitterLoading(false);
    }
  };

  return (
    <>
      {/* LINEログイン */}
      <div className="mb-3 text-center">
        <div className="flex justify-center mx-auto max-w-[400px]">
          <button
            onClick={handleLineLogin}
            disabled={isLineLoading}
            className="inline-flex justify-center items-center gap-2 bg-[#06C755] hover:bg-[#05b34a] disabled:opacity-50 shadow-md px-10 py-3 rounded w-full font-bold text-white text-base transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
            </svg>
            {isLineLoading ? 'ログイン中...' : 'LINEでログイン・新規登録'}
          </button>
        </div>
      </div>
      
      {/* X（旧Twitter）ログイン */}
      <div className="mb-5 text-center">
        <div className="flex justify-center mx-auto max-w-[400px]">
          <button
            onClick={handleTwitterLogin}
            disabled={isTwitterLoading}
            className="inline-flex justify-center items-center gap-2 bg-black hover:bg-gray-800 disabled:opacity-50 shadow-md px-10 py-3 rounded w-full font-bold text-white text-base transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z"/>
            </svg>
            {isTwitterLoading ? 'ログイン中...' : 'Xでログイン・新規登録'}
          </button>
        </div>
      </div>
    </>
  );
}
