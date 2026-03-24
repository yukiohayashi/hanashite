'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Post {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export default function CommentTestSection() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [executing, setExecuting] = useState(false);
  const [executingReply, setExecutingReply] = useState(false);
  const [message, setMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [commentPrompt, setCommentPrompt] = useState('');
  const [savingPrompt, setSavingPrompt] = useState(false);

  useEffect(() => {
    fetchPosts();
    fetchCommentPrompt();
  }, []);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('id, title, content, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) {
      setPosts(data);
      // 最初の投稿を自動選択
      if (data.length > 0) {
        setSelectedPost(data[0]);
      }
    }
  };

  const fetchCommentPrompt = async () => {
    const { data } = await supabase
      .from('auto_commenter_liker_settings')
      .select('setting_value')
      .eq('setting_key', 'comment_prompt')
      .maybeSingle();
    
    if (data) {
      setCommentPrompt(data.setting_value);
    }
  };

  const executeComment = async () => {
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
          post_id: selectedPost.id,
          action_type: 'comment',
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

  const executeAuthorReply = async () => {
    if (!selectedPost) {
      setMessage('投稿を選択してください');
      return;
    }

    setExecutingReply(true);
    setMessage('');

    try {
      const response = await fetch('/api/auto-voter/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_id: selectedPost.id,
          action_type: 'author_reply',
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
    } finally {
      setExecutingReply(false);
    }
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4 mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧪</span>
          <h2 className="text-lg font-bold text-gray-900">AIコメント生成テスト</h2>
        </div>
        <span className="text-gray-500">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          {/* 左側: AIコメント生成テスト */}
          <div className="space-y-4">
          {message && (
            <div className={`p-3 rounded-lg ${
              message.includes('✅')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          {/* 投稿検索 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">投稿を検索</h3>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="タイトルで検索..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          {/* 投稿選択 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">投稿を選択</h3>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredPosts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedPost?.id === post.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <h4 className="font-medium text-gray-900 text-sm mb-1">{post.title}</h4>
                  <p className="text-xs text-gray-500">ID: {post.id}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 選択中の投稿 */}
          {selectedPost && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">選択中の投稿</h3>
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-bold text-gray-900 mb-2 text-sm">{selectedPost.title}</h4>
                <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-3">{selectedPost.content}</p>
                <p className="text-xs text-gray-400 mt-2">投稿ID: {selectedPost.id}</p>
              </div>
            </div>
          )}

          {/* 実行ボタン */}
          <div className="space-y-2">
            <button
              onClick={executeComment}
              disabled={executing || !selectedPost}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium"
            >
              {executing ? 'コメント生成中...' : '💬 コメントを生成'}
            </button>
            <button
              onClick={executeAuthorReply}
              disabled={executingReply || !selectedPost}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 font-medium"
            >
              {executingReply ? '投稿者返信生成中...' : '👤 投稿者返信を生成'}
            </button>
          </div>
          </div>

          {/* 右側: AIコメント生成プロンプト */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">🤖 AIコメント生成プロンプト</h3>
                <button
                  onClick={async () => {
                    setSavingPrompt(true);
                    try {
                      const { error } = await supabase
                        .from('auto_commenter_liker_settings')
                        .update({ setting_value: commentPrompt })
                        .eq('setting_key', 'comment_prompt');
                      
                      if (error) {
                        console.error('プロンプト保存エラー:', error);
                        setMessage(`❌ 保存に失敗しました: ${error.message}`);
                      } else {
                        setMessage('✅ プロンプトを保存しました');
                        setTimeout(() => setMessage(''), 3000);
                      }
                    } catch (error) {
                      console.error('プロンプト保存エラー:', error);
                      setMessage('❌ 保存に失敗しました');
                    } finally {
                      setSavingPrompt(false);
                    }
                  }}
                  disabled={savingPrompt}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {savingPrompt ? '保存中...' : '保存'}
                </button>
              </div>
              <textarea
                value={commentPrompt}
                onChange={(e) => setCommentPrompt(e.target.value)}
                className="w-full h-96 p-3 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                placeholder="AIコメント生成プロンプトを入力してください"
              />
            </div>

            {/* 投稿者返信プロンプト */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">👤 投稿者返信プロンプト（読み取り専用）</h3>
              <div className="bg-gray-50 rounded-lg p-3">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">{`あなたは投稿者として、コメントに対して返信してください。

投稿タイトル: {投稿タイトル}
コメント: {選択されたコメント内容}

【返信ルール】
- **口調**: 常に丁寧語（ですます調）を使用
- **文字数**: 20〜40文字
- **内容のバリエーション**:
  - 共感を示す（「そうですよね」「本当にそう思います」）
  - 気づきを得た（「確かに、日中の方が冷静に話せそうですね」）
  - 参考になった（「参考になります」「その視点は考えていませんでした」）
  - たまに感謝の気持ち（5回に1回程度「ありがとうございます」を含める）
- **禁止事項**: 
  - 「コメントありがとうございます」を毎回使わない
  - 過度な感謝表現を避ける

【返信例】
- そうですよね。日中の方が冷静に話せそうです。
- 確かに、日中の方がお互い落ち着いて話せますね。
- その視点は考えていませんでした。参考になります。
- 本当にそう思います。夜は感情的になりがちですよね。
- ありがとうございます。日中に話してみます。`}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
