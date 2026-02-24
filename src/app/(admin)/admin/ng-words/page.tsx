'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface NgWord {
  id: number;
  word: string;
  word_type: string;
  severity: number;
  category: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export default function NgWordsPage() {
  const [ngWords, setNgWords] = useState<NgWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingWord, setEditingWord] = useState<NgWord | null>(null);
  const [formData, setFormData] = useState({
    word: '',
    word_type: 'partial',
    severity: 'warn',
    category: '',
    is_active: 1,
  });

  useEffect(() => {
    fetchNgWords();
  }, []);

  const fetchNgWords = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ng_words')
      .select('*')
      .order('id', { ascending: false });

    setNgWords(data || []);
    setLoading(false);
  };

  const handleEdit = (word: NgWord) => {
    setEditingWord(word);
    const severityString = word.severity === 1 ? 'block' : word.severity === 2 ? 'warn' : 'log';
    setFormData({
      word: word.word,
      word_type: word.word_type,
      severity: severityString,
      category: word.category || '',
      is_active: word.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.word.trim()) {
      alert('NGワードを入力してください');
      return;
    }

    const severityValue = formData.severity === 'block' ? 1 : formData.severity === 'warn' ? 2 : 3;

    if (editingWord) {
      const { error } = await supabase
        .from('ng_words')
        .update({
          word: formData.word,
          word_type: formData.word_type,
          severity: severityValue,
          category: formData.category || null,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingWord.id);

      if (error) {
        alert('更新に失敗しました: ' + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from('ng_words')
        .insert({
          word: formData.word,
          word_type: formData.word_type,
          severity: severityValue,
          category: formData.category || null,
          is_active: formData.is_active,
        });

      if (error) {
        alert('作成に失敗しました: ' + error.message);
        return;
      }
    }

    setShowModal(false);
    setEditingWord(null);
    setFormData({
      word: '',
      word_type: 'partial',
      severity: 'warn',
      category: '',
      is_active: 1,
    });
    fetchNgWords();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('このNGワードを削除しますか？')) return;

    const { error } = await supabase
      .from('ng_words')
      .delete()
      .eq('id', id);

    if (error) {
      alert('削除に失敗しました: ' + error.message);
      return;
    }

    fetchNgWords();
  };

  const filteredWords = ngWords.filter((word) => {
    const matchSearch = word.word.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = filterCategory === 'all' || word.category === filterCategory;
    const severityString = word.severity === 1 ? 'block' : word.severity === 2 ? 'warn' : 'log';
    const matchSeverity = filterSeverity === 'all' || severityString === filterSeverity;
    return matchSearch && matchCategory && matchSeverity;
  });

  const categories = [...new Set(ngWords.map(w => w.category).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">NGワード管理</h1>
          <p className="mt-1 text-sm text-gray-600">
            検索・投稿で使用できないワードの管理
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/keywords"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            ← キーワード検索
          </Link>
          <button
            onClick={() => {
              setEditingWord(null);
              setFormData({
                word: '',
                word_type: 'partial',
                severity: 'warn',
                category: '',
                is_active: 1,
              });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + NGワード追加
          </button>
        </div>
      </div>

      {/* フィルター */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              検索
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="NGワードを検索..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              カテゴリ
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">すべて</option>
              {categories.map((cat) => (
                <option key={cat} value={cat || ''}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              重要度
            </label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">すべて</option>
              <option value="block">ブロック</option>
              <option value="warn">警告</option>
            </select>
          </div>
        </div>
      </div>

      {/* NGワード一覧 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">読み込み中...</div>
        ) : filteredWords.length === 0 ? (
          <div className="p-8 text-center text-gray-500">NGワードがありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    NGワード
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    マッチタイプ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    重要度
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    カテゴリ
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
                {filteredWords.map((word) => (
                  <tr key={word.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {word.id}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{word.word}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        word.word_type === 'exact'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {word.word_type === 'exact' ? '完全一致' : '部分一致'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        word.severity === 1
                          ? 'bg-red-100 text-red-800'
                          : word.severity === 2
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {word.severity === 1 ? 'ブロック' : word.severity === 2 ? '警告' : 'ログ'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {word.category || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        word.is_active === 1
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {word.is_active === 1 ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(word)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(word.id)}
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
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h2 className="text-xl font-bold mb-4">
              {editingWord ? 'NGワードを編集' : 'NGワードを追加'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NGワード <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.word}
                  onChange={(e) => setFormData({ ...formData, word: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="例: 殺す"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  マッチタイプ
                </label>
                <select
                  value={formData.word_type}
                  onChange={(e) => setFormData({ ...formData, word_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="partial">部分一致</option>
                  <option value="exact">完全一致</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  重要度
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="warn">警告</option>
                  <option value="block">ブロック</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  カテゴリ
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="例: 暴力、性的、侮辱"
                />
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
                  setEditingWord(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingWord ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
