import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Sidebar from '@/components/Sidebar';
import RightSidebar from '@/components/RightSidebar';
import PostImage from '@/components/PostImage';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const categoryId = parseInt(id);
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { data: category } = await supabase
    .from('categories')
    .select('name')
    .eq('id', categoryId)
    .single();
  
  const title = category ? `${category.name}｜ハナシテ` : 'ハナシテ';
  
  return {
    title,
  };
}

interface Post {
  id: number;
  title: string;
  content: string | null;
  created_at: string;
  user_id: string;
  og_image: string | null;
  thumbnail_url: string | null;
  user_name?: string | null;
  avatar_url?: string;
  best_answer_id?: number | null;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
}

const MATERIAL_COLORS = [
  '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
  '#2196F3', '#03A9F4', '#00BCD4', '#009688',
  '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B',
  '#FFC107', '#FF5722'
];

export default async function CategoryPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page } = await searchParams;
  const currentPage = parseInt(page || '1');
  const postsPerPage = 20;
  const categoryId = parseInt(id);
  
  // サーバーサイド用のSupabaseクライアントを作成
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  // カテゴリ情報を取得
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id, name, slug, icon')
    .eq('id', categoryId)
    .single<Category>();

  if (categoryError || !category) {
    return (
      <div className="flex justify-center items-center bg-white min-h-screen">
        <div className="text-center">
          <h1 className="font-bold text-gray-900 text-1.5xl">カテゴリが見つかりません</h1>
          <Link href="/" className="inline-block mt-4 text-indigo-600 hover:text-indigo-500">
            トップページに戻る
          </Link>
        </div>
      </div>
    );
  }

  // 総トピック数を取得
  const { count: totalCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId);

  // 投稿を取得（ユーザー情報付き）
  const { data: rawPosts } = await supabase
    .from('posts')
    .select('id, title, content, created_at, user_id, og_image, thumbnail_url, best_answer_id, users(name, avatar_seed, use_custom_image, image)')
    .eq('category_id', categoryId)
    .in('status', ['publish', 'published'])
    .order('created_at', { ascending: false })
    .range((currentPage - 1) * postsPerPage, currentPage * postsPerPage - 1);

  const posts: Post[] = (rawPosts || []).map((post: any) => {
    const user = post.users;
    let avatarUrl: string;
    if (user?.use_custom_image && user?.image) {
      avatarUrl = user.image;
    } else if (user?.avatar_seed && (user.avatar_seed.startsWith('f20_') || user.avatar_seed.startsWith('f30_') || user.avatar_seed.startsWith('f40_') || 
               user.avatar_seed.startsWith('m20_') || user.avatar_seed.startsWith('m30_') || user.avatar_seed.startsWith('m40_') ||
               user.avatar_seed.startsWith('cat_') || user.avatar_seed.startsWith('dog_') || user.avatar_seed.startsWith('rabbit_') ||
               user.avatar_seed.startsWith('bear_') || user.avatar_seed.startsWith('other_'))) {
      avatarUrl = `/images/local-avatars/${user.avatar_seed}.webp`;
    } else {
      avatarUrl = '/images/local-avatars/default-avatar.webp';
    }
    return {
      ...post,
      user_name: user?.name || null,
      avatar_url: avatarUrl
    };
  });

  const totalPages = Math.ceil((totalCount || 0) / postsPerPage);

  // カテゴリIDに基づいて色を決定（左メニューと同じロジック）
  const categoryColor = MATERIAL_COLORS[(categoryId) % MATERIAL_COLORS.length];

  return (
    <div className="bg-white min-h-screen">
      <Header />

      <main className="md:flex md:justify-center md:gap-4 mx-auto pt-[60px] md:pt-4 pb-4 max-w-7xl px-0 sm:px-6 lg:px-8">
        {/* 左サイドバー */}
        <aside className="hidden md:block w-[220px] bg-[#fff8f6] p-2 rounded-lg">
          <Sidebar />
        </aside>

        {/* メインコンテンツ */}
        <div className="flex-1">
          {/* カテゴリヘッダー */}
          <div className="bg-white shadow-md mb-4 p-6 border border-gray-200 rounded">
            <div className="flex items-center gap-3 mb-4">
              {category.icon && (
                <span className="text-2xl" style={{ color: categoryColor }} dangerouslySetInnerHTML={{ __html: category.icon }} />
              )}
              <h1 className="font-bold text-gray-900 text-3xl">{category.name}</h1>
            </div>
            <div className="flex gap-4 text-gray-500 text-sm">
              <span>トピック数: {totalCount || 0}</span>
            </div>
          </div>

          {/* 投稿一覧 */}
          {posts && posts.length > 0 ? (
            <div className="space-y-2 p-2">
              {posts.map((post) => {
                const cleanContent = (post.content || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
                const contentPreview = cleanContent.length > 0
                  ? cleanContent.substring(0, 50) + (cleanContent.length > 50 ? '...' : '')
                  : '';
                return (
                  <Link
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="relative block bg-white hover:shadow-md p-3 border border-gray-300 rounded-md transition-all hover:-translate-y-1"
                  >
                    <h3 className="font-bold text-gray-900 text-base md:text-lg leading-relaxed pr-20">
                      {post.title}
                    </h3>
                    {contentPreview && (
                      <p className="mt-1 text-gray-600 text-sm line-clamp-1 md:line-clamp-2 overflow-hidden text-ellipsis">
                        {contentPreview}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-gray-500 text-xs">
                      <img
                        src={post.avatar_url || '/images/local-avatars/default-avatar.webp'}
                        alt="相談者"
                        className="w-4 h-4 rounded-full border border-gray-200 shrink-0"
                      />
                      <span className="truncate">{post.user_name || 'ゲスト'}さんからの相談</span>
                      <span className="shrink-0">{new Date(post.created_at).toLocaleDateString('ja-JP')}</span>
                    </div>
                    {post.best_answer_id && (
                      <span className="absolute bottom-3 right-3 flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full border border-green-300">
                        <i className="fas fa-check-circle"></i> 解決済み
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-white shadow-sm p-8 rounded-lg text-center">
              <p className="text-gray-600">このカテゴリにはまだ投稿がありません</p>
            </div>
          )}

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {currentPage > 1 && (
                <Link
                  href={`/category/${id}?page=${currentPage - 1}`}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-white"
                >
                  前へ
                </Link>
              )}
              <span className="px-4 py-2 text-gray-600">
                {currentPage} / {totalPages}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={`/category/${id}?page=${currentPage + 1}`}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-white"
                >
                  次へ
                </Link>
              )}
            </div>
          )}
        </div>

        {/* 右サイドバー */}
        <aside className="hidden lg:block w-[280px] bg-[#fff0eb] p-4 rounded-lg">
          <RightSidebar />
        </aside>
      </main>

      <Footer />
    </div>
  );
}
