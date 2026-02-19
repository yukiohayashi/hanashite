import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Sidebar from '@/components/Sidebar';
import RightSidebar from '@/components/RightSidebar';
import PostImage from '@/components/PostImage';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

interface Post {
  id: number;
  title: string;
  content: string | null;
  created_at: string;
  user_id: string;
  og_image: string | null;
  thumbnail_url: string | null;
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
      <div className="flex justify-center items-center bg-gray-50 min-h-screen">
        <div className="text-center">
          <h1 className="font-bold text-gray-900 text-2xl">カテゴリが見つかりません</h1>
          <Link href="/" className="inline-block mt-4 text-indigo-600 hover:text-indigo-500">
            トップページに戻る
          </Link>
        </div>
      </div>
    );
  }

  // 総投稿数を取得
  const { count: totalCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId);

  // 投稿を取得
  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, content, created_at, user_id, og_image, thumbnail_url')
    .eq('category_id', categoryId)
    .order('created_at', { ascending: false })
    .limit(postsPerPage)
    .returns<Post[]>();

  const totalPages = Math.ceil((totalCount || 0) / postsPerPage);

  // カテゴリIDに基づいて色を決定（左メニューと同じロジック）
  const categoryColor = MATERIAL_COLORS[(categoryId) % MATERIAL_COLORS.length];

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />

      <main className="md:flex md:justify-center md:gap-4 mx-auto pt-[60px] md:pt-4 pb-4 max-w-7xl px-0 sm:px-6 lg:px-8">
        {/* 左サイドバー */}
        <aside className="hidden md:block w-[220px]">
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
              <span>投稿数: {totalCount || 0}</span>
            </div>
          </div>

          {/* 投稿一覧 */}
          {posts && posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post) => (
                <article key={post.id} className="bg-white shadow-sm hover:shadow-md p-4 rounded-lg transition-shadow">
                  <Link href={`/posts/${post.id}`} className="block">
                    <div className="flex gap-4">
                      {(post.thumbnail_url || post.og_image) && (
                        <div className="shrink-0 w-24 h-24 rounded-lg overflow-hidden">
                          <PostImage
                            src={post.thumbnail_url || post.og_image}
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="grow min-w-0">
                        <h2 className="font-bold text-gray-900 text-lg line-clamp-2 mb-2">
                          {post.title}
                        </h2>
                        <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                          {post.content?.replace(/<[^>]*>/g, '').substring(0, 100)}...
                        </p>
                        <div className="flex items-center gap-2 text-gray-500 text-xs">
                          <span>{new Date(post.created_at).toLocaleDateString('ja-JP')}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
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
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
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
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  次へ
                </Link>
              )}
            </div>
          )}
        </div>

        {/* 右サイドバー */}
        <aside className="hidden lg:block w-[280px]">
          <RightSidebar />
        </aside>
      </main>

      <Footer />
    </div>
  );
}
