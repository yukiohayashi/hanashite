'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Settings {
  enabled: string;
  interval: string;
  interval_variance: string;
  no_run_start: string;
  no_run_end: string;
  ai_member_probability: string;
  posts_per_run: string;
  reply_probability: string;
  like_probability: string;
  post_like_probability: string;
  author_reply_probability: string;
  comment_min_length: string;
  comment_max_length: string;
  max_comments_per_post: string;
  max_comments_variance: string;
  target_days: string;
  min_votes: string;
  prioritize_recent_posts: string;
  priority_days: string;
  priority_weight: string;
  comment_prompt: string;
  reply_prompt: string;
}

export default function AutoVoterSettings() {
  const [settings, setSettings] = useState<Settings>({
    enabled: 'false',
    interval: '120',
    interval_variance: '30',
    no_run_start: '00:00',
    no_run_end: '06:00',
    ai_member_probability: '70',
    posts_per_run: '3',
    reply_probability: '30',
    like_probability: '40',
    post_like_probability: '50',
    author_reply_probability: '70',
    comment_min_length: '10',
    comment_max_length: '60',
    max_comments_per_post: '50',
    max_comments_variance: '20',
    target_days: '3',
    min_votes: '0',
    prioritize_recent_posts: '1',
    priority_days: '3',
    priority_weight: '5',
    comment_prompt: '',
    reply_prompt: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('auto_voter_settings')
      .select('*');

    if (error) {
      console.error('Error fetching settings:', error);
      return;
    }

    const settingsMap: Record<string, string> = {};
    data?.forEach((item) => {
      settingsMap[item.setting_key] = item.setting_value;
    });

    setSettings({
      enabled: settingsMap.enabled || 'false',
      interval: settingsMap.interval || '120',
      interval_variance: settingsMap.interval_variance || '30',
      no_run_start: settingsMap.no_run_start || '00:00',
      no_run_end: settingsMap.no_run_end || '06:00',
      ai_member_probability: settingsMap.ai_member_probability || '70',
      posts_per_run: settingsMap.posts_per_run || '3',
      reply_probability: settingsMap.reply_probability || '30',
      like_probability: settingsMap.like_probability || '40',
      post_like_probability: settingsMap.post_like_probability || '50',
      author_reply_probability: settingsMap.author_reply_probability || '70',
      comment_min_length: settingsMap.comment_min_length || '10',
      comment_max_length: settingsMap.comment_max_length || '60',
      max_comments_per_post: settingsMap.max_comments_per_post || '50',
      max_comments_variance: settingsMap.max_comments_variance || '20',
      target_days: settingsMap.target_days || '3',
      min_votes: settingsMap.min_votes || '0',
      prioritize_recent_posts: settingsMap.prioritize_recent_posts || '1',
      priority_days: settingsMap.priority_days || '3',
      priority_weight: settingsMap.priority_weight || '5',
      comment_prompt: settingsMap.comment_prompt || '',
      reply_prompt: settingsMap.reply_prompt || '',
    });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      for (const [key, value] of Object.entries(settings)) {
        const { error } = await supabase
          .from('auto_voter_settings')
          .update({ setting_value: value, updated_at: new Date().toISOString() })
          .eq('setting_key', key);
        
        if (error) {
          console.error(`Error saving ${key}:`, error);
          throw error;
        }
      }

      setMessage('設定を保存しました');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage(`保存に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">自動投票・コメント・いいね 設定</h1>
        <p className="mt-2 text-sm text-gray-600">
          アンケートへの自動投票・コメント・返信・いいね機能の設定を管理します
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
          {/* 自動実行の有効/無効 */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enabled === 'true'}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked ? 'true' : 'false' })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                自動実行を有効にする
              </span>
            </label>
            <p className="mt-2 text-sm text-gray-500">
              チェックを外すと、自動実行が停止します（手動実行は可能）
            </p>
          </div>

          {/* API設定リンク */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              OpenAI APIキーは <a href="/admin/api-settings" className="font-medium underline hover:text-blue-600">API設定</a> で管理されています
            </p>
          </div>

          {/* 実行間隔設定 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="interval" className="block text-sm font-medium text-gray-700 mb-2">
                実行間隔（分）
              </label>
              <input
                type="number"
                id="interval"
                value={settings.interval}
                onChange={(e) => setSettings({ ...settings, interval: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="1440"
              />
              <p className="mt-1 text-xs text-gray-500">1～1440分（1～24時間）</p>
            </div>

            <div>
              <label htmlFor="interval_variance" className="block text-sm font-medium text-gray-700 mb-2">
                実行ゆらぎ（分）
              </label>
              <input
                type="number"
                id="interval_variance"
                value={settings.interval_variance}
                onChange={(e) => setSettings({ ...settings, interval_variance: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="60"
              />
              <p className="mt-1 text-xs text-gray-500">±0～60分のランダムな遅延</p>
            </div>
          </div>

          {/* 実行しない時間帯 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="no_run_start" className="block text-sm font-medium text-gray-700 mb-2">
                実行しない開始時刻
              </label>
              <input
                type="time"
                id="no_run_start"
                value={settings.no_run_start}
                onChange={(e) => setSettings({ ...settings, no_run_start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="no_run_end" className="block text-sm font-medium text-gray-700 mb-2">
                実行しない終了時刻
              </label>
              <input
                type="time"
                id="no_run_end"
                value={settings.no_run_end}
                onChange={(e) => setSettings({ ...settings, no_run_end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 確率設定 */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">確率設定</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="ai_member_probability" className="block text-sm font-medium text-gray-700 mb-2">
                  AI会員使用確率（%）
                </label>
                <input
                  type="number"
                  id="ai_member_probability"
                  value={settings.ai_member_probability}
                  onChange={(e) => setSettings({ ...settings, ai_member_probability: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  0%: 編集者のみ、100%: AI会員のみ
                </p>
              </div>

              <div>
                <label htmlFor="reply_probability" className="block text-sm font-medium text-gray-700 mb-2">
                  返信確率（%）
                </label>
                <input
                  type="number"
                  id="reply_probability"
                  value={settings.reply_probability}
                  onChange={(e) => setSettings({ ...settings, reply_probability: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  新規コメントではなく返信する確率
                </p>
              </div>

              <div>
                <label htmlFor="like_probability" className="block text-sm font-medium text-gray-700 mb-2">
                  コメントいいね確率（%）
                </label>
                <input
                  type="number"
                  id="like_probability"
                  value={settings.like_probability}
                  onChange={(e) => setSettings({ ...settings, like_probability: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  コメントにいいねする確率
                </p>
              </div>

              <div>
                <label htmlFor="post_like_probability" className="block text-sm font-medium text-gray-700 mb-2">
                  投稿いいね確率（%）
                </label>
                <input
                  type="number"
                  id="post_like_probability"
                  value={settings.post_like_probability}
                  onChange={(e) => setSettings({ ...settings, post_like_probability: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  投稿にいいねする確率
                </p>
              </div>

              <div>
                <label htmlFor="author_reply_probability" className="block text-sm font-medium text-gray-700 mb-2">
                  投稿者返信確率（%）
                </label>
                <input
                  type="number"
                  id="author_reply_probability"
                  value={settings.author_reply_probability}
                  onChange={(e) => setSettings({ ...settings, author_reply_probability: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  投稿者が返信する確率
                </p>
              </div>

              <div>
                <label htmlFor="posts_per_run" className="block text-sm font-medium text-gray-700 mb-2">
                  1回の実行で処理する記事数
                </label>
                <input
                  type="number"
                  id="posts_per_run"
                  value={settings.posts_per_run}
                  onChange={(e) => setSettings({ ...settings, posts_per_run: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="10"
                />
                <p className="mt-1 text-xs text-gray-500">1～10件</p>
              </div>
            </div>
          </div>

          {/* コメント設定 */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">コメント設定</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="comment_min_length" className="block text-sm font-medium text-gray-700 mb-2">
                  コメント最小文字数
                </label>
                <input
                  type="number"
                  id="comment_min_length"
                  value={settings.comment_min_length}
                  onChange={(e) => setSettings({ ...settings, comment_min_length: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="5"
                  max="100"
                />
              </div>

              <div>
                <label htmlFor="comment_max_length" className="block text-sm font-medium text-gray-700 mb-2">
                  コメント最大文字数
                </label>
                <input
                  type="number"
                  id="comment_max_length"
                  value={settings.comment_max_length}
                  onChange={(e) => setSettings({ ...settings, comment_max_length: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="10"
                  max="200"
                />
              </div>

              <div>
                <label htmlFor="max_comments_per_post" className="block text-sm font-medium text-gray-700 mb-2">
                  記事ごとの最大コメント数
                </label>
                <input
                  type="number"
                  id="max_comments_per_post"
                  value={settings.max_comments_per_post}
                  onChange={(e) => setSettings({ ...settings, max_comments_per_post: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="10"
                  max="200"
                />
              </div>

              <div>
                <label htmlFor="max_comments_variance" className="block text-sm font-medium text-gray-700 mb-2">
                  最大コメント数のゆらぎ
                </label>
                <input
                  type="number"
                  id="max_comments_variance"
                  value={settings.max_comments_variance}
                  onChange={(e) => setSettings({ ...settings, max_comments_variance: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="50"
                />
              </div>
            </div>
          </div>

          {/* 対象記事設定 */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">対象記事設定</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="target_days" className="block text-sm font-medium text-gray-700 mb-2">
                  対象期間（日）
                </label>
                <input
                  type="number"
                  id="target_days"
                  value={settings.target_days}
                  onChange={(e) => setSettings({ ...settings, target_days: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="30"
                />
                <p className="mt-1 text-xs text-gray-500">この期間内の記事を対象</p>
              </div>

              <div>
                <label htmlFor="min_votes" className="block text-sm font-medium text-gray-700 mb-2">
                  最小投票数
                </label>
                <input
                  type="number"
                  id="min_votes"
                  value={settings.min_votes}
                  onChange={(e) => setSettings({ ...settings, min_votes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
                <p className="mt-1 text-xs text-gray-500">この投票数以上の記事を対象</p>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.prioritize_recent_posts === '1'}
                    onChange={(e) => setSettings({ ...settings, prioritize_recent_posts: e.target.checked ? '1' : '0' })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    新しい記事を優先
                  </span>
                </label>
              </div>

              <div>
                <label htmlFor="priority_days" className="block text-sm font-medium text-gray-700 mb-2">
                  優先期間（日）
                </label>
                <input
                  type="number"
                  id="priority_days"
                  value={settings.priority_days}
                  onChange={(e) => setSettings({ ...settings, priority_days: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="7"
                />
              </div>

              <div>
                <label htmlFor="priority_weight" className="block text-sm font-medium text-gray-700 mb-2">
                  優先重み
                </label>
                <input
                  type="number"
                  id="priority_weight"
                  value={settings.priority_weight}
                  onChange={(e) => setSettings({ ...settings, priority_weight: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="10"
                />
              </div>
            </div>
          </div>

          {/* ChatGPTプロンプト設定 */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">ChatGPTプロンプト設定</h3>
            
            {/* コメント生成プロンプト */}
            <div className="mb-6">
              <label htmlFor="comment_prompt" className="block text-sm font-medium text-gray-700 mb-2">
                コメント生成プロンプト
              </label>
              <textarea
                id="comment_prompt"
                value={settings.comment_prompt}
                onChange={(e) => setSettings({ ...settings, comment_prompt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={10}
                placeholder="アンケートに対するコメントを生成してください。"
              />
              <p className="mt-1 text-xs text-gray-500">
                ChatGPTがコメントを生成する際のプロンプト（ユーザープロフィールを考慮）
              </p>
            </div>

            {/* 返信生成プロンプト */}
            <div>
              <label htmlFor="reply_prompt" className="block text-sm font-medium text-gray-700 mb-2">
                返信生成プロンプト
              </label>
              <textarea
                id="reply_prompt"
                value={settings.reply_prompt}
                onChange={(e) => setSettings({ ...settings, reply_prompt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={10}
                placeholder="コメントに対する返信を生成してください。"
              />
              <p className="mt-1 text-xs text-gray-500">
                ChatGPTが返信を生成する際のプロンプト
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
          <li>• 確率設定は0～100%で設定してください</li>
          <li>• 自動実行はCRON設定後に有効になります</li>
        </ul>
      </div>
    </div>
  );
}
