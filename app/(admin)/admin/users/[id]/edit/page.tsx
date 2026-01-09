import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import UserEditForm from './UserEditForm';

async function getUser(id: string) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', parseInt(id))
    .single();

  if (error || !user) {
    return null;
  }

  return user;
}

export default async function UserEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser(id);

  if (!user) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ユーザー編集 #{user.id}</h1>
          <p className="mt-2 text-gray-600">ユーザー情報を編集</p>
        </div>
        <a
          href="/admin/users"
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          ← ユーザー一覧に戻る
        </a>
      </div>

      <UserEditForm user={user} />
    </div>
  );
}
