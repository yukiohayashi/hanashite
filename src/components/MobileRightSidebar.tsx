'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface MobileRightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AdminPost {
  id: number;
  title: string;
  created_at: string;
  totalPoints?: number;
}

export default function MobileRightSidebar({ isOpen, onClose }: MobileRightSidebarProps) {
  const { data: session } = useSession();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [userName, setUserName] = useState('');
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [adminPosts, setAdminPosts] = useState<AdminPost[]>([]);
  const [participatePoints, setParticipatePoints] = useState<boolean>(false);

  useEffect(() => {
    if (session?.user?.id) {
      // ユーザー情報を取得
      fetch(`/api/user/${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.profile_slug) {
            setProfileSlug(data.profile_slug);
          }
          setUserName(data.name || session.user.name || 'ゲスト');
          setAvatarUrl(data.image || '');
          setParticipatePoints(data.participate_points || false);
        })
        .catch(err => console.error('ユーザー情報取得エラー:', err));

      // ポイント情報を取得
      fetch(`/api/phistory?userId=${session.user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.totalPoints !== undefined) {
            setTotalPoints(data.totalPoints);
          }
        })
        .catch(err => console.error('ポイント取得エラー:', err));

      // 運営者からのお知らせを取得（ID=33の投稿を最新2件）
      supabase
        .from('posts')
        .select('id, title, created_at')
        .eq('user_id', 1)
        .in('status', ['publish', 'published'])
        .order('created_at', { ascending: false })
        .limit(2)
        .then(({ data }) => {
          if (data) {
            setAdminPosts(data);
          }
        });
    }
  }, [session]);

  return (
    <>
      {/* オーバーレイ */}
      {isOpen && (
        <div 
          className="md:hidden top-0 left-0 z-[9997] fixed inset-0 bg-black/50 transition-opacity duration-500"
          onClick={onClose}
        >
          <button
            className="top-[10px] left-[5%] z-[9999] fixed text-white text-xl"
            onClick={onClose}
          >
            <i className="fas fa-window-close"></i>
          </button>
        </div>
      )}

      {/* 右サイドバー */}
      <div
        className={`md:hidden top-0 right-0 z-[9998] fixed w-[85%] h-full transition-all duration-500 ${
          isOpen ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
      >
        <div
          className={`z-[9998] relative bg-white px-[5%] pb-5 h-full overflow-y-auto transition-all duration-500 transform ${
            isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          }`}
        >
          <div className="py-4">
            {/* ログイン・登録セクション */}
            {!session ? (
              <div className="mb-6">
                <div className="flex flex-col items-center gap-3">
                  <Link
                    href="/login"
                    className="inline-flex justify-center items-center bg-[#06C755] hover:bg-[#05b34b] px-6 py-3 rounded font-bold text-white text-sm no-underline transition-colors"
                    style={{ minWidth: '180px' }}
                    onClick={onClose}
                  >
                    <span className="font-bold">LINE</span>でログイン
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex justify-center items-center bg-black hover:bg-gray-800 px-6 py-3 rounded font-bold text-white text-sm no-underline transition-colors"
                    style={{ minWidth: '180px' }}
                    onClick={onClose}
                  >
                    𝕏 でログイン
                  </Link>
                  <div className="text-center text-gray-600 text-sm">または</div>
                  <Link
                    href="/login"
                    className="inline-flex justify-center items-center bg-[#ff6b35] hover:bg-[#e58a2f] px-6 py-3 rounded font-bold text-white text-sm no-underline transition-colors"
                    style={{ minWidth: '180px' }}
                    onClick={onClose}
                  >
                    ログイン
                  </Link>
                  <Link
                    href="/register"
                    className="block text-center text-blue-600 hover:text-blue-800 text-sm underline"
                    onClick={onClose}
                  >
                    パスワードを忘れた方はこちら
                  </Link>
                </div>

                <div className="flex flex-col items-center mt-6 p-4">
                  <p className="mb-2 font-bold text-gray-800 text-sm">
                    ＼新規会員登録したら3,000pt獲得／
                  </p>
                  <Link
                    href="/register"
                    className="inline-flex justify-center items-center bg-green-500 hover:bg-green-600 px-6 py-3 rounded font-bold text-white text-sm no-underline transition-colors"
                    style={{ minWidth: '180px' }}
                    onClick={onClose}
                  >
                    新規無料登録
                  </Link>
                </div>

                {/* ポイ活バナー */}
                <div className="mt-6">
                  <Link href="/register" onClick={onClose}>
                    <Image
                      src="/anke_banner.webp"
                      alt="ポイ活始めませんか？"
                      width={300}
                      height={400}
                      className="rounded-lg w-full"
                    />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* ユーザー情報セクション */}
                <div className="my-2.5 text-center">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl}
                      alt={userName || 'ゲスト'} 
                      className="mx-auto mb-2 rounded-full w-20 h-20 object-cover"
                    />
                  ) : (
                    <div className="relative bg-gray-300 rounded-full w-20 h-20 overflow-hidden mx-auto mb-2">
                      <div className="absolute top-[16px] left-1/2 bg-white rounded-full w-[36px] h-[36px] -translate-x-1/2"></div>
                      <div className="absolute top-[44px] left-1/2 bg-white rounded-[50%_50%_50%_50%/60%_60%_40%_40%] w-[54px] h-[40px] -translate-x-1/2"></div>
                    </div>
                  )}
                  {userName ? (
                    <>
                      <Link href="/profileset" className="text-[#ff6b35]" onClick={onClose}>
                        {userName}
                      </Link>
                      さん
                    </>
                  ) : (
                    <span className="text-gray-500 text-sm">読み込み中...</span>
                  )}
                </div>
                
                <div className="flex justify-center my-2.5 w-full">
                  <Link 
                    href={profileSlug ? `/users/${profileSlug}` : `/users/${session?.user?.id}`}
                    className="inline-flex justify-center items-center bg-[#ff6b35] hover:bg-[#e58a2f] px-6 py-3 rounded font-bold text-white text-sm no-underline transition-colors"
                    style={{ minWidth: '180px' }}
                    onClick={onClose}
                  >
                    プロフィール
                  </Link>
                </div>

                {/* メニューリスト */}
                <ul className="p-0 overflow-hidden list-none">
                  <Link href="/notifications" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline" onClick={onClose}>
                    <li>通知</li>
                  </Link>
                  <Link href="/profileset" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline" onClick={onClose}>
                    <li>プロフィール編集</li>
                  </Link>
                  <Link href="/favorites" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline" onClick={onClose}>
                    <li>気になる相談</li>
                  </Link>
                  <Link href="/my-posts" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline" onClick={onClose}>
                    <li>相談した記事</li>
                  </Link>
                  <Link href="/post-create" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline" onClick={onClose}>
                    <li>相談する</li>
                  </Link>
                  {participatePoints && (
                    <>
                      <Link href="/phistory" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline" onClick={onClose}>
                        <li>ポイント履歴</li>
                      </Link>
                      <Link href="/point-exchange" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline" onClick={onClose}>
                        <li>ポイント交換</li>
                      </Link>
                    </>
                  )}
                  <Link href="/password" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline" onClick={onClose}>
                    <li>パスワード</li>
                  </Link>
                  <Link href="/inquiry" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline" onClick={onClose}>
                    <li>お問い合わせ</li>
                  </Link>
                  <Link href="/logout" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline" onClick={onClose}>
                    <li>ログアウト</li>
                  </Link>
                  <Link href="/report" className="block hover:bg-gray-100 mr-0.5 p-2.5 border-gray-200 border-b w-auto font-normal text-black text-sm text-left no-underline" onClick={onClose}>
                    <li>[通報する]</li>
                  </Link>
                </ul>

                {/* 運営者からのお知らせ */}
                <div className="mt-6">
                  <h3 className="px-2.5 pt-2.5 text-[0.85rem] text-left">運営者からのお知らせ</h3>
                  <div className="p-2.5 text-[0.85rem] text-left">
                    {adminPosts.length > 0 ? (
                      adminPosts.map((post) => (
                        <Link
                          key={post.id}
                          href={`/posts/${post.id}`}
                          onClick={onClose}
                          className="block mb-3"
                        >
                          <li className="list-none text-gray-700 hover:text-blue-600 transition-colors">
                            {post.title}
                            <span className="text-gray-500 text-xs ml-2">
                              ({new Date(post.created_at).toLocaleDateString('ja-JP')})
                            </span>
                          </li>
                        </Link>
                      ))
                    ) : (
                      <p className="text-gray-600 text-sm">お知らせはありません</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
