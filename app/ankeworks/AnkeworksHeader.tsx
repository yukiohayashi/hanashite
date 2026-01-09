import Link from 'next/link';
import Image from 'next/image';
import HeaderClient from '../components/HeaderClient';

export default function AnkeworksHeader() {
  return (
    <header className="bg-white shadow-md">
      {/* カラフルなボーダー */}
      <div className="bg-gradient-to-r from-pink-500 via-orange-500 to-yellow-500 h-1"></div>
      
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex justify-between items-stretch min-h-[60px]">
          {/* ロゴ */}
          <div className="flex items-center gap-4 py-2">
            <Link href="/ankeworks" className="flex flex-col items-center">
              <div className="w-[150px] text-center">
                <Image 
                  src="/images/ankeworks.webp" 
                  alt="アンケワークス" 
                  width={150} 
                  height={40}
                  className="w-full"
                />
              </div>
            </Link>
            
            {/* 説明文 */}
            <div className="hidden md:flex flex-col text-gray-600 text-xs">
              <div className="font-semibold text-gray-800">
                アンケートを作成＆条件達成で高額報酬ゲット!
              </div>
            </div>
          </div>
          
          {/* ユーザー情報とリンク */}
          <div className="flex items-stretch">
            {/* ユーザーメニュー */}
            <div className="flex items-center px-4">
              <HeaderClient />
            </div>

            {/* アンケへのリンク */}
            <a 
              href="/" 
              className="hidden md:flex md:items-center md:bg-[#FFE3D6] md:pr-[5px] md:pl-[85px] md:border-gray-300 md:border-r md:border-l md:max-w-[200px] md:text-[0.8rem] md:text-left pc"
              style={{
                backgroundImage: 'url(/images/anke.webp)',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'left center',
                backgroundSize: '80px'
              }}
            >
              <div>
                アンケートで<br />
                人と繋がる! <i className="fa-arrow-circle-right fa"></i>
              </div>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
