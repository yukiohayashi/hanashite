'use client';

import { useState, useEffect } from 'react';
import { Settings, Save } from 'lucide-react';

interface TaggerSettings {
  auto_tag_on_publish: boolean;
  confidence_threshold: number;
  max_keywords: number;
  max_categories: number;
}

export default function AITaggerSettingsPage() {
  const [settings, setSettings] = useState<TaggerSettings>({
    auto_tag_on_publish: false,
    confidence_threshold: 0.7,
    max_keywords: 5,
    max_categories: 1,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/ai-tagger');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/settings/ai-tagger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage('✅ 設定を保存しました');
      } else {
        setMessage('❌ 保存に失敗しました');
      }
    } catch (error) {
      setMessage('❌ エラーが発生しました');
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI自動タグ付け設定</h1>
        <p className="mt-1 text-sm text-gray-600">
          AI自動タグ付けの設定
        </p>
      </div>

      {/* API設定リンク */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          OpenAI APIキーは <a href="/admin/api-settings" className="font-medium underline hover:text-blue-600">API設定</a> で管理されています
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg ${message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            基本設定
          </h2>

          <div className="space-y-4">
            {/* 自動タグ付け */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="auto_tag"
                checked={settings.auto_tag_on_publish}
                onChange={(e) => setSettings({ ...settings, auto_tag_on_publish: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="auto_tag" className="text-sm text-gray-700">
                投稿公開時に自動的にタグ付けを実行
              </label>
            </div>

            {/* 信頼度閾値 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                信頼度閾値
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={settings.confidence_threshold}
                onChange={(e) => setSettings({ ...settings, confidence_threshold: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">
                この値以上の信頼度を持つカテゴリのみを割り当てます（0.0〜1.0）
              </p>
            </div>

            {/* 最大キーワード数 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最大キーワード数
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.max_keywords}
                onChange={(e) => setSettings({ ...settings, max_keywords: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">
                1投稿あたりに抽出する最大キーワード数（1〜10）
              </p>
            </div>

            {/* 最大カテゴリ数 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最大カテゴリ数
              </label>
              <input
                type="number"
                min="1"
                max="3"
                value={settings.max_categories}
                onChange={(e) => setSettings({ ...settings, max_categories: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">
                1投稿あたりに割り当てる最大カテゴリ数（1〜3、推奨: 1）
              </p>
            </div>
          </div>
        </div>

        {/* 保存ボタン */}
        <div className="pt-4 border-t">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? '保存中...' : '設定を保存'}
          </button>
        </div>
      </div>

      {/* 説明 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-bold text-yellow-900 mb-2">設定について</h3>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• <strong>自動タグ付け</strong>: 有効にすると、投稿公開時に自動的にカテゴリとキーワードが割り当てられます</li>
          <li>• <strong>信頼度閾値</strong>: AIが判定したカテゴリの信頼度がこの値以上の場合のみ割り当てます</li>
          <li>• <strong>最大キーワード数</strong>: 投稿から抽出するキーワードの最大数を設定します</li>
          <li>• <strong>最大カテゴリ数</strong>: 通常は1つのカテゴリのみを割り当てることを推奨します</li>
          <li>• OpenAI APIキーは <a href="/admin/api-settings" className="underline hover:text-yellow-900">API設定</a> で管理してください</li>
        </ul>
      </div>
    </div>
  );
}
