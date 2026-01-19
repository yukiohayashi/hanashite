'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/hooks/usePageTitle';

interface Settings {
  scraping_urls: string;
  execution_interval: string;
  execution_variance: string;
  no_create_start_hour: string;
  no_create_end_hour: string;
  ai_user_probability: string;
  scraping_wait_time: string;
  is_enabled: string;
  title_prompt: string;
  choices_prompt: string;
  max_categories: string;
  max_keywords: string;
  max_posts_per_execution: string;
}

export default function AutoCreatorSettings() {
  usePageTitle('AI自動投稿設定');
  
  const [settings, setSettings] = useState<Settings>({
    scraping_urls: '[]',
    execution_interval: '60',
    execution_variance: '15',
    no_create_start_hour: '0',
    no_create_end_hour: '6',
    ai_user_probability: '50',
    scraping_wait_time: '30',
    is_enabled: 'true',
    title_prompt: '',
    choices_prompt: '',
    max_categories: '1',
    max_keywords: '3',
    max_posts_per_execution: '5',
  });
  const [urls, setUrls] = useState<string[]>(['', '', '', '', '', '', '', '']);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [toggling, setToggling] = useState(false);
  const [nextRunTime, setNextRunTime] = useState<string>('');
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchNextRunTime();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('auto_creator_settings')
      .select('setting_key, setting_value');

    if (error) {
      console.error('Error fetching settings:', error);
      return;
    }

    const settingsMap: Record<string, string> = {};
    data?.forEach((setting) => {
      settingsMap[setting.setting_key] = setting.setting_value;
    });

    if (settingsMap.scraping_urls) {
      const urlsArray = JSON.parse(settingsMap.scraping_urls);
      setUrls([...urlsArray, ...Array(8 - urlsArray.length).fill('')]);
    }

    setSettings({
      scraping_urls: settingsMap.scraping_urls || '[]',
      execution_interval: settingsMap.execution_interval || '60',
      execution_variance: settingsMap.execution_variance || '15',
      no_create_start_hour: settingsMap.no_create_start_hour || '0',
      no_create_end_hour: settingsMap.no_create_end_hour || '6',
      ai_user_probability: settingsMap.ai_user_probability || '50',
      scraping_wait_time: settingsMap.scraping_wait_time || '30',
      is_enabled: settingsMap.is_enabled || 'true',
      title_prompt: settingsMap.title_prompt || '',
      choices_prompt: settingsMap.choices_prompt || '',
      max_categories: settingsMap.max_categories || '1',
      max_keywords: settingsMap.max_keywords || '3',
      max_posts_per_execution: settingsMap.max_posts_per_execution || '5',
    });
  };

  const fetchNextRunTime = async () => {
    const { data: settingsData } = await supabase
      .from('auto_creator_settings')
      .select('*');

    if (!settingsData) return;

    const settingsMap: Record<string, string> = {};
    settingsData.forEach((item) => {
      settingsMap[item.setting_key] = item.setting_value;
    });

    if (settingsMap.is_active === 'true' || settingsMap.is_enabled === 'true') {
      // データベースの設定値を使用して次回実行時刻を計算
      const now = new Date();
      const interval = parseInt(settingsMap.execution_interval || '7');
      const nextTime = new Date(now.getTime() + interval * 60 * 1000);
      
      setNextRunTime(nextTime.toLocaleString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      }));
    } else {
      setNextRunTime('');
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    setMessage('');

    try {
      const newEnabled = settings.is_enabled !== 'true';

      const response = await fetch('/api/cron/toggle-auto-creator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: newEnabled }),
      });

      const result = await response.json();

      if (result.success) {
        setSettings({ ...settings, is_enabled: newEnabled ? 'true' : 'false' });
        setMessage(result.message);
        await fetchNextRunTime();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('切り替えに失敗しました: ' + result.error);
      }
    } catch (error) {
      console.error('Toggle error:', error);
      setMessage('切り替えに失敗しました');
    } finally {
      setToggling(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const filteredUrls = urls.filter((url) => url.trim() !== '');
      const updatedSettings = {
        ...settings,
        scraping_urls: JSON.stringify(filteredUrls),
      };

      for (const [key, value] of Object.entries(updatedSettings)) {
        await supabase
          .from('auto_creator_settings')
          .update({ setting_value: value, updated_at: new Date().toISOString() })
          .eq('setting_key', key);
      }

      setMessage('設定を保存しました');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleManualExecute = async () => {
    setExecuting(true);
    setMessage('');

    try {
      const response = await fetch('/api/auto-creator/execute-auto', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ ${data.message}`);
      } else {
        setMessage(`❌ ${data.message || data.error}`);
      }
    } catch (error) {
      console.error('Error executing:', error);
      setMessage('❌ 実行に失敗しました');
    } finally {
      setExecuting(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI自動投稿 設定（CRON10分ごと）:</h1>
        <p className="mt-2 text-sm text-gray-600">
          ニュース記事から自動でアンケートを作成する設定を管理します
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('成功') || message.includes('保存しました') || message.includes('開始') || message.includes('停止')
            ? 'bg-green-50 text-green-800'
            : 'bg-red-50 text-red-800'
        }`}>
          {message}
        </div>
      )}

      {/* ステータス表示 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`text-2xl ${
                settings.is_enabled === 'true' ? 'text-green-500' : 'text-gray-400'
              }`}>●</span>
              <strong className="text-lg">RSS自動作成</strong>
            </div>
            
            <div className="border-l border-gray-300 pl-4 flex items-center gap-3">
              <strong className="text-sm">自動作成:</strong>
              {settings.is_enabled === 'true' ? (
                <span className="text-green-600 font-medium">✓ 有効</span>
              ) : (
                <span className="text-red-600 font-medium">✗ 無効</span>
              )}
              <button
                onClick={handleToggle}
                disabled={toggling}
                className={`px-4 py-1 rounded text-sm font-medium text-white ${
                  settings.is_enabled === 'true'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-500 hover:bg-green-600'
                } disabled:bg-gray-400`}
              >
                {toggling ? '処理中...' : (settings.is_enabled === 'true' ? '⏸ 停止' : '▶ 開始')}
              </button>
            </div>

            <div className="border-l border-gray-300 pl-4">
              <strong className="text-sm">間隔:</strong>
              <span className="ml-2 text-sm">
                {settings.execution_interval}分
                {settings.execution_variance !== '0' && `±${settings.execution_variance}分`}
              </span>
            </div>

            {settings.is_enabled === 'true' && nextRunTime && (
              <div className="border-l border-gray-300 pl-4">
                <strong className="text-sm">次回実行（推定）:</strong>
                <span className="ml-2 text-sm text-blue-600 font-medium">{nextRunTime}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 space-y-6">

          {/* API設定リンク */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              OpenAI APIキーは <a href="/admin/api-settings" className="font-medium underline hover:text-blue-600">API設定</a> で管理されています
            </p>
          </div>

          {/* スクレイピングURL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              スクレイピング対象URL（最大8個）
            </label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {urls.map((url, index) => (
                <input
                  key={index}
                  type="url"
                  value={url}
                  onChange={(e) => handleUrlChange(index, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder={`URL ${index + 1}`}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              RSS/Atom、Yahoo!ニュースなど
            </p>
          </div>

          {/* 実行間隔設定 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="execution_interval" className="block text-sm font-medium text-gray-700 mb-1">
                実行間隔（分）
              </label>
              <input
                type="number"
                id="execution_interval"
                value={settings.execution_interval}
                onChange={(e) => setSettings({ ...settings, execution_interval: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="1440"
              />
              <p className="mt-1 text-xs text-gray-500">1～1440分（1～24時間）</p>
            </div>

            <div>
              <label htmlFor="execution_variance" className="block text-sm font-medium text-gray-700 mb-1">
                実行ゆらぎ（分）
              </label>
              <input
                type="number"
                id="execution_variance"
                value={settings.execution_variance}
                onChange={(e) => setSettings({ ...settings, execution_variance: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="60"
              />
              <p className="mt-1 text-xs text-gray-500">±0～60分</p>
            </div>

            <div>
              <label htmlFor="no_create_start_hour" className="block text-sm font-medium text-gray-700 mb-1">
                作成しない開始時刻
              </label>
              <select
                id="no_create_start_hour"
                value={settings.no_create_start_hour}
                onChange={(e) => setSettings({ ...settings, no_create_start_hour: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i}時</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="no_create_end_hour" className="block text-sm font-medium text-gray-700 mb-1">
                作成しない終了時刻
              </label>
              <select
                id="no_create_end_hour"
                value={settings.no_create_end_hour}
                onChange={(e) => setSettings({ ...settings, no_create_end_hour: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i}時</option>
                ))}
              </select>
            </div>
          </div>

          {/* その他の設定 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="ai_user_probability" className="block text-sm font-medium text-gray-700 mb-2">
                AI会員使用確率（%）
              </label>
              <input
                type="number"
                id="ai_user_probability"
                value={settings.ai_user_probability}
                onChange={(e) => setSettings({ ...settings, ai_user_probability: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="100"
              />
              <p className="mt-1 text-xs text-gray-500">
                0%: 編集者のみ、100%: AI会員のみ
              </p>
            </div>

            <div>
              <label htmlFor="max_posts_per_execution" className="block text-sm font-medium text-gray-700 mb-2">
                実行ごとの最大投稿数
              </label>
              <input
                type="number"
                id="max_posts_per_execution"
                value={settings.max_posts_per_execution}
                onChange={(e) => setSettings({ ...settings, max_posts_per_execution: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="10"
              />
              <p className="mt-1 text-xs text-gray-500">
                1回の実行で作成する最大投稿数（1〜10件）
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="scraping_wait_time" className="block text-sm font-medium text-gray-700 mb-2">
                スクレイピング待機時間（秒）
              </label>
              <input
                type="number"
                id="scraping_wait_time"
                value={settings.scraping_wait_time}
                onChange={(e) => setSettings({ ...settings, scraping_wait_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="10"
                max="300"
              />
              <p className="mt-1 text-xs text-gray-500">
                各URL間の待機時間
              </p>
            </div>

            <div>
              <label htmlFor="max_categories" className="block text-sm font-medium text-gray-700 mb-2">
                最大カテゴリ数
              </label>
              <input
                type="number"
                id="max_categories"
                value={settings.max_categories}
                onChange={(e) => setSettings({ ...settings, max_categories: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="5"
              />
              <p className="mt-1 text-xs text-gray-500">1投稿あたりの最大カテゴリ数</p>
            </div>

            <div>
              <label htmlFor="max_keywords" className="block text-sm font-medium text-gray-700 mb-2">
                最大キーワード数
              </label>
              <input
                type="number"
                id="max_keywords"
                value={settings.max_keywords}
                onChange={(e) => setSettings({ ...settings, max_keywords: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="10"
              />
              <p className="mt-1 text-xs text-gray-500">1投稿あたりの最大キーワード数（手動投稿と同じルール）</p>
            </div>
          </div>

          {/* ChatGPTプロンプト設定 */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">ChatGPTプロンプト設定</h3>
            
            {/* タイトル生成プロンプト */}
            <div className="mb-6">
              <label htmlFor="title_prompt" className="block text-sm font-medium text-gray-700 mb-2">
                タイトル生成プロンプト
              </label>
              <textarea
                id="title_prompt"
                value={settings.title_prompt}
                onChange={(e) => setSettings({ ...settings, title_prompt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={10}
                placeholder="記事の内容に基づいた簡潔なアンケート質問を1つ作成してください。"
              />
              <p className="mt-1 text-xs text-gray-500">
                ChatGPTがアンケートタイトルを生成する際のプロンプト（禁止ワード、推奨形式などを指定）
              </p>
            </div>

            {/* 選択肢生成プロンプト */}
            <div>
              <label htmlFor="choices_prompt" className="block text-sm font-medium text-gray-700 mb-2">
                選択肢生成プロンプト
              </label>
              <textarea
                id="choices_prompt"
                value={settings.choices_prompt}
                onChange={(e) => setSettings({ ...settings, choices_prompt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={10}
                placeholder="質問に対する選択肢を2〜4個作成してください。"
              />
              <p className="mt-1 text-xs text-gray-500">
                ChatGPTが投票選択肢を生成する際のプロンプト（トピック別ガイドラインなどを指定）
              </p>
            </div>
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

      {/* 注意事項 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-yellow-800 mb-2">⚠️ 注意事項</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• OpenAI APIキーは <a href="/admin/api-settings" className="underline hover:text-yellow-900">API設定</a> で管理してください</li>
          <li>• 実行間隔は最短1分、最長24時間です</li>
          <li>• スクレイピングは各サイトの利用規約を遵守してください</li>
          <li>• 自動実行はカゴヤVPSのcrontabで動作します</li>
          <li>• 開始/停止ボタンでCRON実行を制御できます</li>
        </ul>
      </div>
    </div>
  );
}
