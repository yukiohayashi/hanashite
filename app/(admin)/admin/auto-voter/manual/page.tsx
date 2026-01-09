'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Post {
  id: number;
  title: string;
  created_at: string;
}

export default function AutoVoterManual() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<number | null>(null);
  const [executing, setExecuting] = useState(false);
  const [message, setMessage] = useState('');
  const [actionType, setActionType] = useState<'vote' | 'comment' | 'reply' | 'like_post' | 'like_comment'>('comment');

  useEffect(() => {
    fetchRecentPosts();
  }, []);

  const fetchRecentPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('id, title, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setPosts(data);
    }
  };

  const executeAction = async () => {
    if (!selectedPost) {
      setMessage('投稿を選択してください');
      return;
    }

    setExecuting(true);
    setMessage('');

    try {
      const response = await fetch('/api/auto-voter/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_id: selectedPost,
          action_type: actionType,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`✅ ${result.message}`);
      } else {
        setMessage(`❌ エラー: ${result.error}`);
      }
    } catch (error) {
      setMessage('❌ 実行に失敗しました');
      console.error('Error:', error);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">手動実行</h1>
        <p className="mt-1 text-sm text-gray-600">
          投票・コメント・返信・いいね機能のテスト実行
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg ${
          message.includes('✅')
            ? 'bg-green-50 text-green-800'
            : 'bg-red-50 text-red-800'
        }`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        {/* アクション選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            実行するアクション
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <button
              onClick={() => setActionType('vote')}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                actionType === 'vote'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">🗳️</div>
                <div className="text-sm font-medium">投票</div>
              </div>
            </button>

            <button
              onClick={() => setActionType('comment')}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                actionType === 'comment'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">💬</div>
                <div className="text-sm font-medium">コメント</div>
              </div>
            </button>

            <button
              onClick={() => setActionType('reply')}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                actionType === 'reply'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">↩️</div>
                <div className="text-sm font-medium">返信</div>
              </div>
            </button>

            <button
              onClick={() => setActionType('like_post')}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                actionType === 'like_post'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">❤️</div>
                <div className="text-sm font-medium">投稿いいね</div>
              </div>
            </button>

            <button
              onClick={() => setActionType('like_comment')}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                actionType === 'like_comment'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">👍</div>
                <div className="text-sm font-medium">コメントいいね</div>
              </div>
            </button>
          </div>
        </div>

        {/* 投稿選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            対象投稿を選択
          </label>
          <select
            value={selectedPost || ''}
            onChange={(e) => setSelectedPost(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">投稿を選択してください</option>
            {posts.map((post) => (
              <option key={post.id} value={post.id}>
                {post.title} (ID: {post.id})
              </option>
            ))}
          </select>
        </div>

        {/* 実行ボタン */}
        <div>
          <button
            onClick={executeAction}
            disabled={executing || !selectedPost}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium text-lg"
          >
            {executing ? '実行中...' : `${getActionLabel(actionType)}を実行`}
          </button>
        </div>
      </div>

      {/* 説明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">📝 アクション説明</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>投票</strong>: ランダムな選択肢に投票します</li>
          <li>• <strong>コメント</strong>: ChatGPTでコメントを生成して投稿します（投票も含む）</li>
          <li>• <strong>返信</strong>: 既存のコメントに対してChatGPTで返信を生成します</li>
          <li>• <strong>投稿いいね</strong>: 投稿にいいねを追加します</li>
          <li>• <strong>コメントいいね</strong>: ランダムなコメントにいいねを追加します</li>
        </ul>
      </div>

      {/* 注意事項 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-yellow-800 mb-2">⚠️ 注意事項</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• OpenAI APIキーが設定されている必要があります</li>
          <li>• コメント・返信はChatGPTで自動生成されます</li>
          <li>• ランダムなAI会員または編集者が選択されます</li>
          <li>• 実行結果は実行履歴に記録されます</li>
        </ul>
      </div>
    </div>
  );
}

function getActionLabel(actionType: string): string {
  switch (actionType) {
    case 'vote':
      return '投票';
    case 'comment':
      return 'コメント投稿';
    case 'reply':
      return '返信';
    case 'like_post':
      return '投稿いいね';
    case 'like_comment':
      return 'コメントいいね';
    default:
      return '実行';
  }
}
