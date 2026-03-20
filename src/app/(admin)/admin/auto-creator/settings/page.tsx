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
  enabled: string;
  choices_prompt: string;
  max_categories: string;
  max_keywords: string;
  max_posts_per_execution: string;
  max_scraping_items: string;
  last_executed_at?: string;
}

interface CategoryWeight {
  [key: string]: number;
}

export default function AutoCreatorSettings() {
  usePageTitle('AI自動投稿設定');
  
  const [settings, setSettings] = useState<Settings>({
    scraping_urls: '',
    execution_interval: '60',
    execution_variance: '15',
    no_create_start_hour: '0',
    no_create_end_hour: '6',
    ai_user_probability: '100',
    scraping_wait_time: '3',
    enabled: 'false',
    choices_prompt: '',
    max_categories: '3',
    max_keywords: '5',
    max_posts_per_execution: '1',
    max_scraping_items: '20',
  });
  const [urls, setUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [toggling, setToggling] = useState(false);
  const [nextRunTime, setNextRunTime] = useState<string>('');
  const [executing, setExecuting] = useState(false);
  const [lastExecutedAt, setLastExecutedAt] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState<string>('');
  const [categoryWeights, setCategoryWeights] = useState<CategoryWeight>({});
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    fetchCategories();
    fetchSettings();
    fetchNextRunTime();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('id');

    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }

    if (data) {
      setCategories(data);
    }
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('auto_creator_settings')
      .select('*');

    if (error) {
      console.error('Error fetching settings:', error);
      return;
    }

    const settingsMap: Record<string, string> = {};
    data?.forEach((item) => {
      settingsMap[item.setting_key] = item.setting_value;
    });

    console.log('Settings map:', settingsMap);
    console.log('scraping_urls value:', settingsMap.scraping_urls);

    // スクレイピングURLリストを取得
    let urlsArray: string[] = [];
    try {
      urlsArray = settingsMap.scraping_urls ? JSON.parse(settingsMap.scraping_urls) : [];
      console.log('Parsed URLs:', urlsArray);
    } catch (e) {
      console.error('Failed to parse scraping_urls:', e);
      urlsArray = [];
    }
    setUrls(urlsArray.length > 0 ? urlsArray : []);

    // カテゴリウェイトを取得（存在しない場合は空オブジェクト）
    try {
      setCategoryWeights(settingsMap.category_weights ? JSON.parse(settingsMap.category_weights) : {});
    } catch {
      setCategoryWeights({});
    }

    setSettings({
      scraping_urls: JSON.stringify(urlsArray),
      execution_interval: settingsMap.interval || '60',
      execution_variance: settingsMap.interval_variance || '15',
      no_create_start_hour: settingsMap.no_create_start_hour || '0',
      no_create_end_hour: settingsMap.no_create_end_hour || '6',
      ai_user_probability: settingsMap.ai_user_probability || '50',
      scraping_wait_time: settingsMap.scraping_wait_time || '30',
      enabled: settingsMap.enabled || 'false',
      choices_prompt: settingsMap.content_prompt || '',
      max_categories: settingsMap.max_categories || '1',
      max_keywords: settingsMap.max_keywords || '3',
      max_posts_per_execution: settingsMap.max_posts_per_execution || '5',
      max_scraping_items: settingsMap.max_scraping_items || '20',
      last_executed_at: settingsMap.last_executed_at || '',
    });

    // 次回実行時刻を取得
    if (settingsMap.enabled === 'true') {
      if (settingsMap.last_executed_at) {
        setLastExecutedAt(settingsMap.last_executed_at);
        updateElapsedTime(settingsMap.last_executed_at);
      }
      
      // next_execution_timeを計算
      if (settingsMap.last_executed_at && settingsMap.interval) {
        const lastExec = new Date(settingsMap.last_executed_at);
        const intervalMinutes = parseInt(settingsMap.interval || '60');
        const nextExec = new Date(lastExec.getTime() + intervalMinutes * 60 * 1000);
        setNextRunTime(nextExec.toLocaleString('ja-JP', { 
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit', 
          minute: '2-digit'
        }));
      } else {
        setNextRunTime('未設定');
      }
    }
  };

  const updateElapsedTime = (lastExecuted: string) => {
    const now = new Date();
    const last = new Date(lastExecuted);
    const diffMs = now.getTime() - last.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 60) {
      setElapsedTime(`${diffMinutes}分前`);
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      setElapsedTime(`${hours}時間${minutes}分前`);
    } else {
      const days = Math.floor(diffMinutes / 1440);
      setElapsedTime(`${days}日前`);
    }
  };

  const fetchNextRunTime = async () => {
    // この関数は使用しないため削除
  };

  useEffect(() => {
    if (lastExecutedAt) {
      const timer = setInterval(() => {
        updateElapsedTime(lastExecutedAt);
      }, 60000); // 1分ごとに更新
      return () => clearInterval(timer);
    }
  }, [lastExecutedAt]);

  const handleToggle = async () => {
    setToggling(true);
    setMessage('');

    try {
      const newEnabled = settings.enabled !== 'true';

      const response = await fetch('/api/cron/toggle-auto-creator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: newEnabled }),
      });

      const result = await response.json();

      if (result.success) {
        setSettings({ ...settings, enabled: newEnabled ? 'true' : 'false' });
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

      // キー・バリュー形式で保存
      const updates = [
        { setting_key: 'scraping_urls', setting_value: JSON.stringify(filteredUrls) },
        { setting_key: 'interval', setting_value: settings.execution_interval },
        { setting_key: 'interval_variance', setting_value: settings.execution_variance },
        { setting_key: 'content_prompt', setting_value: settings.choices_prompt },
        { setting_key: 'category_weights', setting_value: JSON.stringify(categoryWeights) },
        { setting_key: 'max_scraping_items', setting_value: settings.max_scraping_items },
        { setting_key: 'no_create_start_hour', setting_value: settings.no_create_start_hour },
        { setting_key: 'no_create_end_hour', setting_value: settings.no_create_end_hour },
        { setting_key: 'ai_user_probability', setting_value: settings.ai_user_probability },
        { setting_key: 'scraping_wait_time', setting_value: settings.scraping_wait_time },
        { setting_key: 'max_categories', setting_value: settings.max_categories },
        { setting_key: 'max_keywords', setting_value: settings.max_keywords },
        { setting_key: 'max_posts_per_execution', setting_value: settings.max_posts_per_execution },
      ];

      // サーバーサイドAPI経由で保存
      const response = await fetch('/api/admin/auto-creator/save-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '保存に失敗しました');
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

  const handleAddUrl = () => {
    if (urls.length < 8) {
      setUrls([...urls, '']);
    }
  };

  const handleRemoveUrl = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index);
    setUrls(newUrls);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI自動投稿 設定</h1>
        <p className="mt-2 text-sm text-gray-600">
          ニュース記事から自動で相談を作成する設定を管理します
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
                settings.enabled === 'true' ? 'text-green-500' : 'text-gray-400'
              }`}>●</span>
              <strong className="text-lg">RSS自動作成</strong>
            </div>
            
            <div className="border-l border-gray-300 pl-4 flex items-center gap-3">
              <strong className="text-sm">自動作成:</strong>
              {settings.enabled === 'true' ? (
                <span className="text-green-600 font-medium">✓ 有効</span>
              ) : (
                <span className="text-red-600 font-medium">✗ 無効</span>
              )}
              <button
                onClick={handleToggle}
                disabled={toggling}
                className={`px-4 py-1 rounded text-sm font-medium text-white ${
                  settings.enabled === 'true'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-500 hover:bg-green-600'
                } disabled:bg-gray-400`}
              >
                {toggling ? '処理中...' : (settings.enabled === 'true' ? '⏸ 停止' : '▶ 開始')}
              </button>
            </div>

            <div className="border-l border-gray-300 pl-4">
              <strong className="text-sm">間隔:</strong>
              <span className="ml-2 text-sm">
                {settings.execution_interval}分
                {settings.execution_variance !== '0' && `±${settings.execution_variance}分`}
              </span>
            </div>

            {lastExecutedAt && (
              <div className="border-l border-gray-300 pl-4">
                <strong className="text-sm">最終実行:</strong>
                <span className="ml-2 text-sm text-gray-600">
                  {new Date(lastExecutedAt).toLocaleString('ja-JP', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  {elapsedTime && ` (${elapsedTime})`}
                </span>
              </div>
            )}
            {settings.enabled === 'true' && nextRunTime && (
              <div className="border-l border-gray-300 pl-4">
                <strong className="text-sm">次回実行予定:</strong>
                <span className="ml-2 text-sm text-blue-600 font-medium">{nextRunTime}頃</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左列: 入力フィールド */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 space-y-6">

          {/* スクレイピングURL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              スクレイピング対象URL
            </label>
            <div className="space-y-2">
              {urls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveUrl(index)}
                    className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                  >
                    削除
                  </button>
                </div>
              ))}
              {urls.length < 8 && (
                <button
                  type="button"
                  onClick={handleAddUrl}
                  className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-500 text-sm"
                >
                  + URLを追加
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              RSS/Atom、Yahoo!ニュースなど（最大8個）
            </p>
          </div>

          {/* 実行間隔設定 */}
          <div className="grid grid-cols-2 gap-4">
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
                min="5"
                max="1440"
              />
              <p className="mt-1 text-xs text-gray-500">5～1440分（前回の成功実行からの最小間隔）</p>
              <p className="mt-1 text-xs text-gray-400">※CRONの呼び出し頻度とは別の設定です</p>
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
              <p className="mt-1 text-xs text-gray-500">±0～60分（実行タイミングにランダムな変動を加える）</p>
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
          <div className="grid grid-cols-2 gap-4">
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
                実行ごとの最大トピック数
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
                1回の実行で作成する最大トピック数（1〜10件）
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <label htmlFor="max_scraping_items" className="block text-sm font-medium text-gray-700 mb-2">
                最大スクレイピング件数
              </label>
              <input
                type="number"
                id="max_scraping_items"
                value={settings.max_scraping_items}
                onChange={(e) => setSettings({ ...settings, max_scraping_items: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="10"
                max="100"
              />
              <p className="mt-1 text-xs text-gray-500">
                Yahoo!知恵袋から取得する最大件数（10〜100件）
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

          {/* カテゴリウェイト設定 */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">カテゴリウェイト設定</h3>
            <p className="text-sm text-gray-600 mb-4">
              各カテゴリの投稿頻度を設定します。数値が大きいほど、そのカテゴリの投稿が多くなります。
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              {categories.map((category) => (
                <div key={category.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {category.name}
                  </label>
                  <input
                    type="number"
                    value={categoryWeights[category.name] || 0}
                    onChange={(e) => setCategoryWeights({
                      ...categoryWeights,
                      [category.name]: parseInt(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="10"
                  />
                </div>
              ))}
            </div>
            
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💡 合計ウェイト: <strong>{Object.values(categoryWeights).reduce((sum, w) => sum + w, 0)}</strong> 
                （50件で1サイクル完結を推奨）
              </p>
            </div>
          </div>

          </div>

          <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium"
            >
              {saving ? '保存中...' : '設定を保存'}
            </button>
          </div>
        </div>

        {/* 右列: 注意書きカード */}
        <div className="space-y-6">
          {/* API設定リンク */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              OpenAI APIキーは <a href="/admin/api-settings" className="font-medium underline hover:text-blue-600">API設定</a> で管理されています
            </p>
          </div>

          {/* 自動実行スケジュール */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-green-900 mb-2">🕒 自動実行スケジュール</h3>
            <div className="space-y-2 text-sm text-green-800">
              <div>
                <strong>Yahoo!知恵袋取得:</strong> 毎日 9:00, 15:00, 21:00
              </div>
              <div>
                <strong>AI自動投稿:</strong> {settings.execution_interval}分ごと（±{settings.execution_variance}分のゆらぎ）
                <span className="text-xs text-green-600 ml-2">※実行間隔と実行ゆらぎの設定値に基づいて自動実行されます</span>
              </div>
              <div className="text-xs text-green-600 mt-2">
                ※作成しない時間帯: {settings.no_create_start_hour}時〜{settings.no_create_end_hour}時
              </div>
            </div>
          </div>

          {/* AI投稿プロンプト */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-purple-900 mb-2">🤖 AI投稿プロンプト</h3>
            <div className="text-xs text-purple-800 space-y-2 max-h-96 overflow-y-auto">
              <p className="font-medium">Yahoo!知恵袋からスクレイピングした質問を、完全にオリジナルのブログ記事風の相談文に大幅に書き換えます。</p>
              
              <div className="space-y-1">
                <p className="font-semibold">【修正ルール】</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>タイトル: 20-40文字、体言止めは使わない</li>
                  <li>本文: 150-300文字で完全に書き直す</li>
                  <li>リライト率50%以上必須</li>
                  <li>必ず丁寧語・敬語（です・ます調）</li>
                </ul>
              </div>

              <div className="space-y-1">
                <p className="font-semibold">【冒頭のバリエーション】</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>「聞いてください」「相談させてください」</li>
                  <li>「実は〜」「正直〜」「本当に〜」</li>
                  <li>「〜なんですが」「〜で困っています」</li>
                  <li>「皆さんならどうしますか」</li>
                  <li>直接本題から入る（「彼氏が〜」など）</li>
                </ul>
                <p className="text-purple-700">※「最近」は全体の30%程度に抑える</p>
              </div>

              <div className="space-y-1">
                <p className="font-semibold">【記号・絵文字】</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>記号: 「、、、」「汗」「…」「！」</li>
                  <li>絵文字: 0個が一番多く、使う場合は1〜2個程度（💦😊💕😢🥺など）</li>
                </ul>
              </div>

              <div className="space-y-1">
                <p className="font-semibold">【その他】</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>2〜3文ごとに改行</li>
                  <li>背景情報や心情を積極的に追加</li>
                  <li>具体的なたとえや事例を追加</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 注意事項 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">⚠️ 注意事項</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 実行間隔は最短1分、最長24時間です</li>
              <li>• スクレイピングは各サイトの利用規約を遵守してください</li>
              <li>• 自動実行はVPSのcrontabで動作します</li>
              <li>• 開始/停止ボタンでCRON実行を制御できます</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
