'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface NGWord {
  id: number;
  word: string;
  word_type: string;
  severity: string;
  is_active: boolean;
  created_at: string;
}

export default function NGWordsPage() {
  const [ngWords, setNgWords] = useState<NGWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWord, setNewWord] = useState({
    word: '',
    word_type: 'exact',
    severity: 'medium',
    is_active: true,
  });

  const fetchNGWords = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('keyword_search_ng_words')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setNgWords(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNGWords();
  }, []);

  const handleAddWord = async () => {
    if (!newWord.word.trim()) {
      alert('NGワードを入力してください');
      return;
    }

    const { error } = await supabase.from('keyword_search_ng_words').insert({
      word: newWord.word,
      word_type: newWord.word_type,
      severity: newWord.severity,
      is_active: newWord.is_active,
    });

    if (error) {
      alert('追加に失敗しました: ' + error.message);
      return;
    }

    setShowAddModal(false);
    setNewWord({
      word: '',
      word_type: 'exact',
      severity: 'medium',
      is_active: true,
    });
    fetchNGWords();
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    const { error } = await supabase
      .from('keyword_search_ng_words')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      alert('更新に失敗しました');
      return;
    }

    fetchNGWords();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('このNGワードを削除しますか？')) return;

    const { error } = await supabase
      .from('keyword_search_ng_words')
      .delete()
      .eq('id', id);

    if (error) {
      alert('削除に失敗しました');
      return;
    }

    fetchNGWords();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">NGワード管理</h1>
          <p className="mt-1 text-sm text-gray-600">
            検索で使用できないワードの管理
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + NGワード追加
        </button>
      </div>

      {/* NGワード一覧 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">読み込み中...</div>
        ) : ngWords.length === 0 ? (
          <div className="p-8 text-center text-gray-500">NGワードがありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ワード
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    タイプ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    重要度
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
                {ngWords.map((word) => (
                  <tr key={word.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{word.word}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {word.word_type === 'exact' ? '完全一致' : '部分一致'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          word.severity === 'high'
                            ? 'bg-red-100 text-red-800'
                            : word.severity === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {word.severity === 'high' ? '高' : word.severity === 'medium' ? '中' : '低'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(word.id, word.is_active)}
                        className={`px-2 py-1 text-xs rounded ${
                          word.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {word.is_active ? '有効' : '無効'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleDelete(word.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">NGワード追加</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NGワード *
                </label>
                <input
                  type="text"
                  value={newWord.word}
                  onChange={(e) => setNewWord({ ...newWord, word: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="例: 不適切な言葉"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  マッチタイプ
                </label>
                <select
                  value={newWord.word_type}
                  onChange={(e) => setNewWord({ ...newWord, word_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="exact">完全一致</option>
                  <option value="partial">部分一致</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  重要度
                </label>
                <select
                  value={newWord.severity}
                  onChange={(e) => setNewWord({ ...newWord, severity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={newWord.is_active}
                  onChange={(e) => setNewWord({ ...newWord, is_active: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700">有効</label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddWord}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                追加
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
