'use client';

import { useEffect, useState } from 'react';

interface ProfileGuidanceProps {
  userName: string | null;
  userBio: string | null;
}

export default function ProfileGuidance({ userName, userBio }: ProfileGuidanceProps) {
  // 初期状態で判定
  const shouldShowGuidance = userName === '匿名' && (!userBio || userBio.trim() === '');
  const [showGuidance, setShowGuidance] = useState(shouldShowGuidance);

  useEffect(() => {
    // ニックネームが「匿名」かつ自己紹介がNULLまたは空の場合にメニューをハイライト
    if (shouldShowGuidance) {
      // プロフィール編集メニューをハイライト
      const timer = setTimeout(() => {
        const profileLink = document.querySelector('a[href="/profileset"]');
        if (profileLink) {
          profileLink.classList.add('profile-guidance-highlight');
          
          // スクロールしてメニューを表示
          profileLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [shouldShowGuidance]);

  if (!showGuidance) return null;

  return (
    <>
      <style jsx global>{`
        @keyframes pulse-border {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.7);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(255, 107, 107, 0);
          }
        }
        
        .profile-guidance-highlight {
          animation: pulse-border 2s infinite;
          border: 2px solid #ff6b6b !important;
          border-radius: 8px;
          position: relative;
        }
        
        .profile-guidance-highlight::after {
          content: '← まずはプロフィールを設定しましょう！';
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-left: 10px;
          background: #ff6b6b;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
          white-space: nowrap;
          font-weight: bold;
          z-index: 1000;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        
        .profile-guidance-highlight::before {
          content: '';
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-left: 2px;
          border: 8px solid transparent;
          border-right-color: #ff6b6b;
          z-index: 1001;
        }
        
        @media (max-width: 768px) {
          .profile-guidance-highlight::after,
          .profile-guidance-highlight::before {
            display: none;
          }
        }
      `}</style>
      
      <div className="fixed bottom-4 right-4 bg-[#ff6b6b] text-white p-4 rounded-lg shadow-lg max-w-sm z-50 md:hidden">
        <div className="flex items-start gap-3">
          <div className="text-2xl">👋</div>
          <div>
            <p className="font-bold mb-1">プロフィールを設定しましょう！</p>
            <p className="text-sm">右上のメニューから「プロフィール編集」をタップしてください。</p>
          </div>
          <button
            onClick={() => setShowGuidance(false)}
            className="text-white hover:text-gray-200 text-xl leading-none"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
      </div>
    </>
  );
}
