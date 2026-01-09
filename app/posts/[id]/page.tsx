import { supabase } from '../../lib/supabase';
import { auth } from '@/auth';
import Link from 'next/link';
import VoteSection from './VoteSection';
import CommentSection from './CommentSection';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Sidebar from '../../components/Sidebar';
import RightSidebar from '../../components/RightSidebar';
import LikeButton from './LikeButton';
import FavoriteButton from './FavoriteButton';

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  
  // デバッグ: セッション情報を確認
  console.log('Post Page - Session:', JSON.stringify(session, null, 2));
  console.log('Post Page - User Status:', session?.user?.status);
  
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, title, content, created_at, user_id, og_image, thumbnail_url, source_url, og_title, og_description, status, category_id')
    .eq('id', id)
    .single();


  let userName = 'ゲスト';
  if (post?.user_id) {
    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('id', post.user_id)
      .single();
    
    if (user && user.name) {
      userName = user.name;
    }
  }

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

  // 投票オプション（締切日時など）を取得
  const { data: voteOptions } = await supabase
    .from('vote_options')
    .select('close_at')
    .eq('post_id', id)
    .single();

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
      if (comment.user_id) {
        const { data: user } = await supabase
          .from('users')
          .select('name, worker_img_url, image')
          .eq('id', comment.user_id)
          .single();
        
        if (user) {
          if (user.name) commentUserName = user.name;
          commentUserAvatar = user.worker_img_url || user.image;
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
          worker_img_url: commentUserAvatar
        },
        like_count: likeCount || 0
      };
    })
  );

  if (!post || (post as any).status === 'trash') {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Header />

        <main className="md:flex md:justify-center mx-auto mt-14 md:mt-[70px] md:pt-0 max-w-7xl">
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

  const imageUrl = (post as any).og_image || (post as any).thumbnail_url || 'https://anke.jp/wp-content/themes/anke/images/anke_eye.webp';
  
  console.log('投稿詳細 - Post ID:', id);
  console.log('投稿詳細 - og_image:', (post as any).og_image);
  console.log('投稿詳細 - imageUrl:', imageUrl);

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />

      <main className="md:flex md:justify-center mx-auto mt-14 md:mt-[70px] md:pt-0 max-w-7xl">
        {/* 左サイドバー */}
        <aside className="hidden md:block w-[220px]">
          <Sidebar />
        </aside>

        {/* メインコンテンツ */}
        <div className="flex-1 max-w-[760px]">
          <section>
            <article className="px-0 md:px-2.5">
              {/* 投稿情報エリア（single.phpと同じデザイン） */}
              <div className="relative bg-white shadow-md mb-4 p-2.5 border border-gray-200 rounded">
                <div className="flex items-start">
                  {/* アバター画像 */}
                  <div className="flex-shrink-0 mr-1.5">
                    <img 
                      src="https://anke.jp/wp-content/themes/anke/images/default_avatar.jpg"
                      alt={userName}
                      className="border-2 border-gray-300 rounded-full w-5 h-5 object-cover"
                    />
                  </div>
                  
                  {/* ユーザー名と日付 */}
                  <div className="flex flex-col">
                    <div className="mb-0 text-gray-700 text-sm">
                      {userName}さん
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
                  {session?.user?.status === 3 && (
                    <Link
                      href={`/admin/posts/${post.id}/edit`}
                      className="ml-4 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      編集
                    </Link>
                  )}
                </div>

                {/* 本文（管理者投稿は緑エリアなし、一般投稿は条件分岐） */}
                {post.user_id === 33 ? (
                  // 管理者投稿：緑エリアなし、本文のみ表示
                  <div className="mb-1.5">
                    <div className="font-normal text-gray-800 text-sm leading-relaxed">
                      <div dangerouslySetInnerHTML={{ __html: post.content.replace(/\\n/g, '<br>').replace(/\n/g, '<br>') }} />
                    </div>
                  </div>
                ) : imageUrl && imageUrl.startsWith('data:image/') ? (
                  // 手動画像アップロード：緑エリアなし、画像100%幅、本文表示
                  <div className="mb-1.5">
                    <div className="mb-2.5">
                      <img 
                        src={imageUrl}
                        alt={post.title}
                        className="w-full rounded"
                        loading="lazy"
                      />
                    </div>
                    <div className="font-normal text-gray-800 text-sm leading-relaxed">
                      {post.content ? (
                        <div dangerouslySetInnerHTML={{ __html: post.content }} />
                      ) : (
                        <p className="text-gray-500">本文はありません</p>
                      )}
                    </div>
                  </div>
                ) : (
                  // RSS自動投稿：緑エリアあり、画像右寄せ
                  <div className="bg-[#f1fbf9] m-0 mb-1.5 p-2.5 border border-[#c1dfd8] rounded min-h-[95px]">
                    {imageUrl && imageUrl !== 'https://anke.jp/wp-content/themes/anke/images/anke_eye.webp' && (
                      <div className="float-right w-1/5">
                        <img 
                          src={imageUrl}
                          alt={post.title}
                          className="float-right pb-1.5 rounded w-20 h-20 object-center object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="block clear-none relative m-0 w-4/5 font-normal text-gray-600 text-sm break-all leading-normal">
                      <div className="max-w-none prose prose-sm">
                        <div className="m-0">
                          {(post as any).og_title && <p className="m-0">{(post as any).og_title}</p>}
                          {post.content ? (
                            <div dangerouslySetInnerHTML={{ __html: post.content }} />
                          ) : (
                            <p className="text-gray-500">本文はありません</p>
                          )}
                          {(() => {
                            let sourceUrl = (post as any).source_url;
                            if (!sourceUrl && post.content) {
                              const urlMatch = post.content.match(/https?:\/\/[^\s\n<]+/);
                              if (urlMatch) {
                                sourceUrl = urlMatch[0].replace(/\\n.*$/, '');
                              }
                            }
                            if (sourceUrl) {
                              try {
                                const hostname = new URL(sourceUrl).hostname;
                                return (
                                  <p className="m-0 text-[0.6rem]">
                                    <a 
                                      href={sourceUrl} 
                                      target="_blank" 
                                      rel="noopener external nofollow" 
                                      className="font-black text-gray-600"
                                    >
                                      {hostname} 引用元：
                                    </a>
                                  </p>
                                );
                              } catch (e) {
                                return null;
                              }
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 記事ID（右下に表示） */}
                <div className="mb-4 text-right">
                  <span className="text-gray-400 text-sm">ID: {post.id}</span>
                </div>

                {/* 投票セクション（管理者投稿は非表示） */}
                {post.user_id !== 33 && (
                  <div className="mt-4">
                    <VoteSection 
                      postId={post.id} 
                      initialChoices={voteChoices || []} 
                      initialHasVoted={hasVoted}
                      initialVotedChoiceId={votedChoiceId}
                      closeAt={voteOptions?.close_at}
                      commentCount={totalCommentCount || 0}
                      createdAt={post.created_at}
                    />
                  </div>
                )}

                {/* カテゴリ表示 */}
                {category && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/category/${category.id}`}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                      >
                        {category.name}
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* コメントセクション */}
              <CommentSection postId={post.id} initialComments={comments || []} totalCount={totalCommentCount || 0} />
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
