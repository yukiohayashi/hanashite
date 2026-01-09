import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import PostEditForm from './PostEditForm';

async function getPost(id: string) {
  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', parseInt(id))
    .single();

  if (error || !post) {
    console.error('Error fetching post:', error);
    return null;
  }

  console.log('Fetched post:', post);
  console.log('Post status from DB:', post.status);

  // ユーザー情報を取得
  const { data: user } = await supabase
    .from('users')
    .select('id, name')
    .eq('id', post.user_id)
    .single();

  const result = {
    ...post,
    users: user,
  };
  
  console.log('Returning post with status:', result.status);
  
  return result;
}

export default async function PostEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">投稿編集 #{post.id}</h1>
          <p className="mt-2 text-gray-600">投稿内容を編集</p>
        </div>
        <a
          href="/admin/posts"
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          ← 投稿一覧に戻る
        </a>
      </div>

      <PostEditForm post={post} />
    </div>
  );
}
