import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MyPageMenu from '@/components/MyPageMenu';
import PostManageForm from './PostManageForm';

interface Post {
  id: number;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  deadline_at: string | null;
  status: string;
  best_answer_id: number | null;
}

interface Comment {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
  user_name: string;
  avatar_url?: string;
}

async function getPost(postId: number, userId: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, content, created_at, user_id, deadline_at, status, best_answer_id')
    .eq('id', postId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Post;
}

async function getComments(postId: number): Promise<Comment[]> {
  try {
    // シンプルにコメントのみ取得
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      return [];
    }

    if (!comments || comments.length === 0) {
      return [];
    }

    // 各コメントにユーザー情報を個別に取得
    const commentsWithUsers = await Promise.all(
      comments.map(async (comment) => {
        try {
          console.log('Fetching user for comment ID:', comment.id, 'User ID:', comment.user_id);
          
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', comment.user_id)
            .single();

          console.log('User data:', user);
          console.log('User error:', userError);

          // 複数のカラム名を試して正しいユーザー名を取得
          const userName = user?.display_name || user?.user_name || user?.name || '匿名';
          
          // アバターURLの優先順位：avatar_url > user_img_url > avatar_style+avatar_seedで生成
          let avatarUrl = user?.avatar_url || user?.user_img_url;
          
          // avatar_urlとuser_img_urlが両方nullの場合、avatar_styleとavatar_seedで生成
          if (!avatarUrl && user?.avatar_style && user?.avatar_seed) {
            avatarUrl = `https://api.dicebear.com/9.x/${user.avatar_style}/svg?seed=${user.avatar_seed}&size=40`;
          }

          console.log('Final username:', userName);
          console.log('Final avatar URL:', avatarUrl);

          return {
            id: comment.id,
            content: comment.content,
            created_at: comment.created_at,
            user_id: comment.user_id,
            user_name: userName,
            avatar_url: avatarUrl
          };
        } catch (userErr) {
          console.error('Error fetching user for comment:', comment.id, userErr);
          return {
            id: comment.id,
            content: comment.content,
            created_at: comment.created_at,
            user_id: comment.user_id,
            user_name: '匿名',
            avatar_url: undefined
          };
        }
      })
    );

    return commentsWithUsers;
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

export default async function PostManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  const { id } = await params;
  const postId = parseInt(id);

  if (isNaN(postId)) {
    notFound();
  }

  // 投稿を取得
  const post = await getPost(postId, session.user.id);

  if (!post) {
    notFound();
  }

  // コメントを取得
  const comments = await getComments(postId);

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      
      <div className="wrapper max-w-[1260px] mx-auto mt-16 md:mt-4 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-5">
          <main className="flex-1 md:min-w-[690px] w-full">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="p-0 font-bold text-[#ff6b35] text-2xl">
                記事管理
              </h1>
              <Link 
                href="/my-posts"
                className="text-gray-600 hover:text-gray-800 text-sm"
              >
                ← 相談した記事一覧に戻る
              </Link>
            </div>
            
            <PostManageForm post={post} comments={comments} />
          </main>
          
          <aside className="hidden md:block w-full md:w-[280px] md:min-w-[280px]">
            <MyPageMenu />
          </aside>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
