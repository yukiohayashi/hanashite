import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import PostEditForm from './PostEditForm';

async function getPost(id: string) {
  const postId = parseInt(id);
  
  const { data: post, error } = await supabase
    .from('posts')
    .select('*, best_answer_selected_at, deadline_at, category_id')
    .eq('id', postId)
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

  // この投稿のコメント（回答）を取得
  const { data: comments, error: commentsError } = await supabase
    .from('comments')
    .select('id, content, user_id, created_at')
    .eq('post_id', postId)
    .eq('status', 'approved')
    .order('created_at', { ascending: true });

  console.log('Comments query result:', { comments, commentsError });

  // コメントのユーザー情報を取得
  let commentsWithUsers = comments || [];
  if (comments && comments.length > 0) {
    const commentUserIds = [...new Set(comments.map(c => c.user_id).filter(Boolean))];
    const { data: commentUsers } = await supabase
      .from('users')
      .select('id, name')
      .in('id', commentUserIds);

    const userMap = new Map(commentUsers?.map(u => [u.id, u]) || []);
    
    commentsWithUsers = comments.map(comment => ({
      ...comment,
      users: userMap.get(comment.user_id) || null,
    }));
  }

  const result = {
    ...post,
    users: user,
    comments: commentsWithUsers,
  };
  
  console.log('Returning post with status:', result.status);
  console.log('Comments count:', commentsWithUsers.length);
  
  return result;
}

async function getCategories() {
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('id', { ascending: true });
  
  return categories || [];
}

export default async function PostEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [post, categories] = await Promise.all([
    getPost(id),
    getCategories()
  ]);

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
        <div className="flex items-center gap-3">
          <a
            href="/admin/posts"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            ← 投稿一覧に戻る
          </a>
          <a
            href={`/posts/${post.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            実際のページを見る
          </a>
        </div>
      </div>

      <PostEditForm post={post} categories={categories} />
    </div>
  );
}
