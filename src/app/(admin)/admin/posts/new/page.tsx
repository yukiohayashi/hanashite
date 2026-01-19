import PostCreateForm from './PostCreateForm';

export default function NewPostPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">新規投稿作成</h1>
        <p className="mt-2 text-gray-600">管理者として新しい投稿を作成します</p>
      </div>

      <PostCreateForm />
    </div>
  );
}
