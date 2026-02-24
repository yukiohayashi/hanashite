'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Comment {
  id: number;
  content: string;
  user_id: string;
  created_at: string;
  users: {
    id: string;
    name: string;
  } | null;
}

interface Post {
  id: number;
  title: string;
  content: string;
  status: string;
  created_at: string;
  deadline_at?: string | null;
  og_image?: string | null;
  best_answer_id?: number | null;
  best_answer_selected_at?: string | null;
  user_id: string;
  category_id?: number | null;
  users: {
    id: number;
    name: string;
  } | null;
  comments?: Comment[];
}

interface Category {
  id: number;
  name: string;
}

interface PostEditFormProps {
  post: Post;
  categories: Category[];
}

export default function PostEditForm({ post, categories }: PostEditFormProps) {
  const router = useRouter();
  
  console.log('Post data:', post);
  console.log('Post status:', post.status);
  
  const [formData, setFormData] = useState({
    title: post.title || '',
    content: post.content || '',
    status: post.status || 'draft',
    created_at: post.created_at ? new Date(post.created_at).toISOString().slice(0, 16) : '',
    deadline_at: post.deadline_at ? new Date(post.deadline_at).toISOString().slice(0, 10) : '',
    category_id: post.category_id || null,
  });
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(post.og_image || '');
  const [imageDeleted, setImageDeleted] = useState(false);
  const [bestAnswerId, setBestAnswerId] = useState<number | null>(post.best_answer_id || null);
  
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

      console.log('Sending update request:', { ...formData, og_image: uploadedImageUrl, best_answer_id: bestAnswerId });
      
      const response = await fetch(`/api/admin/posts/${post.id}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ...formData, 
          og_image: uploadedImageUrl, 
          best_answer_id: bestAnswerId,
          created_at: new Date(formData.created_at).toISOString(),
          deadline_at: formData.deadline_at ? new Date(formData.deadline_at + 'T00:00:00').toISOString() : null
        }),
      });

      const result = await response.json();
      console.log('Response status:', response.status);
      console.log('Response:', JSON.stringify(result, null, 2));

      if (response.ok) {
        alert('投稿を更新しました');
        router.refresh();
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
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">基本情報</h2>
        
        <div className="flex gap-3 items-end mb-3">
          <div className="w-20">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID
            </label>
            <input
              type="text"
              value={post.id}
              disabled
              className="w-full px-2 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm text-center"
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              投稿者
            </label>
            <input
              type="text"
              value={post.users?.name || 'ゲスト'}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm"
            />
          </div>

          <div className="w-52">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              作成日
            </label>
            <input
              type="datetime-local"
              value={formData.created_at}
              onChange={(e) => setFormData({ ...formData, created_at: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div className="w-52">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              締め切り
            </label>
            <input
              type="date"
              value={formData.deadline_at}
              onChange={(e) => setFormData({ ...formData, deadline_at: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div className="w-52">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ハナシテカテゴリ
            </label>
            <select
              value={formData.category_id || ''}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">未設定</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 items-end">
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ステータス
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="draft">下書き</option>
              <option value="published">公開</option>
              <option value="trash">ゴミ箱</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap font-medium"
          >
            {loading ? '保存中...' : '投稿を更新'}
          </button>

          <a
            href="/admin/posts"
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm whitespace-nowrap"
          >
            キャンセル
          </a>

          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
          >
            {loading ? '削除中...' : '投稿を削除'}
          </button>
        </div>
      </div>

      {/* 内容と画像 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">内容と画像</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              rows={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
          </div>

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
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    画像を削除
                  </button>
                  <label className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
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
                    <svg className="mx-auto h-10 w-10 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
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

      {/* ベストアンサー選択 */}
      {post.comments && post.comments.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">ベストアンサー選択</h2>
            <span className="text-sm text-gray-600">
              コメント数: <span className="font-medium text-gray-900">{post.comments.length}件</span>
            </span>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {bestAnswerId ? (
                  <>
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex px-3 py-1.5 text-sm bg-green-100 text-green-800 rounded-md font-medium">
                        ✓ ベストアンサー設定済み (ID: {bestAnswerId})
                      </span>
                      {post.best_answer_selected_at && (
                        <span className="text-xs text-gray-600 ml-1">
                          選択日時: {new Date(post.best_answer_selected_at).toLocaleString('ja-JP', { 
                            year: 'numeric', 
                            month: '2-digit', 
                            day: '2-digit', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setBestAnswerId(null)}
                      className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      ✕ ベストアンサーを取り消す
                    </button>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">
                    ベストアンサーが設定されていません。下のコメントから選択してください。
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {post.comments.map((comment) => {
                const isPostAuthor = comment.user_id === post.user_id;
                const isSelectable = !isPostAuthor;
                
                return (
                  <div
                    key={comment.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      isPostAuthor
                        ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60'
                        : bestAnswerId === comment.id
                        ? 'border-green-500 bg-green-50 cursor-pointer'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                    }`}
                    onClick={() => isSelectable && setBestAnswerId(comment.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isPostAuthor ? 'text-gray-500' : 'text-gray-900'}`}>
                          {comment.users?.name || 'ゲスト'}
                        </span>
                        <span className="text-xs text-gray-500">
                          ID: {comment.id}
                        </span>
                        {isPostAuthor && (
                          <span className="inline-flex px-2 py-1 text-xs bg-gray-500 text-white rounded font-semibold">
                            投稿者
                          </span>
                        )}
                        {bestAnswerId === comment.id && (
                          <span className="inline-flex px-2 py-1 text-xs bg-green-600 text-white rounded font-semibold">
                            ベストアンサー
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                    <div 
                      className={`text-sm line-clamp-3 ${isPostAuthor ? 'text-gray-500' : 'text-gray-700'}`}
                      dangerouslySetInnerHTML={{ __html: comment.content }}
                    />
                    {isPostAuthor && (
                      <p className="text-xs text-gray-500 mt-2 italic">
                        ※ 投稿者自身のコメントはベストアンサーに設定できません
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </form>
  );
}
