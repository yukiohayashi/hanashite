import { supabase } from '@/lib/supabase';
import { FileText, Users, MessageSquare, Heart } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ダッシュボード｜ハナシテ',
};

async function getStats() {
  const [postsCount, usersCount, commentsCount, likesCount] = await Promise.all([
    supabase.from('posts').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('comments').select('id', { count: 'exact', head: true }),
    supabase.from('likes').select('id', { count: 'exact', head: true }),
  ]);

  return {
    posts: postsCount.count || 0,
    users: usersCount.count || 0,
    comments: commentsCount.count || 0,
    likes: likesCount.count || 0,
  };
}

async function getRecentPosts() {
  const { data } = await supabase
    .from('posts')
    .select('id, title, created_at, users(nickname)')
    .order('created_at', { ascending: false })
    .limit(5);

  return data || [];
}

export default async function AdminDashboard() {
  const stats = await getStats();
  const recentPosts = await getRecentPosts();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="mt-2 text-gray-600">サイトの統計情報と最近のアクティビティ</p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">投稿数</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.posts.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">ユーザー数</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.users.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">コメント数</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.comments.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">いいね数</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.likes.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <Heart className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 最近の投稿 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">最近の投稿</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentPosts.map((post) => (
            <div key={post.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {post.title}
                  </p>
                  <p className="text-sm text-gray-500">
                    相談者:{(post.users as any)?.[0]?.nickname || (post.users as any)?.nickname || 'ゲスト'} • {' '}
                    {new Date(post.created_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <a
                  href={`/posts/${post.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-4 text-sm text-blue-600 hover:text-blue-800"
                >
                  表示
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
