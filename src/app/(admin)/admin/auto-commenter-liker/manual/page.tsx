'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Post {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export default function AutoVoterManual() {
  const [latestPost, setLatestPost] = useState<Post | null>(null);
  const [executing, setExecuting] = useState(false);
  const [message, setMessage] = useState('');
  const [generatedComment, setGeneratedComment] = useState('');

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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">コメント生成テスト</h1>
        <p className="mt-1 text-sm text-gray-600">
          最新投稿に対するAIコメント生成をテストします
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

      {/* 対象投稿 */}
      {latestPost && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-2">対象投稿（最新）</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-2">{latestPost.title}</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{latestPost.content}</p>
            <p className="text-xs text-gray-400 mt-2">投稿ID: {latestPost.id}</p>
          </div>
        </div>
      )}

      {/* 実行ボタン */}
      <div className="bg-white rounded-lg shadow p-4">
        <button
          onClick={executeComment}
          disabled={executing || !latestPost}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium text-lg"
        >
          {executing ? 'コメント生成中...' : '💬 コメントを生成'}
        </button>
      </div>

      {/* 生成されたコメント */}
      {generatedComment && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-2">生成されたコメント</h2>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-gray-900 whitespace-pre-wrap">{generatedComment}</p>
          </div>
        </div>
      )}
    </div>
  );
}
