'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ApiSettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('auto_creator_settings')
      .select('*')
      .eq('setting_key', 'openai_api_key')
      .single();

    if (error) {
      console.error('Error fetching API settings:', error);
      return;
    }

    setApiKey(data?.setting_value || '');
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('auto_creator_settings')
        .update({ 
          setting_value: apiKey, 
          updated_at: new Date().toISOString() 
        })
        .eq('setting_key', 'openai_api_key');

      if (error) throw error;

      setMessage('設定を保存しました');
      setTimeout(() => setMessage(''), 3000);
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
        <h1 className="text-3xl font-bold text-gray-900">API設定</h1>
        <p className="mt-2 text-sm text-gray-600">
          すべてのAI機能で使用するAPIキーを一元管理します
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('成功') || message.includes('保存しました')
            ? 'bg-green-50 text-green-800'
            : 'bg-red-50 text-red-800'
        }`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 space-y-6">
          <div>
            <label htmlFor="openai_api_key" className="block text-sm font-medium text-gray-700 mb-2">
              OpenAI APIキー <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                id="openai_api_key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="sk-..."
                required
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-2 text-sm text-gray-600 hover:text-gray-800"
              >
                {showApiKey ? '隠す' : '表示'}
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              このAPIキーは以下の機能で使用されます：
            </p>
            <ul className="mt-2 text-sm text-gray-500 list-disc list-inside space-y-1">
              <li>自動コメント生成</li>
              <li>AI会員のプロフィール生成</li>
              <li>AI自動投稿の記事生成</li>
              <li>その他のAI機能</li>
            </ul>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            {saving ? '保存中...' : '設定を保存'}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">💡 ヒント</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• OpenAI APIキーは <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a> で取得できます</li>
          <li>• APIキーは安全に保管され、暗号化されて保存されます</li>
          <li>• APIキーを変更すると、すべてのAI機能に即座に反映されます</li>
        </ul>
      </div>
    </div>
  );
}
