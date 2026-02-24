'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Category {
  id: number;
  name: string;
}

export default function PostCreateForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category_id: '',
    status: 'draft',
    thumbnail_url: '',
    og_image: '',
  });

  useEffect(() => {
    // カテゴリ一覧を取得
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCategories(data.categories);
        }
      })
      .catch(err => console.error('カテゴリ取得エラー:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('タイトルを入力してください');
      return;
    }

    if (!formData.content.trim()) {
      alert('本文を入力してください');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/admin/posts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          category_id: formData.category_id ? parseInt(formData.category_id) : null,
          user_id: 1, // 管理者ID
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('投稿を作成しました');
        router.push('/admin/posts');
      } else {
        alert(data.error || '投稿の作成に失敗しました');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('投稿の作成に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
      {/* タイトル */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="投稿のタイトルを入力"
          required
        />
      </div>

      {/* 本文 */}
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
          本文 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px]"
          placeholder="投稿の本文を入力"
          required
        />
      </div>

      {/* カテゴリ */}
      <div>
        <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-2">
          カテゴリ
        </label>
        <select
          id="category_id"
          value={formData.category_id}
          onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">カテゴリを選択</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* サムネイルURL */}
      <div>
        <label htmlFor="thumbnail_url" className="block text-sm font-medium text-gray-700 mb-2">
          サムネイルURL
        </label>
        <input
          type="url"
          id="thumbnail_url"
          value={formData.thumbnail_url}
          onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com/image.jpg"
        />
      </div>

      {/* OG画像URL */}
      <div>
        <label htmlFor="og_image" className="block text-sm font-medium text-gray-700 mb-2">
          OG画像URL
        </label>
        <input
          type="url"
          id="og_image"
          value={formData.og_image}
          onChange={(e) => setFormData({ ...formData, og_image: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com/og-image.jpg"
        />
      </div>

      {/* ステータス */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
          ステータス
        </label>
        <select
          id="status"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="draft">下書き</option>
          <option value="published">公開</option>
        </select>
      </div>

      {/* 注意事項 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>注意:</strong> 管理者（user_id: 1）として投稿されます。
        </p>
      </div>

      {/* ボタン */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
        >
          {saving ? '作成中...' : '投稿を作成'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/posts')}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
