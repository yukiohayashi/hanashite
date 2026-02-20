import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import HomeRightSidebar from '@/components/HomeRightSidebar';
import SearchHistory from '@/components/SearchHistory';
import SearchForm from '@/components/SearchForm';
import KeywordsSection from '@/components/KeywordsSection';
import InfinitePostList from '@/components/InfinitePostList';
import { auth } from '@/lib/auth';

// HTMLタグを除去するヘルパー関数
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

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
  const sortBy = params.sort || 'top_post';

  // ソート方法に応じてデータを取得
  let postsData: any[] = [];
  let hallOfFamePosts: any[] = [];

  // 殿堂入り投稿を取得（total_votesカラムを使用して効率的に取得）
  if (sortBy === 'statistics') {
    // total_votesカラムを使用して50票以上の投稿を直接取得
    const { data: hallOfFameData } = await supabase
      .from('posts')
      .select('id, title, content, created_at, user_id, og_image, thumbnail_url, total_votes')
      .in('status', ['publish', 'published'])
      .neq('user_id', 33)
      .gte('total_votes', 50)
      .order('total_votes', { ascending: false })
      .limit(100);

    // 運営者の投稿を除外
    if (hallOfFameData) {
      const userIds = [...new Set(hallOfFameData.map(p => p.user_id).filter(id => id !== null))];
      const { data: usersData } = await supabase
        .from('users')
        .select('id, status')
        .in('id', userIds);
      
      const operatorIds = usersData?.filter(u => u.status === 3).map(u => u.id) || [];
      const filtered = hallOfFameData.filter(p => !operatorIds.includes(p.user_id)).slice(0, 10);
      hallOfFamePosts = filtered;
      postsData = filtered;
    } else {
      hallOfFamePosts = [];
      postsData = [];
    }
  } else if (sortBy === 'comment') {
    // コメント順：最新コメントがある投稿順
    const { data: recentComments } = await supabase
      .from('comments')
      .select('post_id, created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1000);  // 100から1000に増やす

    if (recentComments && recentComments.length > 0) {
      const uniquePostIds = [...new Set(recentComments.map(c => c.post_id))];
      
      const { data: allPosts } = await supabase
        .from('posts')
        .select('id, title, created_at, user_id, og_image, thumbnail_url, best_answer_id, best_answer_selected_at')
        .in('status', ['publish', 'published'])
        .neq('user_id', 33)
        .is('best_answer_id', null)
        .is('best_answer_selected_at', null)
        .order('created_at', { ascending: false })
        .limit(100);
      
      // 運営者の投稿を除外
      let data = allPosts;
      if (allPosts) {
        const userIds = [...new Set(allPosts.map(p => p.user_id).filter(id => id !== null))];
        const { data: usersData } = await supabase
          .from('users')
          .select('id, status')
          .in('id', userIds);
        
        const operatorIds = usersData?.filter(u => u.status === 3).map(u => u.id) || [];
        data = allPosts.filter(p => !operatorIds.includes(p.user_id));
      }
      
      if (data) {
        // クライアント側でフィルタリングして並べ替え
        const postIdOrder = uniquePostIds.slice(0, 10);
        postsData = postIdOrder
          .map(id => data.find(p => p.id === id))
          .filter((post): post is NonNullable<typeof post> => post !== undefined);
      }
    }
  } else if (sortBy === 'notvoted') {
    // 未回答相談：ユーザーが投票していない投稿
    let excludedPostIds: number[] = [];
    
    if (userId) {
      // userIdを数値に変換
      const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId;
      
      const { data: votedPosts, error } = await supabase
        .from('vote_history')
        .select('post_id')
        .eq('user_id', numericUserId);
      
      if (votedPosts) {
        excludedPostIds = votedPosts.map(v => v.post_id);
      }
    }

    // 1ヶ月前の日付を計算
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const { data: allPosts } = await supabase
      .from('posts')
      .select('id, title, content, created_at, user_id, og_image, thumbnail_url, best_answer_id, best_answer_selected_at')
      .in('status', ['publish', 'published'])
      .neq('user_id', 33)
      .is('best_answer_id', null)
      .is('best_answer_selected_at', null)
      .gte('created_at', oneMonthAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);
    
    // 運営者の投稿を除外
    let data = allPosts;
    if (allPosts) {
      const userIds = [...new Set(allPosts.map(p => p.user_id).filter(id => id !== null))];
      const { data: usersData } = await supabase
        .from('users')
        .select('id, status')
        .in('id', userIds);
      
      const operatorIds = usersData?.filter(u => u.status === 3).map(u => u.id) || [];
      data = allPosts.filter(p => !operatorIds.includes(p.user_id));
    }

    // クライアント側で除外（投票済みの投稿を除外）
    if (data) {
      if (excludedPostIds.length > 0) {
        postsData = data.filter(post => !excludedPostIds.includes(post.id)).slice(0, 30);
      } else {
        postsData = data.slice(0, 30);
      }
    } else {
      postsData = [];
    }
  } else if (sortBy === 'top_post') {
    // 最新の相談順（受付中のみ）
    const { data: allPosts } = await supabase
      .from('posts')
      .select('id, title, content, created_at, user_id, og_image, thumbnail_url, best_answer_id, best_answer_selected_at')
      .in('status', ['publish', 'published'])
      .neq('user_id', 33)
      .is('best_answer_id', null)
      .is('best_answer_selected_at', null)
      .order('created_at', { ascending: false })
      .limit(100);
    
    // 運営者の投稿を除外
    if (allPosts) {
      const userIds = [...new Set(allPosts.map(p => p.user_id).filter(id => id !== null))];
      const { data: usersData } = await supabase
        .from('users')
        .select('id, status')
        .in('id', userIds);
      
      const operatorIds = usersData?.filter(u => u.status === 3).map(u => u.id) || [];
      postsData = allPosts.filter(p => !operatorIds.includes(p.user_id)).slice(0, 10);
    } else {
      postsData = [];
    }
  } else {
    // オススメ（デフォルト）（受付中のみ）
    let query = supabase
      .from('posts')
      .select('id, title, content, created_at, user_id, og_image, thumbnail_url, best_answer_id, best_answer_selected_at')
      .in('status', ['publish', 'published'])
      .neq('user_id', 33)
      .is('best_answer_id', null)
      .is('best_answer_selected_at', null);

    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
    }

    const { data: allPosts } = await query
      .order('created_at', { ascending: false })
      .limit(100);
    
    // 運営者の投稿を除外
    if (allPosts) {
      const userIds = [...new Set(allPosts.map(p => p.user_id).filter(id => id !== null))];
      const { data: usersData } = await supabase
        .from('users')
        .select('id, status')
        .in('id', userIds);
      
      const operatorIds = usersData?.filter(u => u.status === 3).map(u => u.id) || [];
      postsData = allPosts.filter(p => !operatorIds.includes(p.user_id)).slice(0, 10);
    } else {
      postsData = [];
    }
  }

  // 注目の相談を取得（受付中の投稿を3件）
  let featuredPosts: any[] = [];
  const { data: openPosts } = await supabase
    .from('posts')
    .select('id, title, content, created_at, user_id, og_image, thumbnail_url, best_answer_id')
    .in('status', ['publish', 'published'])
    .neq('user_id', 33)
    .is('best_answer_id', null)
    .order('created_at', { ascending: false })
    .limit(100);

  if (openPosts && openPosts.length > 0) {
    // 運営者の投稿を除外
    const userIds = [...new Set(openPosts.map(p => p.user_id).filter(id => id !== null))];
    const { data: usersData } = await supabase
      .from('users')
      .select('id, status')
      .in('id', userIds);
    
    const operatorIds = usersData?.filter(u => u.status === 3).map(u => u.id) || [];
    const filteredOpenPosts = openPosts.filter(p => !operatorIds.includes(p.user_id));

    // 各投稿のいいね数を取得
    const postIds = filteredOpenPosts.map(p => p.id);
    const { data: likeCounts } = await supabase
      .from('like_counts')
      .select('target_id, like_count')
      .eq('like_type', 'post')
      .in('target_id', postIds);

    // いいね数でソート（いいね数が同じ場合は最新順）
    const postsWithLikes = filteredOpenPosts.map(post => {
      const likeData = likeCounts?.find(lc => lc.target_id === post.id);
      return {
        ...post,
        like_count: likeData?.like_count || 0
      };
    });

    postsWithLikes.sort((a, b) => {
      if (b.like_count !== a.like_count) {
        return b.like_count - a.like_count;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // トップ3を取得
    const top3Posts = postsWithLikes.slice(0, 3);
    
    // ユーザー情報を取得
    const top3UserIds = [...new Set(top3Posts.map(p => p.user_id).filter(id => id !== null))];
    const { data: top3UsersData } = await supabase
      .from('users')
      .select('id, name, avatar_style, avatar_seed, use_custom_image, image')
      .in('id', top3UserIds);

    // ユーザー情報をマージ
    featuredPosts = top3Posts.map(post => {
      const userData = top3UsersData?.find(u => u.id === post.user_id);
      let avatarUrl: string;
      if (userData?.use_custom_image && userData?.image) {
        avatarUrl = userData.image;
      } else {
        const seed = userData?.avatar_seed || String(post.user_id) || 'guest';
        const style = userData?.avatar_style || 'big-smile';
        avatarUrl = `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=20`;
      }
      return {
        ...post,
        user_name: userData?.name || null,
        avatar_url: avatarUrl
      };
    });
  }

  // ユーザー情報を別途取得して結合
  let posts = postsData;
  if (postsData && postsData.length > 0) {
    const userIds = [...new Set(postsData.map(p => p.user_id).filter(id => id !== null))];
    
    const { data: usersData } = await supabase
      .from('users')
      .select('id, name, avatar_style, avatar_seed, use_custom_image, image')
      .in('id', userIds);

    posts = postsData.map(post => {
      const user = usersData?.find(u => u.id === post.user_id);
      let avatarUrl: string;
      if (user?.use_custom_image && user?.image) {
        avatarUrl = user.image;
      } else {
        const seed = user?.avatar_seed || String(post.user_id) || 'guest';
        const style = user?.avatar_style || 'big-smile';
        avatarUrl = `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=20`;
      }
      return {
        ...post,
        user_name: user?.name || null,
        avatar_url: avatarUrl
      };
    });
  }

  // 最新の解決済みを取得（直近3件）
  // postsテーブルのbest_answer_idを使用
  const { data: postsWithBestAnswer, error: bestAnswerError } = await supabase
    .from('posts')
    .select('id, title, best_answer_id')
    .not('best_answer_id', 'is', null)
    .in('status', ['publish', 'published'])
    .order('created_at', { ascending: false })
    .limit(3);

  let bestAnswersWithUsers: { id: number; content: string; created_at: string; post_id: number; post_title: string; user_name: string; user_id: string | null; avatar_url: string }[] = [];
  if (postsWithBestAnswer && postsWithBestAnswer.length > 0) {
    const bestAnswerIds = postsWithBestAnswer.map(p => p.best_answer_id).filter(id => id !== null);
    
    // ベストアンサーのコメントを取得
    const { data: bestComments } = await supabase
      .from('comments')
      .select('id, content, created_at, post_id, user_id')
      .in('id', bestAnswerIds)
      .eq('status', 'approved');

    if (bestComments && bestComments.length > 0) {
      const baUserIds = [...new Set(bestComments.map(c => c.user_id).filter(id => id !== null))];
      const { data: baUsersData } = await supabase
        .from('users')
        .select('id, name, avatar_style, avatar_seed, use_custom_image, image')
        .in('id', baUserIds);

      bestAnswersWithUsers = bestComments.map(comment => {
        const post = postsWithBestAnswer.find(p => p.best_answer_id === comment.id);
        const user = baUsersData?.find(u => u.id === comment.user_id);
        
        // アバターURLを生成
        let avatarUrl: string;
        if (user?.use_custom_image && user?.image) {
          avatarUrl = user.image;
        } else {
          const seed = user?.avatar_seed || String(comment.user_id) || 'guest';
          const style = user?.avatar_style || 'big-smile';
          avatarUrl = `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=24`;
        }
        
        return {
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          post_id: comment.post_id,
          post_title: post?.title || '',
          user_name: user?.name || 'ゲスト',
          user_id: comment.user_id,
          avatar_url: avatarUrl
        };
      });
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />

      <main className="md:flex md:justify-center mx-auto pt-[60px] md:pt-4 pb-4 max-w-7xl px-0 sm:px-6 lg:px-8">
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
                    「{searchQuery}」が含まれる相談 {posts?.length || 0}件
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
            {/* みんなのアンケート（最新の相談順時のみ表示） */}
            {(sortBy === 'recommend' || sortBy === 'top_post') && featuredPosts.length > 0 && (
              <>
                <h3 className="m-1.5 mb-2 px-0 font-bold text-base" style={{ color: '#ff6b35' }}>注目の相談</h3>
                <div className="mx-1.5 mb-4">
                  {(() => {
                    const post = featuredPosts[0];
                    const rawContent = (post as any).content || '';
                    const fullContent = stripHtmlTags(rawContent);
                    const halfLength = Math.floor(fullContent.length / 2);
                    const contentPreview = fullContent.length > 0 
                      ? fullContent.substring(0, Math.min(halfLength, 100)) + (fullContent.length > Math.min(halfLength, 100) ? '...' : '')
                      : '';
                    return (
                      <Link 
                        href={`/posts/${post.id}`} 
                        className="block bg-white p-3 border border-gray-300 rounded-md hover:shadow-md transition-shadow"
                      >
                        <h3 className="mb-2 font-extrabold text-gray-900 text-lg line-clamp-2">
                          {post.title}
                        </h3>
                        {contentPreview && (
                          <p className="mt-1 text-gray-600 text-sm">
                            {contentPreview}
                          </p>
                        )}
                        <div className="mt-2 text-gray-500 text-xs">
                          <img 
                            src={(post as any).avatar_url || 'https://api.dicebear.com/9.x/big-smile/svg?seed=guest&size=20'} 
                            alt="相談者"
                            className="w-4 h-4 rounded-full border border-gray-200 inline-block mr-1"
                          />
                          <span>{(post as any).user_name || 'ゲスト'}さんからの相談</span>
                          <span className="ml-2">{new Date(post.created_at).toLocaleDateString('ja-JP')}</span>
                        </div>
                      </Link>
                    );
                  })()}
                </div>
              </>
            )}

            {/* 最新2列（最新の相談順時のみ表示） */}
            {(sortBy === 'recommend' || sortBy === 'top_post') && featuredPosts.length > 1 && (
              <div className="gap-2 grid grid-cols-2 mx-1.5 mb-4 w-auto">
                {featuredPosts.slice(1, 3).map((post) => {
                  const rawContent = (post as any).content || '';
                  const cleanContent = stripHtmlTags(rawContent);
                  const contentPreview = cleanContent.length > 0
                    ? cleanContent.substring(0, 50) + (cleanContent.length > 50 ? '...' : '')
                    : '';
                  return (
                    <Link key={post.id} href={`/posts/${post.id}`} className="flex flex-col bg-white hover:shadow-md border border-gray-300 rounded-md transition-all h-full p-2">
                      <div className="font-bold text-gray-900 text-sm line-clamp-2 leading-tight">
                        {post.title}
                      </div>
                      {contentPreview && (
                        <p className="mt-1 text-gray-500 text-xs line-clamp-2">
                          {contentPreview}
                        </p>
                      )}
                      <div className="mt-1 font-normal text-[10px] text-gray-400">
                        <img 
                          src={(post as any).avatar_url || 'https://api.dicebear.com/9.x/big-smile/svg?seed=guest&size=20'} 
                          alt="相談者"
                          className="w-4 h-4 rounded-full border border-gray-200 inline-block mr-1"
                        />
                        <span>{(post as any).user_name || 'ゲスト'}さん</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* カテゴリ */}
            {session && <InterestCategoriesSection userId={userId} />}

            {/* 最新の解決済み */}
            {bestAnswersWithUsers.length > 0 && (
              <>
                <h3 className="m-1.5 mb-2 px-0 font-bold text-base" style={{ color: '#ff6b35' }}>
                  <i className="fas fa-trophy mr-1"></i>最新の解決済み
                </h3>
                <div className="mx-1.5 mb-4 space-y-2">
                  {bestAnswersWithUsers.map((answer) => {
                    const contentPreview = stripHtmlTags(answer.content).substring(0, 80);
                    return (
                      <Link 
                        key={answer.id} 
                        href={`/posts/${answer.post_id}`}
                        className="block bg-white hover:shadow-md p-3 border border-gray-300 rounded-md transition-all"
                      >
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                          <Image 
                            src={answer.avatar_url} 
                            alt={answer.user_name}
                            width={20}
                            height={20}
                            unoptimized
                            className="w-5 h-5 rounded-full border border-gray-200"
                          />
                          <span className="font-medium text-gray-700">{answer.user_name}さんのベストアンサー</span>
                        </div>
                        <p className="text-gray-800 text-sm line-clamp-2">
                          {contentPreview}...
                        </p>
                        <div className="mt-2 text-gray-500 text-xs">
                          相談: {answer.post_title.substring(0, 40)}{answer.post_title.length > 40 ? '...' : ''}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}

            {/* 相談受付中見出し */}
            <h3 className="m-1.5 mb-2 px-0 font-bold text-base" style={{ color: '#ff6b35' }}>
              <i className="fas fa-comments mr-1"></i>相談受付中
            </h3>

            {/* タブメニュー */}
            <div className="px-1 py-0">
              <ul className="flex justify-center m-0 p-0 w-full list-none">
                <li className="m-0 mx-1.5 my-1.5 w-auto text-xs">
                  <Link href="/" className={`block w-full h-full underline ${sortBy === 'top_post' || sortBy === 'recommend' ? 'font-bold text-gray-900' : 'text-gray-600'}`}>最新の相談順</Link>
                </li>
                <li className="m-0 mx-1.5 my-1.5 w-auto text-xs">
                  <Link href="/?sort=comment" className={`block w-full h-full underline ${sortBy === 'comment' ? 'font-bold text-gray-900' : 'text-gray-600'}`}>最新回答順</Link>
                </li>
              </ul>
            </div>

            {/* 殿堂入りヘッダー（未使用） */}
            {false && sortBy === 'statistics' && hallOfFamePosts.length > 0 && (
              <div className="mb-4">
                <div className="my-4 px-2 font-bold text-xl">
                  <i className="text-yellow-500 fas fa-crown"></i>殿堂入り
                </div>
                <div className="mx-1.5 mb-2 text-gray-600 text-xs">
                  50票以上獲得したら殿堂入り相談に認定！ハナシテで悩みを解決しましょう！
                </div>
              </div>
            )}

            {/* 投稿一覧 - 無限スクロール */}
            <InfinitePostList 
              initialPosts={posts?.map(post => ({
                id: post.id,
                title: post.title,
                content: (post as any).content || '',
                created_at: post.created_at,
                user_name: (post as any).user_name || null,
                avatar_url: (post as any).avatar_url || 'https://api.dicebear.com/9.x/big-smile/svg?seed=guest&size=20'
              })) || []}
              sortBy={sortBy}
            />
              </>
            )}
          </section>

          {/* スマホビュー: 最新のコメント */}
          <section className="md:hidden mt-6 px-2">
            <h3 className="mb-2 px-2 font-bold text-base" style={{ color: '#ff6b35' }}>
              最新の回答<i className="fas fa-comment"></i>
            </h3>
            <LatestCommentsMobile />
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

// 最新のコメント（スマホビュー用）
async function LatestCommentsMobile() {
  const { data: commentsData } = await supabase
    .from('comments')
    .select('id, post_id, user_id, content, created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (!commentsData || commentsData.length === 0) {
    return (
      <ul className="bg-white shadow m-0 p-0 rounded-lg list-none">
        <li className="px-2 py-2 text-gray-600 text-sm">コメントなし</li>
      </ul>
    );
  }
  
  const postIds = commentsData.map(c => c.post_id);
  const { data: postsData } = await supabase
    .from('posts')
    .select('id, title')
    .in('id', postIds);
  
  const userIds = [...new Set(commentsData.map(c => c.user_id).filter(id => id !== null))];
  const { data: usersData } = await supabase
    .from('users')
    .select('id, name')
    .in('id', userIds);
  
  const comments = commentsData.map(comment => ({
    ...comment,
    post_title: postsData?.find(p => p.id === comment.post_id)?.title || '',
    user_name: usersData?.find(u => u.id === comment.user_id)?.name || 'ゲスト'
  }));

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <ul className="bg-white shadow m-0 p-0 rounded-lg list-none">
      {comments.map((comment) => (
        <li key={comment.id} className="border-gray-200 border-b last:border-b-0">
          <Link href={`/posts/${comment.post_id}`} className="block hover:bg-gray-100 px-2 py-2 transition-colors">
            <span className="block text-gray-900 text-sm">{truncateText(comment.content, 26)}</span>
            <span className="block text-gray-500 text-xs">{comment.post_title}</span>
            <span className="text-gray-400 text-xs">{comment.user_name}さん</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// カテゴリセクション
async function InterestCategoriesSection({ userId }: { userId: string | number | null }) {
  if (!userId) return null;

  // ユーザーのカテゴリを取得
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
        カテゴリ
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
                  <span>{userName}さんからの相談</span>
                  <span className="ml-2">{new Date(post.created_at).toLocaleDateString('ja-JP')}</span>
                </div>
              </div>
              <div className="shrink-0 rounded w-20 h-20 overflow-hidden">
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
