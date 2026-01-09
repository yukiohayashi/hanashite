'use client';

import { useState, useEffect } from 'react';

export default function LikesSettingsPage() {
  const [settings, setSettings] = useState({
    postPoints: 2,
    commentPoints: 1,
    rankingPeriod: 24,
    requireLogin: false,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // 設定を読み込む
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/likes/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/likes/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('設定を保存しました');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || '保存に失敗しました');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">いいね設定</h1>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.includes('成功') || message.includes('保存しました') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">ポイント設定</h2>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label htmlFor="postPoints" className="block text-sm font-medium text-gray-700 mb-2">
              投稿へのいいねポイント
            </label>
            <input
              type="number"
              id="postPoints"
              value={settings.postPoints}
              onChange={(e) => setSettings({ ...settings, postPoints: parseInt(e.target.value) })}
              min="0"
              max="100"
              className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-2 text-sm text-gray-500">
              投稿にいいねされた時に投稿者に付与するポイント数
            </p>
          </div>

          <div>
            <label htmlFor="commentPoints" className="block text-sm font-medium text-gray-700 mb-2">
              コメントへのいいねポイント
            </label>
            <input
              type="number"
              id="commentPoints"
              value={settings.commentPoints}
              onChange={(e) => setSettings({ ...settings, commentPoints: parseInt(e.target.value) })}
              min="0"
              max="100"
              className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-2 text-sm text-gray-500">
              コメントにいいねされた時にコメント投稿者に付与するポイント数
            </p>
          </div>

          <div>
            <label htmlFor="rankingPeriod" className="block text-sm font-medium text-gray-700 mb-2">
              ランキング集計期間
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="rankingPeriod"
                value={settings.rankingPeriod}
                onChange={(e) => setSettings({ ...settings, rankingPeriod: parseInt(e.target.value) })}
                min="1"
                max="365"
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">時間</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              コメントいいねランキングの集計期間（推奨: 24時間）
            </p>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.requireLogin}
                onChange={(e) => setSettings({ ...settings, requireLogin: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                ログイン必須
              </span>
            </label>
            <p className="mt-2 text-sm text-gray-500">
              有効にすると、ログインしていないユーザーはいいねできなくなります。<br />
              無効（デフォルト）の場合、ゲストユーザーもいいねできます。
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            {saving ? '保存中...' : '設定を保存'}
          </button>
        </div>
      </form>

      {/* データ管理 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">データ管理</h2>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">いいね数の再計算</h3>
            <p className="text-sm text-gray-500 mb-4">
              いいね数の集計テーブルを再計算します。<br />
              データに不整合がある場合に実行してください。
            </p>
            <button
              type="button"
              onClick={() => alert('再計算機能は準備中です')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
            >
              再計算を実行
            </button>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">データのエクスポート</h3>
            <p className="text-sm text-gray-500 mb-4">
              いいねデータをCSV形式でエクスポートします。
            </p>
            <button
              type="button"
              onClick={() => alert('エクスポート機能は準備中です')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
            >
              CSVエクスポート
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
