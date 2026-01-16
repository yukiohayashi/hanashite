'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Post {
  id: number;
  title: string;
  content: string;
  status: string;
  created_at: string;
  og_image?: string | null;
  users: {
    id: number;
    name: string;
  } | null;
}

interface PostEditFormProps {
  post: Post;
}

export default function PostEditForm({ post }: PostEditFormProps) {
  const router = useRouter();
  
  console.log('Post data:', post);
  console.log('Post status:', post.status);
  
  const [formData, setFormData] = useState({
    title: post.title || '',
    content: post.content || '',
    status: post.status || 'draft',
  });
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(post.og_image || '');
  const [imageDeleted, setImageDeleted] = useState(false);
  
  console.log('Form data status:', formData.status);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setImageDeleted(false);
    }
  };

  const handleImageRemove = () => {
    setImageFile(null);
    setImagePreview('');
    setImageDeleted(true);
  };

  const handleDelete = async () => {
    if (!confirm('この投稿を削除してもよろしいですか？\nこの操作は取り消せません。')) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/posts/${post.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('投稿を削除しました');
        router.push('/admin/posts');
      } else {
        const result = await response.json();
        alert(`削除に失敗しました: ${result.error || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('削除に失敗しました: ネットワークエラー');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let uploadedImageUrl = post.og_image;

      // 画像が削除された場合
      if (imageDeleted) {
        uploadedImageUrl = null;
      }
      // 新しい画像がアップロードされた場合
      else if (imageFile) {
        const imageFormData = new FormData();
        imageFormData.append('image', imageFile);

        const uploadResponse = await fetch('/api/upload-image', {
          method: 'POST',
          body: imageFormData,
        });

        const uploadData = await uploadResponse.json();

        if (uploadData.success) {
          uploadedImageUrl = uploadData.url;
        } else {
          alert('画像のアップロードに失敗しました');
          setLoading(false);
          return;
        }
      }

      console.log('Sending update request:', { ...formData, og_image: uploadedImageUrl });
      
      const response = await fetch(`/api/admin/posts/${post.id}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, og_image: uploadedImageUrl }),
      });

      const result = await response.json();
      console.log('Response status:', response.status);
      console.log('Response:', JSON.stringify(result, null, 2));

      if (response.ok) {
        alert('投稿を更新しました');
        router.push('/admin/posts');
      } else {
        console.error('Update failed:', JSON.stringify(result, null, 2));
        alert(`更新に失敗しました: ${result.error || '不明なエラー'}\n詳細: ${JSON.stringify(result.details || {})}`);
      }
    } catch (error) {
      console.error('Error updating post:', error);
      alert('更新に失敗しました: ネットワークエラー');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本情報 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              投稿ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={post.id}
                disabled
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
              <a
                href={`/posts/${post.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap"
              >
                実際のページを見る
              </a>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              rows={15}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ステータス
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="draft">下書き</option>
              <option value="published">公開</option>
              <option value="trash">ゴミ箱</option>
            </select>
          </div>

          {/* 画像管理 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              画像
            </label>
            
            {imagePreview && !imageDeleted ? (
              <div className="space-y-2">
                <div className="relative inline-block">
                  <img 
                    src={imagePreview}
                    alt="投稿画像"
                    className="max-w-full h-auto max-h-64 rounded-lg border border-gray-300"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleImageRemove}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    画像を削除
                  </button>
                  <label className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
                    画像を変更
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div>
                <label className="block w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-gray-400">
                  <div className="space-y-2">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-blue-600 hover:text-blue-500">クリックして画像を選択</span>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF (最大10MB)</p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* その他の情報 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">その他の情報</h2>
        
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <span className="font-medium">投稿者:</span>{' '}
            {post.users?.name || 'ゲスト'}
          </p>
          <p>
            <span className="font-medium">作成日:</span>{' '}
            {new Date(post.created_at).toLocaleString('ja-JP')}
          </p>
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '保存中...' : '投稿を更新'}
          </button>
          <a
            href="/admin/posts"
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            キャンセル
          </a>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '削除中...' : '投稿を削除'}
        </button>
      </div>
    </form>
  );
}
