'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Article {
  feedName: string;
  title: string;
  link: string;
  pubDate: string;
  content: string;
  image: string;
  isProcessed: boolean;
}

export default function RSSArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auto-creator/fetch-rss');
      const data = await response.json();

      if (data.success) {
        setArticles(data.articles);
      } else {
        setMessage(data.error || 'RSS記事の取得に失敗しました');
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
      setMessage('RSS記事の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (article: Article) => {
    setExecuting(article.link);
    setMessage('');

    try {
      const response = await fetch('/api/auto-creator/execute-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_url: article.link,
          article_title: article.title,
          article_content: article.content,
          article_image: article.image,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ 相談を作成しました（投稿ID: ${data.post_id}）`);
        // 記事一覧を再取得
        await fetchArticles();
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      console.error('Error executing:', error);
      setMessage('❌ 実行に失敗しました');
    } finally {
      setExecuting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">RSS記事一覧</h1>
        <button
          onClick={fetchArticles}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? '取得中...' : '再取得'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">RSS記事を取得中...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    フィード名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    タイトル
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    日付
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    WordPress記事
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {articles.map((article, index) => (
                  <tr key={index} className="hover:bg-white">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {article.feedName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {article.title}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(article.pubDate).toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {article.isProcessed ? (
                        <span className="text-green-600">作成済</span>
                      ) : (
                        <span className="text-gray-400">未作成</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {article.isProcessed ? (
                        <span className="text-gray-400">実行済み</span>
                      ) : (
                        <button
                          onClick={() => handleExecute(article)}
                          disabled={executing === article.link}
                          className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:bg-gray-400"
                        >
                          {executing === article.link ? '実行中...' : 'このニュースで実行'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {articles.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">RSS記事がありません</p>
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">💡 使い方</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• RSS記事は設定されたURLから自動取得されます</li>
          <li>• 「このニュースで実行」ボタンで手動で相談を作成できます</li>
          <li>• 作成済みの記事は「作成済」と表示され、再実行できません</li>
          <li>• 「再取得」ボタンで最新のRSS記事を取得できます</li>
        </ul>
      </div>
    </div>
  );
}
