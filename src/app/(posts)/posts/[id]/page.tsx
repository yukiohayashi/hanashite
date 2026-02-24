import { supabase } from '@/lib/supabase';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import VoteSection from './VoteSection';
import CommentSection from './CommentSection';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Sidebar from '@/components/Sidebar';
import RightSidebar from '@/components/RightSidebar';
import ClickableImage from '@/components/ClickableImage';
import LikeButton from './LikeButton';
import FavoriteButton from './FavoriteButton';
import type { Metadata } from 'next';

interface Post {
  id: number;
  title: string;
  content: string | null;
  created_at: string;
  user_id: string;
  og_image: string | null;
  thumbnail_url: string | null;
  source_url: string | null;
  og_title: string | null;
  og_description: string | null;
  status: string;
  category_id: number | null;
  deadline_at: string | null;
  best_answer_id: number | null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  
  const { data: post } = await supabase
    .from('posts')
    .select('title')
    .eq('id', id)
    .single();

  return {
    title: post?.title || 'アンケート',
  };
}

export default async function PostPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { id } = await params;
  const search = await searchParams;
  const showUpdatedMessage = search.updated === 'true';
  const session = await auth();
  
  // デバッグ: セッション情報を確認
  console.log('Post Page - Session:', JSON.stringify(session, null, 2));
  console.log('Post Page - User Status:', session?.user?.status);
  
  const { data: post } = await supabase
    .from('posts')
    .select('id, title, content, created_at, user_id, og_image, thumbnail_url, source_url, og_title, og_description, status, category_id, deadline_at, best_answer_id')
    .eq('id', id)
    .single() as { data: Post | null, error: { message: string } | null };

  

  let userName = 'ゲスト';
  let userAvatar: string | null = null;
  let userSex: string | null = null;
  let userBirthYear: number | null = null;
  let userPrefecture: string | null = null;
  let userAvatarStyle: string | null = null;
  let userAvatarSeed: string | null = null;
  let userUseCustomImage: boolean = false;
  if (post?.user_id) {
    const { data: user } = await supabase
      .from('users')
      .select('name, image, sex, birth_year, prefecture, avatar_style, avatar_seed, use_custom_image')
      .eq('id', post.user_id)
      .single();
    
    if (user) {
      if (user.name) userName = user.name;
      userAvatar = user.image;
      userSex = user.sex;
      userBirthYear = user.birth_year;
      userPrefecture = user.prefecture;
      userAvatarStyle = user.avatar_style;
      userAvatarSeed = user.avatar_seed;
      userUseCustomImage = user.use_custom_image || false;
    }
  }
  
  // DiceBearアバターURLを生成
  const getDiceBearUrl = (seed: string, style: string = 'big-smile', size: number = 40) => {
    return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=${size}`;
  };
  
  // アバター表示用のURLを取得
  const getAvatarUrl = (userId: string, customImage: string | null, useCustom: boolean, style: string | null, seed: string | null, size: number = 40) => {
    if (useCustom && customImage) {
      return customImage;
    }
    const avatarSeed = seed || userId;
    const avatarStyle = style || 'big-smile';
    return getDiceBearUrl(avatarSeed, avatarStyle, size);
  };

  // 性別を記号に変換
  const getSexSymbol = (sex: string | null) => {
    if (sex === 'female') return '♀';
    if (sex === 'male') return '♂';
    if (sex === 'other') return '⚥';
    return '';
  };

  // 生年から年代を計算
  const getAgeGroup = (birthYear: number | null) => {
    if (!birthYear) return '';
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    if (age < 20) return '10代';
    if (age < 30) return '20代';
    if (age < 40) return '30代';
    if (age < 50) return '40代';
    if (age < 60) return '50代';
    if (age < 70) return '60代';
    return '70代以上';
  };

  const { data: voteChoices } = await supabase
    .from('vote_choices')
    .select('id, choice, vote_count')
    .eq('post_id', id)
    .order('id');

  // カテゴリを取得（posts.category_idから）
  let category = null;
  if (post?.category_id) {
    const { data: categoryData } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', post.category_id)
      .single();
    category = categoryData;
  }

  // キーワードを取得
  const { data: postKeywords } = await supabase
    .from('post_keywords')
    .select('keyword_id, keywords(id, keyword)')
    .eq('post_id', id);

  const keywords = postKeywords?.map(pk => pk.keywords).filter(Boolean) || [];

  // 投票オプション（締切日時など）を取得
  const { data: voteOptions } = await supabase
    .from('vote_options')
    .select('close_at, multi, random')
    .eq('post_id', id)
    .single();
  
  console.log('投稿詳細 - Post ID:', id);
  console.log('投稿詳細 - vote_options:', voteOptions);

  // 投票済みかどうかをチェック
  let hasVoted = false;
  let votedChoiceId = null;
  if (session?.user?.id) {
    const { data: voteHistory, error: voteError } = await supabase
      .from('vote_history')
      .select('choice_id')
      .eq('post_id', id)
      .eq('user_id', session.user.id)
      .maybeSingle();
    
    if (voteHistory && !voteError) {
      hasVoted = true;
      votedChoiceId = voteHistory.choice_id;
    }
  }

  // コメント総数を取得
  const { count: totalCommentCount } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', parseInt(id))
    .eq('status', 'approved');

  const { data: commentsData } = await supabase
    .from('comments')
    .select('id, content, created_at, user_id, parent_id')
    .eq('post_id', parseInt(id))
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  const comments = await Promise.all(
    (commentsData || []).map(async (comment) => {
      let commentUserName = 'ゲスト';
      let commentUserAvatar = null;
      let commentAvatarStyle = null;
      let commentAvatarSeed = null;
      let commentUseCustomImage = false;
      if (comment.user_id) {
        const { data: user } = await supabase
          .from('users')
          .select('name, image, avatar_style, avatar_seed, use_custom_image')
          .eq('id', comment.user_id)
          .single();
        
        if (user) {
          if (user.name) commentUserName = user.name;
          commentUserAvatar = user.image;
          commentAvatarStyle = user.avatar_style;
          commentAvatarSeed = user.avatar_seed;
          commentUseCustomImage = user.use_custom_image || false;
        }
      }
      
      // コメントのいいね数を取得
      const { count: likeCount } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('like_type', 'comment')
        .eq('target_id', comment.id);
      
      return {
        ...comment,
        users: { 
          name: commentUserName,
          image: commentUserAvatar,
          avatar_style: commentAvatarStyle,
          avatar_seed: commentAvatarSeed,
          use_custom_image: commentUseCustomImage
        },
        like_count: likeCount || 0
      };
    })
  );

  if (!post || post.status === 'trash') {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Header />

        <main className="md:flex md:justify-center mx-auto pt-[60px] md:pt-4 pb-4 max-w-7xl">
          {/* 左サイドバー */}
          <aside className="hidden md:block w-[220px]">
            <Sidebar />
          </aside>

          {/* メインコンテンツ */}
          <div className="flex-1 md:max-w-[760px] px-4 md:px-0">
            <div className="bg-white shadow-sm rounded-lg p-8 text-center my-8">
              <div className="mb-6">
                <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">投稿が見つかりません</h1>
              <p className="text-gray-600 mb-8">
                お探しの投稿は削除されたか、存在しない可能性があります。
              </p>
              <Link 
                href="/" 
                className="inline-block px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                トップページに戻る
              </Link>
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

  const imageUrl = post.og_image || post.thumbnail_url || '/images/noimage.webp';
  
  console.log('投稿詳細 - Post ID:', id);
  console.log('投稿詳細 - og_image:', post.og_image);
  console.log('投稿詳細 - imageUrl:', imageUrl);

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />

      <main className="md:flex md:justify-center mx-auto pt-[60px] md:pt-4 pb-4 max-w-7xl px-2 sm:px-6 lg:px-8">
        {/* 左サイドバー */}
        <aside className="hidden md:block w-[220px]">
          <Sidebar />
        </aside>

        {/* メインコンテンツ */}
        <div className="flex-1 max-w-[760px]">
          {/* 更新成功メッセージ */}
          {showUpdatedMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 font-medium">✓ 記事を更新しました</p>
            </div>
          )}
          
          <section>
            <article className="px-0 md:px-2.5">
              {/* 投稿情報エリア（single.phpと同じデザイン） */}
              <div className="relative bg-white shadow-md mb-4 p-2.5 border border-gray-200 rounded">
                <div className="flex items-start">
                  {/* アバター画像 */}
                  <div className="flex-shrink-0 mr-1.5">
                    {post?.user_id ? (
                      <Link href={`/users/${post.user_id}`}>
                        <img 
                          src={getAvatarUrl(String(post.user_id), userAvatar, userUseCustomImage, userAvatarStyle, userAvatarSeed, 20)}
                          alt={userName}
                          className="rounded-full w-5 h-5 object-cover hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      </Link>
                    ) : (
                      <img 
                        src={getDiceBearUrl('guest', 'big-smile', 20)}
                        alt="ゲスト"
                        className="rounded-full w-5 h-5 object-cover"
                      />
                    )}
                  </div>
                  
                  {/* ユーザー名と日付 */}
                  <div className="flex flex-col">
                    <div className="mb-0 text-gray-700 text-sm">
                      {post?.user_id ? (
                        <Link href={`/users/${post.user_id}`} className="hover:text-blue-600 transition-colors">
                          {userName}さん
                        </Link>
                      ) : (
                        <span>{userName}さん</span>
                      )}
                      {(userSex || userBirthYear || userPrefecture) && (
                        <span className="ml-2 text-gray-500 text-xs">
                          {getSexSymbol(userSex)}
                          {getAgeGroup(userBirthYear) && ` ${getAgeGroup(userBirthYear)}`}
                          {userPrefecture && ` ${userPrefecture}`}
                        </span>
                      )}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {new Date(post.created_at).toLocaleDateString('ja-JP', {
                        year: '2-digit',
                        month: '2-digit',
                        day: '2-digit',
                        weekday: 'short'
                      })}
                    </div>
                  </div>
                  
                  {/* いいねとお気に入りボタン */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <LikeButton postId={post.id} />
                    <FavoriteButton postId={post.id} />
                  </div>
                </div>

                <div className="clear-both"></div>
                
                {/* タイトル */}
                <div className="mt-4 mb-4 flex items-center justify-between">
                  <h1 className="font-bold text-gray-900 text-2xl">
                    {post.title}
                  </h1>
                  {(session?.user?.status === 3 || session?.user?.id === post.user_id) && (
                    <Link
                      href={session?.user?.status === 3 ? `/admin/posts/${post.id}/edit` : `/post-manage/${post.id}`}
                      className="ml-4 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      編集
                    </Link>
                  )}
                </div>

                {/* 本文（管理者投稿は緑エリアなし、一般投稿は条件分岐） */}
                {post.user_id.toString() === '33' ? (
                  // 管理者投稿：緑エリアなし、本文のみ表示
                  <div className="mb-1.5">
                    <div className="font-normal text-gray-800 text-sm leading-relaxed">
                      <div dangerouslySetInnerHTML={{ __html: (post.content || '').replace(/\\n/g, '<br>').replace(/\n/g, '<br>') }} />
                    </div>
                  </div>
                ) : imageUrl && (imageUrl.startsWith('data:image/') || imageUrl.startsWith('/uploads/')) ? (
                  // 手動画像アップロード：画像を左に小さく表示、本文を回り込ませ
                  <div className="mb-1.5">
                    <div className="float-left mr-3 mb-2 w-24 md:w-32">
                      <ClickableImage
                        src={imageUrl}
                        alt={post.title}
                        className="w-full rounded"
                        loading="lazy"
                      />
                    </div>
                    <div className="font-normal text-gray-800 text-sm leading-relaxed">
                      {post.content ? (
                        <div dangerouslySetInnerHTML={{ __html: (post.content || '').replace(/\\n/g, '<br>').replace(/\n/g, '<br>') }} />
                      ) : (
                        <p className="text-gray-500">本文はありません</p>
                      )}
                    </div>
                    <div className="clear-both"></div>
                  </div>
                ) : (() => {
                  // RSS記事かどうかを判定（og_titleまたはsource_urlがある場合）
                  const isRssArticle = post.og_title || post.source_url;
                  
                  if (isRssArticle) {
                    // RSS自動投稿：シンプルな表示（緑背景・ボーダー・画像なし）
                    return (
                      <div className="mb-1.5">
                        <div className="font-normal text-gray-800 text-sm leading-relaxed">
                          {post.content ? (
                            <div dangerouslySetInnerHTML={{ __html: (post.content || '').replace(/\\n/g, '<br>').replace(/\n/g, '<br>') }} />
                          ) : (
                            <p className="text-gray-500">本文はありません</p>
                          )}
                        </div>
                      </div>
                    );
                  } else {
                    // 通常の投稿：緑エリアなし、本文のみ表示
                    return (
                      <div className="mb-1.5">
                        <div className="font-normal text-gray-800 text-sm leading-relaxed">
                          {post.content ? (
                            <div dangerouslySetInnerHTML={{ __html: (post.content || '').replace(/\\n/g, '<br>').replace(/\n/g, '<br>') }} />
                          ) : (
                            <p className="text-gray-500">本文はありません</p>
                          )}
                        </div>
                      </div>
                    );
                  }
                })()}

                {/* 記事ID（右下に表示） */}
                <div className="mb-4 text-right">
                  <span className="text-gray-400 text-sm">ID: {post.id}</span>
                </div>

                {/* 回答受付状況 */}
                {post.deadline_at && (
                  <div className="mb-4 flex items-center gap-2">
                    {new Date(post.deadline_at) > new Date() ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <span className="w-2 h-2 mr-2 bg-green-500 rounded-full animate-pulse"></span>
                        回答受付中
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                        締め切り済み
                      </span>
                    )}
                    <span className="text-sm text-gray-500">
                      締め切り: {new Date(post.deadline_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                )}

{/* 投票セクションは一時的に非表示（アンケート機能はオプション） */}

                {/* カテゴリとキーワード表示 */}
                {(category || keywords.length > 0) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap gap-2">
                      {/* カテゴリ */}
                      {category && (
                        <Link
                          href={`/category/${category.id}`}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                        >
                          {category.name}
                        </Link>
                      )}
                      {/* キーワード */}
                      {keywords.map((keyword: any) => (
                        <Link
                          key={keyword.id}
                          href={`/keyword/${keyword.id}`}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                          {keyword.keyword}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* コメントセクション */}
              <CommentSection postId={post.id} initialComments={comments || []} totalCount={totalCommentCount || 0} postUserId={post.user_id as any} bestAnswerId={post.best_answer_id ? Number(post.best_answer_id) : undefined} deadlineAt={post.deadline_at} />
            </article>
          </section>
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
