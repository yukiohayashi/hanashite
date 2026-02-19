import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PostEditForm from './PostEditForm';

export default async function AnkeEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  const { slug: id } = await params;
  
  // 投稿データを取得
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, title, content, user_id')
    .eq('id', id)
    .single();

  if (!post || postError) {
    redirect('/my-posts');
  }

  // 投稿者本人かチェック
  if (post.user_id.toString() !== session.user.id.toString()) {
    redirect('/my-posts');
  }

  // 投票オプションを取得
  const { data: voteOptions } = await supabase
    .from('vote_options')
    .select('random, close_at')
    .eq('post_id', id)
    .single();

  // カテゴリーを取得
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('display_order', { ascending: true });

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      
      <div className="md:flex md:justify-center md:mx-auto mt-14 md:mt-[70px] md:pt-0 md:max-w-7xl">
        <main className="flex-1 px-4 max-w-4xl">
          <section>
            <h1 className="mb-4 p-0 font-bold text-orange-500 text-2xl">
              アンケートを変更する
            </h1>
            
            <PostEditForm 
              postId={post.id}
              initialTitle={post.title}
              initialContent={post.content}
              initialRandom={voteOptions?.random || false}
              initialCloseAt={voteOptions?.close_at || null}
              categories={categories || []}
            />
          </section>
        </main>
      </div>
      
      <Footer />
    </div>
  );
}
