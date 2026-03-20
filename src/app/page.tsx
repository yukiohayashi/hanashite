import { supabase } from '@/lib/supabase';
import { Metadata } from 'next';
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
import AdSense from '@/components/AdSense';
import ResolvedSection from '@/components/ResolvedSection';
import SearchHistoryRecorder from '@/components/SearchHistoryRecorder';
import FloatingCreateButton from '@/components/FloatingCreateButton';
import GoogleAdTop from '@/components/GoogleAdTop';
import ProfileGuidance from '@/components/ProfileGuidance';
import { auth } from '@/lib/auth';

// HTMLタグを除去するヘルパー関数
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

interface HomeProps {
  searchParams: Promise<{ s?: string; sort?: string }>;
}

export async function generateMetadata({ searchParams }: HomeProps): Promise<Metadata> {
  const params = await searchParams;
  const searchQuery = params.s || '';
  
  // サイト設定を取得
  const { data: settings } = await supabase
    .from('site_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['site_name', 'site_catchphrase']);
  
  const siteName = settings?.find(s => s.setting_key === 'site_name')?.setting_value || 'ハナシテ';
  const catchphrase = settings?.find(s => s.setting_key === 'site_catchphrase')?.setting_value || '';
  
  if (searchQuery) {
    return {
      title: `${searchQuery}の検索結果｜${siteName}`,
    };
  }
  
  return {
    title: catchphrase ? `${siteName} - ${catchphrase}` : siteName,
  };
}

// リージョン変更後はリアルタイムでデータを取得
export const revalidate = 0;

export default async function Home({ searchParams }: HomeProps) {
  // 現在のユーザーを取得（セッションから）
  const session = await auth();
  const userId = session?.user?.id || null;

  // ログインユーザーの情報を取得
  let currentUser = null;
  if (userId) {
    const { data } = await supabase
      .from('users')
      .select('name, bio')
      .eq('id', userId)
      .single();
    currentUser = data;
  }

  const params = await searchParams;
  const searchQuery = params.s || '';
  const sortBy = params.sort || 'top_post';

  // announcementCategoryの取得を開始（並列実行）
  const announcementCategoryPromise = supabase
    .from('categories')
    .select('id')
    .eq('slug', 'announcement')
    .single();

  // ソート方法に応じてデータを取得
  let postsData: any[] = [];
  let hallOfFamePosts: any[] = [];

  // 殿堂入り投稿を取得（total_votesカラムを使用して効率的に取得）
  if (sortBy === 'statistics') {
    // users.statusでフィルタリングして運営者を除外（JOINで1回のクエリ）
    // contentフィールドを削除してデータ転送量を削減
    const { data: hallOfFameData } = await supabase
      .from('posts')
      .select('id, title, created_at, deadline_at, user_id, og_image, thumbnail_url, total_votes, category_id, categories(name), users!inner(status)')
      .in('status', ['publish', 'published'])
      .neq('user_id', 1)
      .order('total_votes', { ascending: false })
      .limit(10);

    if (hallOfFameData) {
      hallOfFamePosts = hallOfFameData;
      postsData = hallOfFameData;
    } else {
      hallOfFamePosts = [];
      postsData = [];
    }
  } else if (sortBy === 'deadline') {
    // 締切が近い順：deadline_atが近い順
    const { data: allPosts } = await supabase
      .from('posts')
      .select('id, title, created_at, deadline_at, user_id, og_image, thumbnail_url, best_answer_id, best_answer_selected_at, category_id, categories(name), users!inner(status)')
      .in('status', ['publish', 'published'])
      .neq('user_id', 1)
      .is('best_answer_id', null)
      .is('best_answer_selected_at', null)
      .not('deadline_at', 'is', null)
      .gte('deadline_at', new Date().toISOString())
      .order('deadline_at', { ascending: true })
      .limit(30);

    postsData = allPosts || [];
  } else if (sortBy === 'comment') {
    // コメント順：最新コメントがある投稿順
    const { data: recentComments } = await supabase
      .from('comments')
      .select('post_id, created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (recentComments && recentComments.length > 0) {
      const uniquePostIds = [...new Set(recentComments.map(c => c.post_id))];
      
      const { data: allPosts } = await supabase
        .from('posts')
        .select('id, title, created_at, deadline_at, user_id, og_image, thumbnail_url, best_answer_id, best_answer_selected_at, category_id, categories(name), users!inner(status)')
        .in('status', ['publish', 'published'])
        .neq('user_id', 1)
        .is('best_answer_id', null)
        .is('best_answer_selected_at', null)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (allPosts) {
        // クライアント側でフィルタリングして並べ替え
        const postIdOrder = uniquePostIds.slice(0, 10);
        postsData = postIdOrder
          .map(id => allPosts.find(p => p.id === id))
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
      .select('id, title, created_at, deadline_at, user_id, og_image, thumbnail_url, best_answer_id, best_answer_selected_at, category_id, categories(name), users!inner(status)')
      .in('status', ['publish', 'published'])
      .neq('user_id', 1)
      .is('best_answer_id', null)
      .is('best_answer_selected_at', null)
      .gte('created_at', oneMonthAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(30);

    // クライアント側で除外（投票済みの投稿を除外）
    if (allPosts) {
      if (excludedPostIds.length > 0) {
        postsData = allPosts.filter(post => !excludedPostIds.includes(post.id)).slice(0, 30);
      } else {
        postsData = allPosts.slice(0, 30);
      }
    } else {
      postsData = [];
    }
  } else if (sortBy === 'top_post') {
    // 最新順（受付中のみ）
    // announcementCategoryの結果を待つ
    const { data: announcementCategory } = await announcementCategoryPromise;
    const announcementCategoryId = announcementCategory?.id || null;

    let query = supabase
      .from('posts')
      .select('id, title, created_at, deadline_at, user_id, og_image, thumbnail_url, best_answer_id, best_answer_selected_at, category_id, categories(name), users!inner(status, name, avatar_seed, use_custom_image, image)')
      .in('status', ['publish', 'published'])
      .neq('user_id', 1)

    // 運営からのお知らせカテゴリを除外
    if (announcementCategoryId) {
      query = query.neq('category_id', announcementCategoryId);
    }

    // 常に受付中のみ（ベストアンサーが選ばれていない相談）
    query = query.is('best_answer_id', null).is('best_answer_selected_at', null);

    if (searchQuery) {
      query = query.ilike('title', `%${searchQuery}%`);
    }

    const { data: allPosts } = await query
      .order('created_at', { ascending: false })
      .limit(30);
    
    // 締切が過ぎた相談を除外（実行時に毎回判定）
    const now = new Date();
    const filteredPosts = allPosts?.filter(post => {
      if (!post.deadline_at) return true; // 締切なしはOK
      const deadline = new Date(post.deadline_at);
      // 締切時刻が現在時刻より未来の場合のみ表示
      return deadline.getTime() > now.getTime();
    }) || [];
    
    let postsFromComments: any[] = [];
    if (searchQuery) {
      // コメントからも検索
      const { data: comments } = await supabase
        .from('comments')
        .select('post_id')
        .ilike('content', `%${searchQuery}%`)
        .eq('status', 'approved');
      
      if (comments && comments.length > 0) {
        const postIdsFromComments = [...new Set(comments.map(c => c.post_id))];
        
        const { data: commentPosts } = await supabase
          .from('posts')
          .select('id, title, content, created_at, user_id, og_image, thumbnail_url, best_answer_id, best_answer_selected_at, category_id, categories(name)')
          .in('id', postIdsFromComments)
          .in('status', ['publish', 'published'])
          .neq('user_id', 1);
        
        postsFromComments = commentPosts || [];
      }
    }
    
    // 投稿とコメントの検索結果をマージ
    const combinedPosts = filteredPosts;
    if (postsFromComments.length > 0) {
      // コメントからの投稿も締切でフィルタリング
      const filteredCommentPosts = postsFromComments.filter(post => {
        if (!post.deadline_at) return true;
        const deadline = new Date(post.deadline_at);
        return deadline.getTime() > now.getTime();
      });
      
      // 重複を除去してマージ
      const existingIds = new Set(combinedPosts.map(p => p.id));
      const newPosts = filteredCommentPosts.filter(p => !existingIds.has(p.id));
      combinedPosts.push(...newPosts);
    }
    
    // combinedPostsは既にJOINでフィルタリング済み
    postsData = combinedPosts.slice(0, 10);
  } else {
    // オススメ（デフォルト）（受付中のみ）
    let query = supabase
      .from('posts')
      .select('id, title, content, created_at, user_id, og_image, thumbnail_url, best_answer_id, best_answer_selected_at, category_id, categories(name), users!inner(status, name, avatar_seed, use_custom_image, image)')
      .in('status', ['publish', 'published'])
      .neq('user_id', 1)
      .is('best_answer_id', null)
      .is('best_answer_selected_at', null);

    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
    }

    const { data: allPosts, error: searchError } = await query
      .order('created_at', { ascending: false })
      .limit(10);
    
    postsData = allPosts || [];
  }

  // 注目の相談を取得（likesテーブルから投稿へのいいね数を集計）
  let featuredPosts: any[] = [];
  
  // likesテーブルから投稿へのいいね数を集計
  const { data: likedPosts } = await supabase
    .from('likes')
    .select('target_id')
    .eq('like_type', 'post');

  if (likedPosts && likedPosts.length > 0) {
    // target_idごとにいいね数をカウント
    const likeCounts = likedPosts.reduce((acc: { [key: number]: number }, like) => {
      const targetId = like.target_id;
      if (targetId) {
        acc[targetId] = (acc[targetId] || 0) + 1;
      }
      return acc;
    }, {});

    // いいね数が多い順にソート
    const sortedPostIds = Object.entries(likeCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([id]) => parseInt(id));

    if (sortedPostIds.length > 0) {
      // 投稿情報を取得
      const { data: topPosts } = await supabase
        .from('posts')
        .select('id, title, created_at, user_id, og_image, thumbnail_url, best_answer_id, category_id, categories(name), users!inner(status, name, avatar_seed, use_custom_image, image)')
        .in('id', sortedPostIds)
        .in('status', ['publish', 'published'])
        .neq('user_id', '1')
        .is('best_answer_id', null);

      if (topPosts && topPosts.length > 0) {
        // sortedPostIdsの順序に従って並べ替え
        const orderedPosts = sortedPostIds
          .map(id => topPosts.find(post => post.id === id))
          .filter((post): post is NonNullable<typeof post> => post !== undefined);

        featuredPosts = orderedPosts.map(post => {
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
          return {
            ...post,
            user_name: user?.name || null,
            avatar_url: avatarUrl
          };
        });
      }
    }
  }

  // ユーザー情報はJOINで取得済み
  const posts = postsData.map(post => {
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
    return {
      ...post,
      user_name: user?.name || null,
      avatar_url: avatarUrl
    };
  });

  // ベストアンサー待ちの投稿を取得（締め切りが過ぎてもベストアンサーがない投稿）
  const { data: waitingPosts } = await supabase
    .from('posts')
    .select('id, title, created_at, deadline_at, user_id, og_image, thumbnail_url, best_answer_id, best_answer_selected_at, category_id, categories(name), users!inner(status, name, avatar_seed, use_custom_image, image)')
    .in('status', ['publish', 'published'])
    .neq('user_id', 1)
    .is('best_answer_id', null)
    .is('best_answer_selected_at', null)
    .not('deadline_at', 'is', null)
    .lt('deadline_at', new Date().toISOString())
    .order('deadline_at', { ascending: false })
    .limit(30);

  // ユーザー情報を結合
  let waitingPostsFiltered: any[] = [];
  if (waitingPosts) {
    // JOINで取得したusersデータを使用
    waitingPostsFiltered = waitingPosts.map(post => {
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
      return {
        ...post,
        user_name: user?.name || null,
        avatar_url: avatarUrl
      };
    });
  }

  // 運営からのお知らせを取得（最新3件）
  // announcementCategoryの結果を待つ
  const { data: announcementCategory } = await announcementCategoryPromise;
  const announcementCategoryId = announcementCategory?.id || null;
  
  let announcementPosts: any[] = [];
  if (announcementCategoryId) {
    const { data: announcements } = await supabase
      .from('posts')
      .select('id, title, content, created_at, user_id, og_image, thumbnail_url, category_id, categories(name)')
      .eq('category_id', announcementCategoryId)
      .in('status', ['publish', 'published'])
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (announcements) {
      announcementPosts = announcements;
    }
  }

  // 最新の解決済みを取得（直近3件）
  // postsテーブルのbest_answer_idを使用
  const { data: postsWithBestAnswer, error: bestAnswerError } = await supabase
    .from('posts')
    .select('id, title, best_answer_id, category_id, categories(name)')
    .not('best_answer_id', 'is', null)
    .in('status', ['publish', 'published'])
    .order('created_at', { ascending: false })
    .limit(3);

  let bestAnswersWithUsers: { id: number; content: string; created_at: string; post_id: number; post_title: string; user_name: string; user_id: string | null; avatar_url: string; category_name: string | null; category_id: number | null }[] = [];
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
        .select('id, name, avatar_seed, use_custom_image, image')
        .in('id', baUserIds);

      bestAnswersWithUsers = bestComments.map(comment => {
        const post = postsWithBestAnswer.find(p => p.best_answer_id === comment.id);
        const user = baUsersData?.find(u => u.id === comment.user_id);
        
        // アバターURLを生成
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
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          post_id: comment.post_id,
          post_title: post?.title || '',
          user_name: user?.name || 'ゲスト',
          user_id: comment.user_id,
          avatar_url: avatarUrl,
          category_name: (post as any)?.categories?.name || null,
          category_id: post?.category_id || null
        };
      });
    }
  }

  return (
    <div className="bg-white min-h-screen">
      <Header />
      
      {/* プロフィール未完了ガイダンス */}
      {currentUser && (
        <ProfileGuidance userName={currentUser.name} userBio={currentUser.bio} />
      )}

      <main className="md:flex md:justify-center mx-auto pt-[60px] md:pt-4 pb-4 max-w-7xl px-0 sm:px-6 lg:px-8">
        {/* 左サイドバー */}
        <aside className="hidden md:block w-[220px] bg-[#fff8f6] p-2 rounded-lg">
          <Sidebar />
        </aside>

        {/* メインコンテンツ */}
        <div className="flex-1 max-w-[760px] px-1 md:px-4">
          <section>
            {/* 検索ボックスとキーワード */}
            <div className="p-2.5">
              {/* キーワード表示 */}
              <KeywordsSection />
              
              {/* 検索ボックス */}
              <SearchForm userId={userId} />

              {/* 検索履歴（クライアント側でログイン判定） */}
              <SearchHistory />

              {/* 検索履歴を記録（検索時のみ） */}
              {searchQuery && <SearchHistoryRecorder userId={userId} searchQuery={searchQuery} resultCount={posts?.length || 0} />}

              {/* 検索結果表示 */}
              {searchQuery && (
                <div className="my-2.5">
                  <div className="mx-2.5 my-5 font-bold text-[#ff6b35]">
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
            {/* 注目の相談（最新順時のみ表示） */}
            {(sortBy === 'recommend' || sortBy === 'top_post') && featuredPosts.length > 0 && (
              <>
                <h3 className="m-1.5 mb-2 px-0 font-bold text-base text-[#ff6b6b]">注目の相談</h3>
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
                      <div className="relative bg-white p-2 border border-[#ffe0d6] rounded-md hover:shadow-md transition-shadow">
                        <Link href={`/posts/${post.id}`} className="block">
                          <h3 className="mb-2 font-extrabold text-gray-900 text-lg line-clamp-2">
                            {post.title}
                          </h3>
                          {contentPreview && (
                            <p className="mt-1 text-gray-600 text-sm line-clamp-1 md:line-clamp-2 overflow-hidden text-ellipsis">
                              {contentPreview}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-1 text-gray-500 text-xs">
                            <div className="w-4 h-4 rounded-full overflow-hidden border border-gray-200 inline-block mr-1 shrink-0">
                              <img 
                                src={(post as any).avatar_url || '/images/local-avatars/default-avatar.webp'} 
                                alt="相談者"
                                className="w-full h-full object-cover scale-125"
                              />
                            </div>
                            <span className="truncate">{(post as any).user_name || 'ゲスト'}さん</span>
                            <span className="ml-2 shrink-0">{new Date(post.created_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })} {new Date(post.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </Link>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}

            {/* 最新2列（最新順時のみ表示） */}
            {(sortBy === 'recommend' || sortBy === 'top_post') && featuredPosts.length > 1 && (
              <div className="gap-2 grid grid-cols-2 mx-1.5 mb-4 w-auto">
                {featuredPosts.slice(1, 3).map((post) => {
                  const rawContent = (post as any).content || '';
                  const cleanContent = stripHtmlTags(rawContent);
                  const contentPreview = cleanContent.length > 0
                    ? cleanContent.substring(0, 50) + (cleanContent.length > 50 ? '...' : '')
                    : '';
                  return (
                    <div key={post.id} className="relative flex flex-col bg-white hover:shadow-md border border-[#ffe0d6] rounded-md transition-all h-full p-2">
                      <Link href={`/posts/${post.id}`} className="flex flex-col flex-1 pb-5">
                        <div className="font-bold text-gray-900 text-sm line-clamp-2 leading-tight">
                          {post.title}
                        </div>
                        {contentPreview && (
                          <p className="mt-1 text-gray-500 text-xs line-clamp-1 overflow-hidden text-ellipsis">
                            {contentPreview}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-1 font-normal text-[10px] text-gray-400">
                          <div className="w-4 h-4 rounded-full overflow-hidden border border-gray-200 inline-block mr-1 shrink-0">
                            <img 
                              src={(post as any).avatar_url || '/images/local-avatars/default-avatar.webp'} 
                              alt="相談者"
                              className="w-full h-full object-cover scale-125"
                            />
                          </div>
                          <span className="truncate">{(post as any).user_name || 'ゲスト'}さん</span>
                          <span className="ml-1 shrink-0">{new Date(post.created_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })} {new Date(post.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}

            {/* カテゴリ */}
            {session && <InterestCategoriesSection userId={userId} />}

         
            {/* 解決済み */}
            <ResolvedSection 
              bestAnswers={bestAnswersWithUsers} 
              waitingPosts={waitingPostsFiltered}
            />

            {/* Google広告・TOPページ中央コンテンツ部 */}
            <GoogleAdTop />

            {/* 相談受付中見出し */}
            <h3 className="m-1.5 mb-2 px-0 font-bold text-base text-[#ff6b6b]">
              <i className="fas fa-comments mr-1"></i>相談受付中
            </h3>

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
                deadline_at: (post as any).deadline_at || null,
                user_name: (post as any).user_name || null,
                avatar_url: (post as any).avatar_url || '/images/local-avatars/default-avatar.webp',
                category_id: (post as any).category_id || null,
                category_name: (post as any).categories?.name || null
              })) || []}
              sortBy={sortBy}
            />
              </>
            )}
          </section>

          {/* スマホビュー: 最新のコメント */}
          <section className="md:hidden mt-6 px-2">
            <h3 className="mb-2 px-2 font-bold text-base text-[#ff6b6b]">
              最新の回答<i className="fas fa-comment"></i>
            </h3>
            <LatestCommentsMobile />
          </section>
        </div>

        {/* 右サイドバー */}
        <aside className="hidden md:block w-[280px] bg-[#fff0eb] p-2 rounded-lg">
          <HomeRightSidebar />
        </aside>
      </main>
      
      <Footer />
      
      {/* 右下の相談するボタン */}
      <FloatingCreateButton />
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
        .select('id, title, created_at, category_id, categories(name), users!inner(name, avatar_seed, use_custom_image, image)')
        .eq('category_id', category.id)
        .in('status', ['publish', 'published'])
        .is('best_answer_id', null)
        .order('created_at', { ascending: false })
        .limit(5);

      return { category, posts: posts || [] };
    })
  );

  // すべてのカテゴリの投稿を統合してアバターURLを生成
  const allPosts = categorySections.flatMap(({ posts }) =>
    posts.map((post: any) => {
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
      return { ...post, user_name: user?.name || null, avatar_url: avatarUrl };
    })
  );

  return (
    <div className="mb-4">
      <h3 className="m-1.5 mb-2 px-0 font-bold text-base text-[#ff6b6b]">
        カテゴリ
        <Link href="/profileset/" className="ml-2 text-sm">
          追加 <i className="fas fa-plus-square"></i>
        </Link>
      </h3>
      <div className="space-y-2 px-2">
        {allPosts.map((post: any, index: number) => (
          <div key={`${post.id}-${index}`} className="relative bg-white hover:shadow-md p-2 border border-gray-300 rounded-md transition-all hover:-translate-y-1">
            <Link href={`/posts/${post.id}`} className="block pr-16">
              <h3 className="font-bold text-gray-900 text-base md:text-lg leading-relaxed">
                {post.title}
              </h3>
              <div className="mt-2 flex items-center gap-1 text-gray-500 text-xs">
                <div className="w-4 h-4 rounded-full overflow-hidden border border-gray-200 inline-block mr-1 shrink-0">
                  <img
                    src={post.avatar_url || '/images/local-avatars/default-avatar.webp'}
                    alt="相談者"
                    className="w-full h-full object-cover scale-125"
                  />
                </div>
                <span className="truncate">{post.user_name || 'ゲスト'}さん</span>
              </div>
            </Link>
            {post.categories?.name && post.category_id && (
              <Link
                href={`/category/${post.category_id}`}
                className="absolute bottom-3 right-3 inline-block px-2 py-0.5 text-xs font-medium text-[#bf360c] bg-white border border-[#ffccbc] rounded whitespace-nowrap hover:bg-pink-50 transition-colors z-10"
              >
                {post.categories.name}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
