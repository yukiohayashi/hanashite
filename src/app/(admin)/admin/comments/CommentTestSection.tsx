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
  const [latestPost, setLatestPost] = useState<Post | null>(null);
  const [executing, setExecuting] = useState(false);
  const [message, setMessage] = useState('');
  const [generatedComment, setGeneratedComment] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchLatestPost();
  }, []);

  const fetchLatestPost = async () => {
    const { data } = await supabase
      .from('posts')
      .select('id, title, content, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setLatestPost(data);
    }
  };

  const executeComment = async () => {
    if (!latestPost) {
      setMessage('投稿が見つかりません');
      return;
    }

    setExecuting(true);
    setMessage('');
    setGeneratedComment('');

    try {
      const response = await fetch('/api/auto-voter/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_id: latestPost.id,
          action_type: 'comment',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`✅ ${result.message}`);
        if (result.comment) {
          setGeneratedComment(result.comment);
        }
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
        <div className="mt-4 space-y-4">
          {message && (
            <div className={`p-3 rounded-lg ${
              message.includes('✅')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          {/* 対象投稿 */}
          {latestPost && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">対象投稿（最新）</h3>
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-bold text-gray-900 mb-2 text-sm">{latestPost.title}</h4>
                <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-3">{latestPost.content}</p>
                <p className="text-xs text-gray-400 mt-2">投稿ID: {latestPost.id}</p>
              </div>
            </div>
          )}

          {/* 実行ボタン */}
          <button
            onClick={executeComment}
            disabled={executing || !latestPost}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            {executing ? 'コメント生成中...' : '💬 コメントを生成'}
          </button>

          {/* 生成されたコメント */}
          {generatedComment && (
            <div className="bg-white rounded-lg border border-blue-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">生成されたコメント</h3>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-gray-900 whitespace-pre-wrap text-sm">{generatedComment}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
