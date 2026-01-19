import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import HomeRightSidebar from '@/components/HomeRightSidebar';
import SearchKeywords from '@/components/SearchKeywords';
import SearchHistory from '@/components/SearchHistory';
import SearchForm from '@/components/SearchForm';
import KeywordsSection from '@/components/KeywordsSection';
import PostImage from '@/components/PostImage';
import { auth } from '@/lib/auth';

interface HomeProps {
  searchParams: Promise<{ s?: string; sort?: string }>;
}

// ISR（Incremental Static Regeneration）を有効化
// 3600秒（1時間）ごとに再生成し、それまでは静的HTMLを配信（高速化）
export const revalidate = 3600;

export default async function Home({ searchParams }: HomeProps) {
  // 現在のユーザーを取得（セッションから）
  const session = await auth();
  const userId = session?.user?.id || null;

  const params = await searchParams;
  const searchQuery = params.s || '';
  const sortBy = params.sort || 'recommend';

  // ソート方法に応じてデータを取得
  let postsData: any[] = [];
  let hallOfFamePosts: any[] = [];

  // 殿堂入り投稿を取得（total_votesカラムを使用して効率的に取得）
  if (sortBy === 'statistics') {
    // total_votesカラムを使用して50票以上の投稿を直接取得
    const { data: hallOfFameData } = await supabase
      .from('posts')
      .select('id, title, created_at, user_id, og_image, thumbnail_url, total_votes')
      .in('status', ['publish', 'published'])
      .gte('total_votes', 50)
      .order('total_votes', { ascending: false })
      .limit(20);

    hallOfFamePosts = hallOfFameData || [];
    postsData = hallOfFameData || [];
  } else if (sortBy === 'comment') {
    // コメント順：最新コメントがある投稿順
    const { data: recentComments } = await supabase
      .from('comments')
      .select('post_id, created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1000);  // 100から1000に増やす

    console.log('コメント順 - 取得したコメント数:', recentComments?.length);

    if (recentComments && recentComments.length > 0) {
      const uniquePostIds = [...new Set(recentComments.map(c => c.post_id))];
      console.log('コメント順 - ユニークな投稿ID数:', uniquePostIds.length);
      console.log('コメント順 - 最初の20件のID:', uniquePostIds.slice(0, 20));
      
      const { data } = await supabase
        .from('posts')
        .select('id, title, created_at, user_id, og_image, thumbnail_url')
        .in('status', ['publish', 'published'])
        .order('created_at', { ascending: false })
        .limit(100);
      
      console.log('コメント順 - 取得した投稿数:', data?.length);
      console.log('コメント順 - 取得した投稿ID:', data?.map(p => p.id));
      
      if (data) {
        // クライアント側でフィルタリングして並べ替え
        const postIdOrder = uniquePostIds.slice(0, 20);
        postsData = postIdOrder
          .map(id => data.find(p => p.id === id))
          .filter((post): post is NonNullable<typeof post> => post !== undefined);
        
        console.log('コメント順 - フィルタ後の投稿数:', postsData.length);
        console.log('コメント順 - フィルタ後の投稿ID:', postsData.map(p => p.id));
      }
    }
  } else if (sortBy === 'notvoted') {
    // 未投票アンケ：ユーザーが投票していない投稿
    let excludedPostIds: number[] = [];
    
    console.log('未投票アンケ - session:', session);
    console.log('未投票アンケ - userId (raw):', userId);
    console.log('未投票アンケ - userId type:', typeof userId);
    
    if (userId) {
      // userIdを数値に変換
      const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId;
      
      console.log('未投票アンケ - numericUserId:', numericUserId);
      
      const { data: votedPosts, error } = await supabase
        .from('vote_history')
        .select('post_id')
        .eq('user_id', numericUserId);
      
      console.log('未投票アンケ - votedPosts:', votedPosts);
      console.log('未投票アンケ - votedPosts length:', votedPosts?.length);
      console.log('未投票アンケ - error:', error);
      
      if (votedPosts) {
        excludedPostIds = votedPosts.map(v => v.post_id);
        console.log('未投票アンケ - excludedPostIds:', excludedPostIds);
      }
    } else {
      console.log('未投票アンケ - userIdがnullまたはundefinedです');
    }

    // 1ヶ月前の日付を計算
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const { data } = await supabase
      .from('posts')
      .select('id, title, created_at, user_id, og_image, thumbnail_url')
      .in('status', ['publish', 'published'])
      .gte('created_at', oneMonthAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    console.log('未投票アンケ - 取得した投稿数:', data?.length);
    console.log('未投票アンケ - 取得した投稿ID:', data?.map(p => p.id));
    console.log('未投票アンケ - 除外するID:', excludedPostIds);

    // クライアント側で除外（投票済みの投稿を除外）
    if (data) {
      if (excludedPostIds.length > 0) {
        postsData = data.filter(post => !excludedPostIds.includes(post.id)).slice(0, 30);
        console.log('未投票アンケ - フィルタ後の投稿数:', postsData.length);
        console.log('未投票アンケ - フィルタ後の投稿ID:', postsData.map(p => p.id));
      } else {
        postsData = data.slice(0, 30);
        console.log('未投票アンケ - 除外なし（投票履歴なし）、投稿数:', postsData.length);
      }
    } else {
      postsData = [];
      console.log('未投票アンケ - データなし');
    }
  } else if (sortBy === 'top_post') {
    // 最新アンケ順
    const { data } = await supabase
      .from('posts')
      .select('id, title, created_at, user_id, og_image, thumbnail_url')
      .in('status', ['publish', 'published'])
      .order('created_at', { ascending: false })
      .limit(20);
    postsData = data || [];
  } else {
    // オススメ（デフォルト）
    let query = supabase
      .from('posts')
      .select('id, title, created_at, user_id, og_image, thumbnail_url')
      .in('status', ['publish', 'published']);

    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
    }

    const { data } = await query
      .order('created_at', { ascending: false })
      .limit(20);
    postsData = data || [];
  }

  // ユーザー情報を別途取得して結合
  let posts = postsData;
  if (postsData && postsData.length > 0) {
    const userIds = [...new Set(postsData.map(p => p.user_id).filter(id => id !== null))];
    
    const { data: usersData } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds);

    posts = postsData.map(post => ({
      ...post,
      user_name: usersData?.find(u => u.id === post.user_id)?.name || null
    }));
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />

      <main className="md:flex md:justify-center mx-auto pt-[60px] md:pt-4 pb-4 max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 左サイドバー */}
        <aside className="hidden md:block w-[220px]">
          <Sidebar />
        </aside>

        {/* メインコンテンツ */}
        <div className="flex-1 max-w-[760px]">
          <section>
            {/* 検索ボックスとキーワード */}
            <div className="p-2.5">
              {/* キーワード表示 */}
              <KeywordsSection />
              
              {/* 検索ボックス */}
              <SearchForm userId={userId} />

              {/* 検索履歴（クライアント側でログイン判定） */}
              <SearchHistory />

              {/* 検索結果表示 */}
              {searchQuery && (
                <div className="my-2.5">
                  <div className="mx-2.5 my-5 font-bold" style={{ color: '#ff6b35' }}>
                    「{searchQuery}」が含まれるアンケート {posts?.length || 0}件
                  </div>
                  {posts && posts.length > 0 && (
                    <ul className="m-0 list-none">
                      {posts.map((post) => (
                        <li key={post.id} className="mx-2.5 mb-4 md:mb-2 pb-2 border-gray-300 border-b">
                          <Link href={`/posts/${post.id}`} className="block md:inline leading-relaxed text-gray-900 hover:text-orange-500">
                            {post.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* 検索時は以下を非表示 */}
            {!searchQuery && (
              <>
            {/* みんなのアンケート（オススメ時のみ表示） */}
            {sortBy === 'recommend' && (
              <>
                <h3 className="m-1.5 mb-2 px-0 font-bold text-base" style={{ color: '#ff6b35' }}>みんなのアンケート</h3>
                <div className="mx-1.5 mb-4">
                  {posts && posts.length > 0 && (() => {
                    const imageUrl = (posts[0] as any).og_image || (posts[0] as any).thumbnail_url;
                    return (
                      <Link href={`/posts/${posts[0].id}`} className="flex gap-3 bg-white hover:shadow-md p-3 border border-gray-300 rounded-md transition-all hover:-translate-y-1">
                        <div className="flex-shrink-0 rounded w-24 h-24 overflow-hidden">
                          <PostImage
                            src={imageUrl}
                            alt={posts[0].title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="mb-2 font-medium text-gray-900 text-base line-clamp-2">
                            {posts[0].title}
                          </h3>
                          <div className="text-gray-500 text-xs">
                            <span>投稿者: {(posts[0] as any).user_name || 'ゲスト'}</span>
                            <span className="ml-2">{new Date(posts[0].created_at).toLocaleDateString('ja-JP')}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })()}
                </div>
              </>
            )}

            {/* 最新2列（オススメ時のみ表示） */}
            {sortBy === 'recommend' && (
              <div className="gap-2 grid grid-cols-2 mx-1.5 mb-4 w-auto">
                {posts && posts.slice(1, 3).map((post) => {
                  const imageUrl = (post as any).og_image || (post as any).thumbnail_url;
                  return (
                    <Link key={post.id} href={`/posts/${post.id}`} className="flex flex-col bg-white hover:shadow-md border border-gray-300 rounded-md transition-all h-full">
                      <div className="rounded-t-md w-full h-32 overflow-hidden">
                        <PostImage
                          src={imageUrl}
                          alt={post.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1 p-2">
                        <div className="font-normal text-gray-900 text-sm line-clamp-2 leading-tight">
                          {post.title}
                        </div>
                        <div className="mt-1 font-normal text-[10px] text-gray-400">
                          <span>{(post as any).user_name || 'ゲスト'}さん</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* ニュース・話題 */}
            <NewsSection />

            {/* 興味あるカテゴリ */}
            {session && <InterestCategoriesSection userId={userId} />}

            {/* タブメニュー */}
            <div className="px-1 py-0">
              <ul className="flex justify-center m-0 p-0 w-full list-none">
                <li className="m-0 mx-1.5 my-1.5 w-auto text-xs">
                  <Link href="/" className={`block w-full h-full underline ${sortBy === 'recommend' ? 'font-bold text-gray-900' : 'text-gray-600'}`}>オススメ</Link>
                </li>
                <li className="m-0 mx-1.5 my-1.5 w-auto text-xs">
                  <Link href="/?sort=notvoted" className={`block w-full h-full underline ${sortBy === 'notvoted' ? 'font-bold text-gray-900' : 'text-gray-600'}`}>未投票アンケ</Link>
                </li>
                <li className="m-0 mx-1.5 my-1.5 w-auto text-xs">
                  <Link href="/?sort=top_post" className={`block w-full h-full underline ${sortBy === 'top_post' ? 'font-bold text-gray-900' : 'text-gray-600'}`}>最新アンケ順</Link>
                </li>
                <li className="m-0 mx-1.5 my-1.5 w-auto text-xs">
                  <Link href="/?sort=comment" className={`block w-full h-full underline ${sortBy === 'comment' ? 'font-bold text-gray-900' : 'text-gray-600'}`}>コメント順</Link>
                </li>
                <li className="m-0 mx-1.5 my-1.5 w-auto text-xs">
                  <Link href="/?sort=statistics" className={`block w-full h-full underline ${sortBy === 'statistics' ? 'font-bold text-gray-900' : 'text-gray-600'}`}>殿堂入り</Link>
                </li>
              </ul>
            </div>

            {/* 殿堂入りヘッダー */}
            {sortBy === 'statistics' && hallOfFamePosts.length > 0 && (
              <div className="mb-4">
                <div className="my-4 px-2 font-bold text-xl">
                  <i className="text-yellow-500 fas fa-crown"></i>殿堂入り
                </div>
                <div className="mx-1.5 mb-2 text-gray-600 text-xs">
                  50票以上獲得したら殿堂入りアンケートに認定！アンケで世の中を知りましょう！
                </div>
              </div>
            )}

            {/* 投稿一覧 */}
            <div className="space-y-2 p-2">
              {posts?.map((post) => {
                const imageUrl = (post as any).og_image || (post as any).thumbnail_url;
                return (
                  <Link key={post.id} href={`/posts/${post.id}`} className="flex gap-3 bg-white hover:shadow-md p-3 border border-gray-300 rounded-md transition-all hover:-translate-y-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-normal text-gray-900 text-base md:text-lg leading-relaxed">
                        {post.title}
                      </h3>
                      <div className="mt-2 text-gray-500 text-xs">
                        <span>投稿者: {(post as any).user_name || 'ゲスト'}</span>
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
              })}
            </div>
              </>
            )}
          </section>
        </div>

        {/* 右サイドバー */}
        <aside className="hidden md:block w-[280px]">
          <HomeRightSidebar />
        </aside>
      </main>
      
      <Footer />
    </div>
  );
}

// ニュース・話題セクション
async function NewsSection() {
  const { data: newsPosts } = await supabase
    .from('posts')
    .select('id, title, created_at, og_image, thumbnail_url, users!inner(name)')
    .in('status', ['publish', 'published'])
    .order('created_at', { ascending: false })
    .limit(5);

  if (!newsPosts || newsPosts.length === 0) return null;

  return (
    <div className="mb-4">
      <h3 className="m-1.5 mb-2 px-0 font-bold text-base" style={{ color: '#ff6b35' }}>ニュース・話題</h3>
      <div className="space-y-2 px-2">
        {newsPosts.map((post) => {
          const imageUrl = (post as any).og_image || (post as any).thumbnail_url;
          const userName = (post as any).users?.name || 'ゲスト';
          return (
            <Link key={post.id} href={`/posts/${post.id}`} className="flex gap-3 bg-white hover:shadow-md p-3 border border-gray-300 rounded-md transition-all hover:-translate-y-1">
              <div className="flex-1 min-w-0">
                <h3 className="font-normal text-gray-900 text-sm leading-relaxed">
                  {post.title}
                </h3>
                <div className="mt-2 text-gray-500 text-xs">
                  <span>投稿者: {userName}</span>
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
        })}
      </div>
    </div>
  );
}

// 興味あるカテゴリセクション
async function InterestCategoriesSection({ userId }: { userId: string | number | null }) {
  if (!userId) return null;

  // ユーザーの興味あるカテゴリを取得
  const { data: userData } = await supabase
    .from('users')
    .select('interest_categories')
    .eq('id', userId)
    .single();

  if (!userData?.interest_categories) return null;

  let categoryIds;
  try {
    categoryIds = JSON.parse(userData.interest_categories);
  } catch {
    return null;
  }

  if (!Array.isArray(categoryIds) || categoryIds.length === 0) return null;

  // カテゴリ情報を取得
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .in('slug', categoryIds)
    .order('display_order', { ascending: true });

  if (!categories || categories.length === 0) return null;

  // 各カテゴリの投稿を取得
  const categorySections = await Promise.all(
    categories.map(async (category) => {
      const { data: posts } = await supabase
        .from('posts')
        .select('id, title, created_at, og_image, thumbnail_url, users!inner(name)')
        .eq('category_id', category.id)
        .in('status', ['publish', 'published'])
        .order('created_at', { ascending: false })
        .limit(5);

      return { category, posts: posts || [] };
    })
  );

  // すべてのカテゴリの投稿を統合
  const allPosts = categorySections.flatMap(({ posts }) => posts);

  return (
    <div className="mb-4">
      <h3 className="m-1.5 mb-2 px-0 font-bold text-base" style={{ color: '#ff6b35' }}>
        興味あるカテゴリ
        <Link href="/profileset/" className="ml-2 text-sm">
          追加 <i className="fas fa-plus-square"></i>
        </Link>
      </h3>
      <div className="space-y-2 px-2">
        {allPosts.map((post) => {
          const imageUrl = (post as any).og_image || (post as any).thumbnail_url || '/images/noimage.webp';
          const userName = (post as any).users?.name || 'ゲスト';
          return (
            <Link key={post.id} href={`/posts/${post.id}`} className="flex gap-3 bg-white hover:shadow-md p-3 border border-gray-300 rounded-md transition-all hover:-translate-y-1">
              <div className="flex-1 min-w-0">
                <h3 className="font-normal text-gray-900 text-sm leading-relaxed">
                  {post.title}
                </h3>
                <div className="mt-2 text-gray-500 text-xs">
                  <span>投稿者: {userName}</span>
                  <span className="ml-2">{new Date(post.created_at).toLocaleDateString('ja-JP')}</span>
                </div>
              </div>
              <div className="flex-shrink-0 rounded w-20 h-20 overflow-hidden">
                <img 
                  src={imageUrl}
                  alt={post.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
