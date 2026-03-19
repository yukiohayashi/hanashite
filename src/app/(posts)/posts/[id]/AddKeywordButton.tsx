'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AddKeywordButtonProps {
  postId: number;
  isAdmin: boolean;
}

export default function AddKeywordButton({ postId, isAdmin }: AddKeywordButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [description, setDescription] = useState('');
  const [keywordType, setKeywordType] = useState('tag');
  const [loading, setLoading] = useState(false);

  if (!isAdmin) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // キーワードを作成または取得
      const { data: existingKeyword } = await supabase
        .from('keywords')
        .select('id')
        .eq('keyword', keyword)
        .single();

      let keywordId: number;

      if (existingKeyword) {
        keywordId = existingKeyword.id;
      } else {
        const { data: newKeyword, error: keywordError } = await supabase
          .from('keywords')
          .insert({
            keyword,
            description,
            keyword_type: keywordType,
          })
          .select('id')
          .single();

        if (keywordError) throw keywordError;
        keywordId = newKeyword.id;
      }

      // 投稿とキーワードを関連付け
      const { error: linkError } = await supabase
        .from('post_keywords')
        .insert({
          post_id: postId,
          keyword_id: keywordId,
        });

      if (linkError) throw linkError;

      alert('キーワードを追加しました');
      setShowModal(false);
      setKeyword('');
      setDescription('');
      setKeywordType('tag');
      window.location.reload();
    } catch (error) {
      console.error('Error adding keyword:', error);
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      alert(`キーワードの追加に失敗しました: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="ml-2 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
      >
        ワード追加
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">キーワード追加</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  キーワード <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="例: 政治"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  説明
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="キーワードの説明"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  タイプ
                </label>
                <select
                  value={keywordType}
                  onChange={(e) => setKeywordType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="tag">タグ</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading || !keyword}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? '追加中...' : '追加'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setKeyword('');
                    setDescription('');
                    setKeywordType('tag');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
