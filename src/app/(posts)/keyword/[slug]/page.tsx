import { supabase } from '@/lib/supabase';
import { getKeywordBySlug } from '@/lib/keywords';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Sidebar from '@/components/Sidebar';
import RightSidebar from '@/components/RightSidebar';
import PostImage from '@/components/PostImage';

export default async function KeywordPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page } = await searchParams;
  const currentPage = parseInt(page || '1');
  const postsPerPage = 20;
  
  // キーワード情報を取得（slugはURLエンコードされた状態でDBに保存されている）
  const keyword = await getKeywordBySlug(slug);

  if (!keyword) {
    // キーワードが見つからない場合、カテゴリを検索
    const { data: category } = await supabase
      .from('categories')
      .select('id, slug')
      .eq('slug', slug)
      .single();
    
    if (category) {
      // カテゴリが見つかった場合、カテゴリページにリダイレクト
      redirect(`/category/${category.id}`);
    }
    
    return (
      <div className="flex justify-center items-center bg-gray-50 min-h-screen">
        <div className="text-center">
          <h1 className="font-bold text-gray-900 text-2xl">キーワードが見つかりません</h1>
          <Link href="/" className="inline-block mt-4 text-indigo-600 hover:text-indigo-500">
            トップページに戻る
          </Link>
        </div>
      </div>
    );
  }

  // カテゴリIDを取得
  let categoryId: number | null = null;
  if (keyword.keyword_type === 'category') {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('name', keyword.keyword)
      .single();
    categoryId = category?.id || null;
  }

  // 総投稿数を取得
  let countQuery = supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .in('status', ['publish', 'published']);

  if (keyword.keyword_type === 'category' && categoryId) {
    countQuery = countQuery.eq('category_id', categoryId);
  } else {
    countQuery = countQuery.or(`title.ilike.%${keyword.keyword}%,content.ilike.%${keyword.keyword}%`);
  }

  const { count: totalPosts } = await countQuery;
  const totalPages = Math.ceil((totalPosts || 0) / postsPerPage);

  // キーワードに関連する投稿を検索（ページネーション付き）
  let postsQuery = supabase
    .from('posts')
    .select('id, title, content, created_at, user_id, category_id, og_image, thumbnail_url')
    .in('status', ['publish', 'published']);

  if (keyword.keyword_type === 'category' && categoryId) {
    postsQuery = postsQuery.eq('category_id', categoryId);
  } else {
    postsQuery = postsQuery.or(`title.ilike.%${keyword.keyword}%,content.ilike.%${keyword.keyword}%`);
  }

  const { data: posts, error: postsError } = await postsQuery
    .order('created_at', { ascending: false })
    .range((currentPage - 1) * postsPerPage, currentPage * postsPerPage - 1);

  if (postsError) {
    console.error('投稿取得エラー:', postsError);
  }
  console.log('取得した投稿数:', posts?.length || 0);

  // ユーザー情報を別途取得
  let postsWithUsers = posts || [];
  if (posts && posts.length > 0) {
    const userIds = [...new Set(posts.map(p => p.user_id).filter(Boolean))];
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name')
        .in('id', userIds);

      const userMap = new Map(users?.map(u => [u.id, u]) || []);
      postsWithUsers = posts.map(post => ({
        ...post,
        users: post.user_id ? userMap.get(post.user_id) : null
      }));
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />

      <main className="md:flex md:justify-center mx-auto mt-14 md:mt-[70px] md:pt-0 max-w-7xl">
        {/* 左サイドバー */}
        <aside className="hidden md:block w-[220px]">
          <Sidebar />
        </aside>

        {/* メインコンテンツ */}
        <div className="flex-1 px-4 max-w-[760px]">
          {/* キーワード情報 */}
          <div className="bg-white shadow-md mb-4 p-6 border border-gray-200 rounded">
            <h1 className="mb-4 font-bold text-gray-900 text-3xl">
              {keyword.keyword}
            </h1>
            
            {keyword.description && (
              <p className="mb-4 text-gray-600">{keyword.description}</p>
            )}

            <div className="flex gap-4 text-gray-500 text-sm">
              <span>投稿数: {totalPosts || 0}</span>
            </div>
          </div>

          {/* 関連投稿一覧 */}
          <div className="space-y-4">
            <h2 className="mb-4 font-bold text-gray-900 text-xl">
              「{keyword.keyword}」に関連する投稿
            </h2>

            {postsWithUsers && postsWithUsers.length > 0 ? (
              postsWithUsers.map((post) => {
                const imageUrl = (post as any).og_image || (post as any).thumbnail_url;
                const userName = (post as any).users?.name || 'ゲスト';
                return (
                  <Link key={post.id} href={`/posts/${post.id}`} className="flex gap-3 bg-white hover:shadow-md p-3 border border-gray-300 rounded-md transition-all hover:-translate-y-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-normal text-gray-900 text-base md:text-lg leading-relaxed">
                        {post.title}
                      </h3>
                      <div className="mt-2 text-gray-500 text-xs">
                        <span>相談者:{userName}</span>
                        <span className="ml-2">{new Date(post.created_at).toLocaleDateString('ja-JP')}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 rounded w-20 h-20 overflow-hidden">
                      <PostImage
                        src={imageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </Link>
                );
              })
            ) : (
              <p className="text-gray-500">関連する投稿が見つかりませんでした。</p>
            )}

            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                {currentPage > 1 && (
                  <Link
                    href={`/keyword/${slug}?page=${currentPage - 1}`}
                    className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    前へ
                  </Link>
                )}
                
                <span className="px-4 py-2 text-gray-700">
                  {currentPage} / {totalPages}
                </span>
                
                {currentPage < totalPages && (
                  <Link
                    href={`/keyword/${slug}?page=${currentPage + 1}`}
                    className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    次へ
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 右サイドバー */}
        <aside className="hidden md:block w-[280px]">
          <RightSidebar />
        </aside>
      </main>
      
      <Footer />
    </div>
  );
}
