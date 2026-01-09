import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '../lib/supabase';
import HeaderClient from './HeaderClient';
import HeaderLink from './HeaderLink';

export default async function Header() {
  const { count } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true });

  const postsCount = count || 0;

  return (
    <header className="bg-white shadow-md">
      {/* カラフルなボーダー */}
      <div className="bg-gradient-to-r from-pink-500 via-orange-500 to-yellow-500 h-1"></div>
      
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex justify-between items-stretch min-h-[60px]">
          {/* ロゴとアンケート情報 */}
          <div className="flex items-center gap-4 py-2">
            <Link href="/" className="flex flex-col items-center">
              <div className="w-[150px] text-center">
                <Image 
                  src="/anke.svg" 
                  alt="アンケ" 
                  width={150} 
                  height={40}
                  className="w-full"
                />
              </div>
            </Link>
            
            {/* アンケート統計情報 */}
            <div className="hidden md:flex flex-col text-gray-600 text-xs">
              <div className="font-semibold text-gray-800">
                アンケート合計数: {postsCount.toLocaleString()}本
              </div>
              <div className="mt-0.5 text-[0.65rem] leading-tight">
                ニュース × アンケート × コミュニティ。みんなの意見が見える新しいSNS
              </div>
            </div>
          </div>
          
          {/* ユーザーメニューとリンク */}
          <div className="flex items-stretch">
            {/* ユーザーメニュー */}
            <div className="flex items-center px-4">
              <HeaderClient />
            </div>
            
            {/* アンケ/アンケワークス切り替えリンク */}
            <HeaderLink />
          </div>
        </div>
      </div>
    </header>
  );
}
