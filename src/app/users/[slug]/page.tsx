import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Sidebar from '@/components/Sidebar';
import MyPageMenu from '@/components/MyPageMenu';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const user = await getUserById(slug);
  
  const title = user ? `${user.name}さん｜ハナシテ` : 'ハナシテ';
  
  return {
    title,
  };
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  created_at: string;
  user_description: string | null;
  sns_x: string | null;
  sei: string | null;
  mei: string | null;
  sei_kana: string | null;
  mei_kana: string | null;
  birth_year: string | null;
  sex: string | null;
  marriage: string | null;
  child_count: number | null;
  job: string | null;
  prefecture: string | null;
  avatar_seed: string | null;
  use_custom_image: boolean | null;
  show_post_history: boolean | null;
}

interface Post {
  id: number;
  title: string;
  created_at: string;
}

interface Comment {
  id: number;
  content: string;
  created_at: string;
  post_id: number;
  posts: {
    id: number;
    title: string;
  } | null;
}

interface ActivityItem {
  type: 'post' | 'comment';
  date: string;
  title: string;
  link: string;
  postTitle?: string;
  postId?: number;
}

async function getUserById(userIdOrSlug: string) {
  // UUID形式の場合（OAuth認証ユーザー）
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(userIdOrSlug)) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userIdOrSlug)
      .single();

    if (error) {
      console.error('Error fetching user by UUID:', error);
      return null;
    }

    return data as User;
  }
  
  // 数値IDの場合
  if (/^\d+$/.test(userIdOrSlug)) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userIdOrSlug)
      .single();

    if (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }

    return data as User;
  }
  
  // スラッグの場合（profile_slugで検索）
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('profile_slug', userIdOrSlug)
    .single();

  if (error) {
    console.error('Error fetching user by slug:', error);
    return null;
  }

  return data as User;
}

async function getUserPosts(userId: string) {
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, created_at')
    .eq('user_id', userId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching posts:', error);
    return [];
  }

  return data as Post[];
}

async function getUserComments(userId: string) {
  console.log('🔍 Fetching comments for user:', userId);
  
  // コメントを取得
  const { data: commentsData, error } = await supabase
    .from('comments')
    .select('id, content, created_at, post_id')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching comments:', JSON.stringify(error, null, 2));
    console.error('Error details:', error);
    return [];
  }

  if (!commentsData || commentsData.length === 0) {
    console.log('✅ Found comments: 0');
    return [];
  }

  // 投稿IDのリストを取得
  const postIds = [...new Set(commentsData.map(c => c.post_id))];
  
  // 投稿情報を取得
  const { data: postsData } = await supabase
    .from('posts')
    .select('id, title')
    .in('id', postIds);

  // コメントに投稿情報を結合
  const postsMap = new Map(postsData?.map(p => [p.id, p]) || []);
  const comments = commentsData.map(comment => ({
    ...comment,
    posts: postsMap.get(comment.post_id) || null
  }));

  console.log('✅ Found comments:', comments.length);
  return comments as Comment[];
}

export default async function UserPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  
  // ユーザー情報を取得
  const user = await getUserById(slug);

  if (!user) {
    notFound();
  }

  // 自分のプロフィールかチェック
  const isOwnProfile = session?.user?.id?.toString() === user.id.toString();

  // 投稿とコメントを取得（user.idを使用）
  const [posts, comments] = await Promise.all([
    getUserPosts(user.id),
    getUserComments(user.id)
  ]);

  // 投稿とコメントを統合してソート
  const activities: ActivityItem[] = [
    ...posts.map(post => ({
      type: 'post' as const,
      date: post.created_at,
      title: post.title,
      link: `/posts/${post.id}`,
      postId: post.id
    })),
    ...comments.map(comment => ({
      type: 'comment' as const,
      date: comment.created_at,
      title: comment.content.substring(0, 50) + (comment.content.length > 50 ? '...' : ''),
      link: `/posts/${comment.post_id}#comment-${comment.id}`,
      postTitle: comment.posts?.title || '投稿が削除されました'
    }))
  ];

  // 日付順にソート
  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 最大100件に制限
  const limitedActivities = activities.slice(0, 100);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="md:flex md:justify-center md:gap-4 mx-auto pt-[60px] md:pt-4 pb-4 max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 左サイドバー */}
        <aside className="hidden md:block w-[220px]">
          <Sidebar />
        </aside>

        {/* メインコンテンツ */}
        <div className="flex-1 max-w-[760px]">
          {/* ユーザープロフィール */}
          <div className="bg-white shadow-md mb-4 p-6 border border-gray-200 rounded">
            <div className="flex items-start gap-4">
              {/* アバター */}
              <div className="shrink-0">
                {user.use_custom_image && user.image ? (
                  <div className="w-20 h-20 rounded-full overflow-hidden">
                    <img 
                      src={user.image} 
                      alt={user.name || '匿名'} 
                      className="w-full h-full rounded-full object-cover scale-125"
                    />
                  </div>
                ) : user.avatar_seed && (user.avatar_seed.startsWith('f20_') || user.avatar_seed.startsWith('f30_') || user.avatar_seed.startsWith('f40_') || 
                           user.avatar_seed.startsWith('m20_') || user.avatar_seed.startsWith('m30_') || user.avatar_seed.startsWith('m40_') ||
                           user.avatar_seed.startsWith('cat_') || user.avatar_seed.startsWith('dog_') || user.avatar_seed.startsWith('rabbit_') ||
                           user.avatar_seed.startsWith('bear_') || user.avatar_seed.startsWith('other_')) ? (
                  <div className="w-20 h-20 rounded-full overflow-hidden">
                    <img 
                      src={`/images/local-avatars/${user.avatar_seed}.webp`}
                      alt={user.name || '匿名'} 
                      className="w-full h-full rounded-full object-cover scale-125"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full overflow-hidden">
                    <img 
                      src="/images/local-avatars/default-avatar.webp"
                      alt={user.name || '匿名'} 
                      className="w-full h-full rounded-full object-cover scale-125"
                    />
                  </div>
                )}
              </div>

              {/* ユーザー情報 */}
              <div className="flex-1">
                <h1 className="text-2xl font-extrabold text-gray-900">
                  {user.name || '匿名'}
                  <span className="text-base font-normal">さん</span>
                </h1>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                  {user.sex && (
                    <span>{user.sex === 'male' ? '♂' : user.sex === 'female' ? '♀' : ''}</span>
                  )}
                  {user.birth_year && (
                    <span>{Math.floor((new Date().getFullYear() - parseInt(user.birth_year)) / 10) * 10}代</span>
                  )}
                  {user.prefecture && (
                    <span>{user.prefecture}</span>
                  )}
                </div>
                <p className="text-gray-700 text-sm mt-2">
                  {user.user_description || ''}
                  {isOwnProfile && (
                    <Link href="/profileset" className="text-orange-500 hover:underline ml-2">
                      【プロフィール編集】
                    </Link>
                  )}
                </p>
              </div>
            </div>


            {/* SNSリンクと登録日 */}
            <p className="mt-4 text-sm text-gray-600">
              {user.sns_x && user.sns_x.trim() !== '' && (
                <a href={user.sns_x} target="_blank" rel="noopener noreferrer" className="inline-block mr-2 text-gray-700 hover:text-orange-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-twitter-x inline" viewBox="0 0 16 16">
                    <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z" />
                  </svg>
                </a>
              )}
              {new Date(user.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}から利用
            </p>

            {/* 統計情報 - 一時的に非表示 */}
            {false && (
              <div className="flex gap-6 mt-4 text-sm text-gray-600">
                <div>
                  <span className="font-bold text-gray-900">{posts.length}</span> 投稿
                </div>
                <div>
                  <span className="font-bold text-gray-900">{comments.length}</span> コメント
                </div>
              </div>
            )}
          </div>

          {/* 相談・回答履歴 */}
          {user.show_post_history ? (
            <div className="bg-white shadow-md border border-gray-200 rounded">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">相談・回答履歴</h2>
              </div>

              {limitedActivities.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {limitedActivities.map((activity, index) => (
                    <li key={index} className="p-4 hover:bg-white transition-colors">
                      <div className="flex flex-col gap-1">
                        <div className="text-sm text-gray-700">
                          {activity.type === 'post' ? (
                            <span>
                              <Link href={activity.link} className="text-gray-800 hover:text-orange-600 font-medium">
                                {user?.name || '匿名'}
                              </Link>
                              さんから相談がありました！
                            </span>
                          ) : (
                            <span>
                              相談者への回答
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-gray-400">
                          {new Date(activity.date).toLocaleString('ja-JP')}
                        </div>

                        <div className="text-sm mt-1">
                          <Link href={activity.link} className="text-gray-800 hover:text-orange-600">
                            {activity.title}
                            {activity.type === 'comment' && activity.postTitle && (
                              <span className="text-gray-500"> ({activity.postTitle})</span>
                            )}
                          </Link>
                        </div>

                        {/* 投稿の編集ボタンを表示 */}
                        {activity.type === 'post' && activity.postId && (
                          <div className="mt-2">
                            <Link
                              href={`/post-manage/${activity.postId}`}
                              className="inline-block bg-gray-200 hover:bg-blue-100 px-3 py-1 rounded text-gray-700 hover:text-blue-600 text-xs transition-colors"
                            >
                              編集する
                            </Link>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  まだアクティビティがありません
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white shadow-md border border-gray-200 rounded p-8 text-center text-gray-500">
              相談・回答履歴は非公開です
            </div>
          )}
        </div>

        {/* 右サイドバー */}
        <aside className="hidden md:block w-[280px]">
          <MyPageMenu />
        </aside>
      </main>
      
      <Footer />
    </div>
  );
}
