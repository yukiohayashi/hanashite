'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  name: string;
  email: string;
  status: number;
  is_banned: boolean;
  user_description?: string;
  image?: string;
  sei?: string;
  mei?: string;
  kana_sei?: string;
  kana_mei?: string;
  birth_year?: string;
  sex?: string;
  marriage?: string;
  child_count?: number;
  job?: string;
  prefecture?: string;
  sns_x?: string;
  created_at: string;
}

interface UserEditFormProps {
  user: User;
}

export default function UserEditForm({ user }: UserEditFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    status: user.status || 0,
    is_banned: user.is_banned || false,
    user_description: user.user_description || '',
    sei: user.sei || '',
    mei: user.mei || '',
    kana_sei: user.kana_sei || '',
    kana_mei: user.kana_mei || '',
    birth_year: user.birth_year || '',
    sex: user.sex || '',
    marriage: user.marriage || '',
    child_count: user.child_count || 0,
    job: user.job || '',
    prefecture: user.prefecture || '',
    sns_x: user.sns_x || '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(user.image || '');
  const [loading, setLoading] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // アバター画像をアップロード
      let imageUrl = user.image;
      if (avatarFile) {
        const formDataImage = new FormData();
        formDataImage.append('file', avatarFile);
        formDataImage.append('userId', user.id.toString());

        const uploadResponse = await fetch('/api/admin/users/upload-avatar', {
          method: 'POST',
          body: formDataImage,
        });

        if (uploadResponse.ok) {
          const { imageUrl: newImageUrl } = await uploadResponse.json();
          imageUrl = newImageUrl;
        }
      }

      // ユーザー情報を更新
      const response = await fetch(`/api/admin/users/${user.id}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          image: imageUrl,
        }),
      });

      if (response.ok) {
        alert('ユーザー情報を更新しました');
        router.push('/admin/users');
      } else {
        const errorData = await response.json();
        console.error('Update failed:', errorData);
        alert(`更新に失敗しました: ${errorData.details || errorData.error || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert(`更新に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
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
              ユーザーID
            </label>
            <input
              type="text"
              value={user.id}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-500">ユーザーIDは変更できません。</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">ログインに使用するメールアドレスです。</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ニックネーム <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              権限
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="0">一般</option>
              <option value="1">投稿者</option>
              <option value="2">編集者</option>
              <option value="3">管理者</option>
              <option value="6">AIエディター</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ステータス
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_banned}
                onChange={(e) => setFormData({ ...formData, is_banned: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                このユーザーをBANする
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              自己紹介
            </label>
            <textarea
              value={formData.user_description}
              onChange={(e) => setFormData({ ...formData, user_description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 個人情報 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">個人情報</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              姓
            </label>
            <input
              type="text"
              value={formData.sei}
              onChange={(e) => setFormData({ ...formData, sei: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              名
            </label>
            <input
              type="text"
              value={formData.mei}
              onChange={(e) => setFormData({ ...formData, mei: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              セイ（カナ）
            </label>
            <input
              type="text"
              value={formData.kana_sei}
              onChange={(e) => setFormData({ ...formData, kana_sei: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メイ（カナ）
            </label>
            <input
              type="text"
              value={formData.kana_mei}
              onChange={(e) => setFormData({ ...formData, kana_mei: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              生まれ年
            </label>
            <input
              type="text"
              value={formData.birth_year}
              onChange={(e) => setFormData({ ...formData, birth_year: e.target.value })}
              placeholder="例: 1990"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              性別
            </label>
            <select
              value={formData.sex}
              onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">選択してください</option>
              <option value="male">男性</option>
              <option value="female">女性</option>
              <option value="other">その他</option>
              <option value="男性">男性（旧）</option>
              <option value="女性">女性（旧）</option>
              <option value="その他">その他（旧）</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              結婚状況
            </label>
            <select
              value={formData.marriage}
              onChange={(e) => setFormData({ ...formData, marriage: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">選択してください</option>
              <option value="single">未婚</option>
              <option value="married">既婚</option>
              <option value="divorced">離婚</option>
              <option value="widowed">死別</option>
              <option value="未婚">未婚（旧）</option>
              <option value="既婚">既婚（旧）</option>
              <option value="離婚">離婚（旧）</option>
              <option value="死別">死別（旧）</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              子供の数
            </label>
            <input
              type="number"
              value={formData.child_count}
              onChange={(e) => setFormData({ ...formData, child_count: parseInt(e.target.value) || 0 })}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              職種
            </label>
            <input
              type="text"
              value={formData.job}
              onChange={(e) => setFormData({ ...formData, job: e.target.value })}
              placeholder="例: 会社員"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              都道府県
            </label>
            <input
              type="text"
              value={formData.prefecture}
              onChange={(e) => setFormData({ ...formData, prefecture: e.target.value })}
              placeholder="例: 東京都"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              X (旧Twitter) URL
            </label>
            <input
              type="url"
              value={formData.sns_x}
              onChange={(e) => setFormData({ ...formData, sns_x: e.target.value })}
              placeholder="https://x.com/username"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* アバター画像 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">アバター画像</h2>
        
        <div className="space-y-4">
          {avatarPreview && (
            <div className="flex items-center gap-4">
              <img
                src={avatarPreview}
                alt="アバタープレビュー"
                className="w-24 h-24 rounded-full object-cover"
              />
              <div className="text-sm text-gray-600">
                現在の画像
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              新しい画像をアップロード
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              JPG, PNG, GIF形式の画像をアップロードできます。
            </p>
          </div>
        </div>
      </div>

      {/* その他の情報 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">その他の情報</h2>
        
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <span className="font-medium">登録日:</span>{' '}
            {new Date(user.created_at).toLocaleString('ja-JP')}
          </p>
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '保存中...' : 'ユーザー情報を更新'}
        </button>
        <a
          href="/admin/users"
          className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          キャンセル
        </a>
      </div>
    </form>
  );
}
