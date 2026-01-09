import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import CommentEditForm from './CommentEditForm';

async function getComment(id: string) {
  const { data: comment, error } = await supabase
    .from('comments')
    .select('*')
    .eq('id', parseInt(id))
    .single();

  if (error || !comment) {
    return null;
  }

  // ユーザー情報を取得
  const { data: user } = await supabase
    .from('users')
    .select('id, name')
    .eq('id', comment.user_id)
    .single();

  // 投稿情報を取得
  const { data: post } = await supabase
    .from('posts')
    .select('id, title')
    .eq('id', comment.post_id)
    .single();

  return {
    ...comment,
    users: user,
    posts: post,
  };
}

export default async function CommentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const comment = await getComment(id);

  if (!comment) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">コメント編集 #{comment.id}</h1>
          <p className="mt-2 text-gray-600">コメント内容を編集</p>
        </div>
        <a
          href="/admin/comments"
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          ← コメント一覧に戻る
        </a>
      </div>

      <CommentEditForm comment={comment} />
    </div>
  );
}
