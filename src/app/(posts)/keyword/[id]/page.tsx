import { supabase } from '@/lib/supabase';
import { getKeywordById } from '@/lib/keywords';
import { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Sidebar from '@/components/Sidebar';
import RightSidebar from '@/components/RightSidebar';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const keyword = await getKeywordById(parseInt(id));
  
  const title = keyword ? `${keyword.keyword}｜ハナシテ` : 'ハナシテ';
  
  return {
    title,
  };
}

export default async function KeywordPage({ 
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
  
  // キーワード情報を取得
  const keyword = await getKeywordById(parseInt(id));

  if (!keyword) {
    return (
      <div className="flex justify-center items-center bg-white min-h-screen">
        <div className="text-center">
          <h1 className="font-bold text-gray-900 text-1.5xl">キーワードが見つかりません</h1>
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

  // post_keywordsテーブルから関連投稿IDを取得
  const { data: postKeywords } = await supabase
    .from('post_keywords')
    .select('post_id')
    .eq('keyword_id', parseInt(id));

  const postIds = postKeywords?.map(pk => pk.post_id) || [];

  // 総トピック数を取得
  let countQuery = supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .in('status', ['publish', 'published']);

  if (postIds.length > 0) {
    countQuery = countQuery.in('id', postIds);
  } else if (keyword.keyword_type === 'category' && categoryId) {
    countQuery = countQuery.eq('category_id', categoryId);
  } else {
    // post_keywordsに紐付けがない場合は、タイトル・本文検索にフォールバック
    countQuery = countQuery.or(`title.ilike.%${keyword.keyword}%,content.ilike.%${keyword.keyword}%`);
  }

  const { count: totalPosts } = await countQuery;
  const totalPages = Math.ceil((totalPosts || 0) / postsPerPage);

  // キーワードに関連する投稿を検索（ページネーション付き）
  let postsQuery = supabase
    .from('posts')
    .select('id, title, content, created_at, user_id, category_id, og_image, thumbnail_url')
    .in('status', ['publish', 'published']);

  if (postIds.length > 0) {
    postsQuery = postsQuery.in('id', postIds);
  } else if (keyword.keyword_type === 'category' && categoryId) {
    postsQuery = postsQuery.eq('category_id', categoryId);
  } else {
    // post_keywordsに紐付けがない場合は、タイトル・本文検索にフォールバック
    postsQuery = postsQuery.or(`title.ilike.%${keyword.keyword}%,content.ilike.%${keyword.keyword}%`);
  }

  const { data: posts, error: postsError } = await postsQuery
    .order('created_at', { ascending: false })
    .range((currentPage - 1) * postsPerPage, currentPage * postsPerPage - 1);

  if (postsError) {
    console.error('投稿取得エラー:', postsError);
  }
  console.log('取得したトピック数:', posts?.length || 0);

  // ユーザー情報とカテゴリ情報を別途取得
  let postsWithUsers = posts || [];
  if (posts && posts.length > 0) {
    const userIds = [...new Set(posts.map(p => p.user_id).filter(Boolean))];
    const categoryIds = [...new Set(posts.map(p => p.category_id).filter(Boolean))];
    
    let userMap = new Map();
    let categoryMap = new Map();
    
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name, image')
        .in('id', userIds);

      userMap = new Map(users?.map(u => [u.id, u]) || []);
    }
    
    if (categoryIds.length > 0) {
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .in('id', categoryIds);

      categoryMap = new Map(categories?.map(c => [c.id, c]) || []);
    }
    
    postsWithUsers = posts.map(post => ({
      ...post,
      users: post.user_id ? userMap.get(post.user_id) : null,
      categories: post.category_id ? categoryMap.get(post.category_id) : null
    }));
  }

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
          {/* キーワード情報 */}
          <div className="bg-white shadow-md mb-4 p-6 border border-gray-200 rounded">
             <h1 className="mb-4 font-bold text-gray-900 text-3xl">
              {keyword.keyword}
            </h1>
            
            {keyword.description && (
              <p className="mb-4 text-gray-600">{keyword.description}</p>
            )}

            <div className="flex gap-4 text-gray-500 text-sm">
              <span>トピック数: {totalPosts || 0}</span>
            </div>
          </div>

          {/* 関連投稿一覧 */}
          <div className="space-y-4">
            <h2 className="mb-4 font-bold text-gray-900 text-xl">
              「{keyword.keyword}」に関連する投稿
            </h2>

            {postsWithUsers && postsWithUsers.length > 0 ? (
              postsWithUsers.map((post) => {
                const userName = (post as any).users?.name || 'ゲスト';
                const user = (post as any).users;
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
                const categoryName = (post as any).categories?.name;
                return (
                  <Link 
                    key={post.id} 
                    href={`/posts/${post.id}`} 
                    className="block bg-white p-3 border border-gray-300 rounded-md hover:shadow-md transition-shadow"
                  >
                    <h3 className="mb-2 font-extrabold text-gray-900 text-lg line-clamp-2">
                      {post.title}
                    </h3>
                    <div className="mt-2 flex items-center justify-between text-gray-500 text-xs">
                      <div className="flex items-center">
                        <img 
                          src={avatarUrl} 
                          alt="相談者"
                          className="w-4 h-4 rounded-full border border-gray-200 inline-block mr-1"
                        />
                        <span>{userName}さん</span>
                        <span className="ml-2">{new Date(post.created_at).toLocaleDateString('ja-JP')}</span>
                      </div>
                      {categoryName && (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-200 rounded">
                          {categoryName}
                        </span>
                      )}
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
                    href={`/keyword/${id}?page=${currentPage - 1}`}
                    className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-white"
                  >
                    前へ
                  </Link>
                )}
                
                <span className="px-4 py-2 text-gray-700">
                  {currentPage} / {totalPages}
                </span>
                
                {currentPage < totalPages && (
                  <Link
                    href={`/keyword/${id}?page=${currentPage + 1}`}
                    className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-white"
                  >
                    次へ
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 右サイドバー */}
        <aside className="hidden md:block w-[280px] bg-[#fff0eb] p-4 rounded-lg">
          <RightSidebar />
        </aside>
      </main>
      
      <Footer />
    </div>
  );
}
