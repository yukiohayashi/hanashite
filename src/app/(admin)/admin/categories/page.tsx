'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: number;
  is_featured: number;
  created_at: string;
  updated_at: string;
  post_count?: number;
  // AI自動コメント用の設定（ハードコード）
  target_days?: number;
  filter_logic?: 'and' | 'or';
  min_votes?: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '',
    display_order: 0,
    is_active: 1,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (data) {
      // AI自動コメント用の設定をハードコードで追加（カテゴリIDごと）
      const categorySettings: Record<number, { target_days: number; filter_logic: 'and' | 'or'; min_votes: number }> = {
        1: { target_days: 10, filter_logic: 'and', min_votes: 0 },    // アニメ・漫画
        2: { target_days: 10, filter_logic: 'and', min_votes: 0 },    // エンタメ
        3: { target_days: 180, filter_logic: 'and', min_votes: 0 },   // ゲーム
        4: { target_days: 180, filter_logic: 'and', min_votes: 0 },   // グルメ・レシピ
        5: { target_days: 180, filter_logic: 'and', min_votes: 0 },   // スポーツ
        6: { target_days: 3, filter_logic: 'and', min_votes: 0 },     // ファッション
        7: { target_days: 3, filter_logic: 'and', min_votes: 0 },     // 動物・ペット
        8: { target_days: 1000, filter_logic: 'and', min_votes: 400 }, // 恋愛・結婚
        9: { target_days: 3, filter_logic: 'and', min_votes: 10 },    // 政治・経済
        10: { target_days: 3, filter_logic: 'and', min_votes: 10 },   // 旅行・おでかけ
        11: { target_days: 3, filter_logic: 'and', min_votes: 0 },    // 暮らし・生活
        12: { target_days: 180, filter_logic: 'and', min_votes: 0 },  // 美容・コスメ
        13: { target_days: 10, filter_logic: 'and', min_votes: 0 },   // ニュース・話題
        14: { target_days: 180, filter_logic: 'and', min_votes: 0 },  // 雑談
        15: { target_days: 180, filter_logic: 'and', min_votes: 10 }, // 政治・野党
        16: { target_days: 180, filter_logic: 'and', min_votes: 10 }, // タレント・俳優女優
        17: { target_days: 180, filter_logic: 'and', min_votes: 10 }, // 趣味・芸能
        18: { target_days: 180, filter_logic: 'and', min_votes: 10 }, // 雑談
        19: { target_days: 180, filter_logic: 'and', min_votes: 10 }, // 住まい・不動産
        20: { target_days: 180, filter_logic: 'and', min_votes: 10 }, // 読書・映画
        21: { target_days: 180, filter_logic: 'and', min_votes: 10 }, // 民族・宗教
      };
      
      // 各カテゴリの投稿数を取得
      const categoriesWithCount = await Promise.all(
        data.map(async (category) => {
          const { count } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id)
            .in('status', ['publish', 'published']);
          
          // AI自動コメント用の設定を追加
          const settings = categorySettings[category.id] || { target_days: 3, filter_logic: 'or', min_votes: 100 };
          
          return { 
            ...category, 
            post_count: count || 0,
            target_days: settings.target_days,
            filter_logic: settings.filter_logic,
            min_votes: settings.min_votes
          };
        })
      );
      setCategories(categoriesWithCount);
    } else {
      setCategories([]);
    }
    
    setLoading(false);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      icon: category.icon || '',
      display_order: category.display_order,
      is_active: category.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      alert('名前とスラッグは必須です');
      return;
    }

    if (editingCategory) {
      // 更新
      const { error } = await supabase
        .from('categories')
        .update({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          icon: formData.icon || null,
          display_order: formData.display_order,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingCategory.id);

      if (error) {
        alert('更新に失敗しました: ' + error.message);
        return;
      }
    } else {
      // 新規作成
      const { error } = await supabase
        .from('categories')
        .insert({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          icon: formData.icon || null,
          display_order: formData.display_order,
          is_active: formData.is_active,
        });

      if (error) {
        alert('作成に失敗しました: ' + error.message);
        return;
      }
    }

    setShowModal(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      icon: '',
      display_order: 0,
      is_active: 1,
    });
    fetchCategories();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('このカテゴリを削除しますか？')) return;

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      alert('削除に失敗しました: ' + error.message);
      return;
    }

    fetchCategories();
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">カテゴリ管理</h1>
          <p className="mt-1 text-sm text-gray-600">
            相談カテゴリの管理
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/keywords"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            キーワード検索
          </Link>
          <Link
            href="/admin/ng-words"
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            NGワード管理
          </Link>
          <button
            onClick={() => {
              setEditingCategory(null);
              setFormData({
                name: '',
                slug: '',
                description: '',
                icon: '',
                display_order: 0,
                is_active: 1,
              });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + カテゴリ追加
          </button>
        </div>
      </div>

      {/* 検索 */}
      <div className="bg-white rounded-lg shadow p-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="カテゴリを検索..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      {/* カテゴリ一覧 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">読み込み中...</div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">カテゴリがありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    名前
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    スラッグ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    アイコン
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    表示順
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    投稿数
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    対象期間
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    フィルタ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    最小投票数
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    状態
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCategories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {category.id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {category.icon && (
                          <span dangerouslySetInnerHTML={{ __html: category.icon }} />
                        )}
                        <span className="font-medium text-gray-900">{category.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {category.slug}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                      {category.icon || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {category.display_order}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                      {category.post_count || 0}件
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      過去{category.target_days || 3}日間
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className={`px-2 py-1 text-xs rounded ${
                        category.filter_logic === 'or'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {category.filter_logic === 'or' ? 'OR' : 'AND'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {category.min_votes || 0}票以上
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        category.is_active === 1
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {category.is_active === 1 ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingCategory ? 'カテゴリを編集' : 'カテゴリを追加'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="アニメ・漫画"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  スラッグ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="comics"
                />
                <p className="mt-1 text-xs text-gray-500">
                  URLに使用される形式の名前です。半角小文字、英数字とハイフンのみが使われます。
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  説明
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="アニメや漫画に関する情報交換の場。おすすめ作品や名シーン、最新情報を共有しましょう！"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  アイコン
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                  placeholder='<i class="fas fa-book-open"></i>'
                />
                <p className="mt-1 text-xs text-gray-500">
                  Font AwesomeアイコンのHTMLコードを入力してください。例: &lt;i class="fas fa-heart"&gt;&lt;/i&gt;
                </p>
                {formData.icon && (
                  <div className="mt-2 p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">プレビュー: </span>
                    <span dangerouslySetInnerHTML={{ __html: formData.icon }} />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  表示順
                </label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-gray-500">
                  数字が小さいほど上に表示されます。
                </p>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active === 1}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">有効</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingCategory(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingCategory ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
