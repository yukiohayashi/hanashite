import { supabase } from '@/lib/supabase';
import Link from 'next/link';

async function getUserPosts(userId: string) {
  // ユーザー情報を取得
  const { data: user } = await supabase
    .from('users')
    .select('id, name')
    .eq('id', userId)
    .single();

  // ユーザーの投稿を取得
  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, created_at, status, best_answer_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return { user, posts: posts || [] };
}

export default async function UserPostsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, posts } = await getUserPosts(id);

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">ユーザーが見つかりません</h1>
        <Link href="/admin/users" className="text-blue-600 hover:underline">
          ユーザー一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/users" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
          ← ユーザー一覧に戻る
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">
          {user.name}さんの相談一覧
        </h1>
        <p className="text-gray-600 mt-2">
          合計 {posts.length}件の相談
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
          まだ相談を投稿していません
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タイトル
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  投稿日
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <Link
                      href={`/admin/posts/${post.id}/edit`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {post.id}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <Link
                      href={`/posts/${post.id}`}
                      target="_blank"
                      className="hover:text-blue-600"
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {post.best_answer_id ? (
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                        解決済み
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
                        相談受付中
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(post.created_at).toLocaleDateString('ja-JP')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
