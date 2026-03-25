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
  votes_per_run: string;
  votes_variance: string;
  comments_per_run: string;
  reply_probability: string;
  like_probability: string;
  post_like_probability: string;
  author_reply_probability: string;
  max_comments_per_post: string;
  max_comments_variance: string;
  prioritize_recent_posts: string;
  priority_days: string;
  priority_weight: string;
  profile_weight: string;
  content_weight: string;
  mention_other_choices_probability: string;
  comment_prompt: string;
  last_executed_at?: string;
}

export default function AutoVoterSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [toggling, setToggling] = useState(false);
  const [nextRunTime, setNextRunTime] = useState<string>('');
  const [executing, setExecuting] = useState(false);
  const [lastExecution, setLastExecution] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState<string>('');

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('auto_commenter_liker_settings')
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
      posts_per_run: settingsMap.posts_per_run || '1',
      votes_per_run: settingsMap.votes_per_run || '3',
      votes_variance: settingsMap.votes_variance || '2',
      comments_per_run: settingsMap.comments_per_run || '1',
      reply_probability: settingsMap.reply_probability || '30',
      like_probability: settingsMap.like_probability || '40',
      post_like_probability: settingsMap.post_like_probability || '50',
      author_reply_probability: settingsMap.author_reply_probability || '70',
      max_comments_per_post: settingsMap.max_comments_per_post || '50',
      max_comments_variance: settingsMap.max_comments_variance || '20',
      prioritize_recent_posts: settingsMap.prioritize_recent_posts || '1',
      priority_days: settingsMap.priority_days || '3',
      priority_weight: settingsMap.priority_weight || '5',
      profile_weight: settingsMap.profile_weight || 'medium',
      content_weight: settingsMap.content_weight || 'medium',
      mention_other_choices_probability: settingsMap.mention_other_choices_probability || '30',
      comment_prompt: settingsMap.comment_prompt || '',
      last_executed_at: settingsMap.last_executed_at,
    });

    if (settingsMap.last_executed_at) {
      setLastExecution(settingsMap.last_executed_at);
      updateElapsedTime(settingsMap.last_executed_at);
    }
  };

  const updateElapsedTime = (lastExec: string) => {
    const now = new Date();
    const last = new Date(lastExec);
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

  useEffect(() => {
    fetchSettings();
    fetchNextRunTime();
  }, []);

  useEffect(() => {
    if (lastExecution) {
      const timer = setInterval(() => {
        updateElapsedTime(lastExecution);
      }, 60000); // 1分ごとに更新
      return () => clearInterval(timer);
    }
  }, [lastExecution]);

  const fetchNextRunTime = async () => {
    const { data: settingsData } = await supabase
      .from('auto_commenter_liker_settings')
      .select('*');

    if (!settingsData) {
      console.log('次回実行予定: データなし');
      return;
    }

    const settingsMap: Record<string, string> = {};
    settingsData.forEach((item) => {
      settingsMap[item.setting_key] = item.setting_value;
    });

    console.log('次回実行予定計算 - settingsMap:', settingsMap);
    console.log('次回実行予定計算 - enabled値:', settingsMap.enabled);
    console.log('次回実行予定計算 - next_execution_time値:', settingsMap.next_execution_time);

    if (settingsMap.enabled === 'true') {
      if (settingsMap.next_execution_time) {
        const nextTime = new Date(settingsMap.next_execution_time);
        
        const nextTimeStr = nextTime.toLocaleString('ja-JP', { 
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit', 
          minute: '2-digit'
        });
        
        console.log('次回実行予定:', nextTimeStr);
        setNextRunTime(nextTimeStr);
      } else {
        console.log('次回実行予定: 未設定');
        setNextRunTime('未設定');
      }
    } else {
      console.log('次回実行予定: 無効');
      setNextRunTime('');
    }
  };

  const handleToggle = async () => {
    if (!settings) return;
    
    setToggling(true);
    setMessage('');

    try {
      const newEnabled = settings.enabled !== 'true';

      // 停止から開始する場合、ランダムな初回実行時間を設定
      if (newEnabled) {
        const interval = parseInt(settings.interval || '120');
        const variance = parseInt(settings.interval_variance || '30');
        const minInterval = interval - variance;
        const maxInterval = interval + variance;
        
        // ランダムな間隔を生成
        const randomInterval = minInterval + Math.random() * (maxInterval - minInterval);
        const now = new Date();
        const nextExecutionTime = new Date(now.getTime() + randomInterval * 60 * 1000);
        
        // last_executed_atを現在時刻に設定
        await supabase
          .from('auto_commenter_liker_settings')
          .update({ 
            setting_value: now.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('setting_key', 'last_executed_at');
        
        // next_execution_timeを設定
        const { data: existingNextExec } = await supabase
          .from('auto_commenter_liker_settings')
          .select('setting_key')
          .eq('setting_key', 'next_execution_time')
          .maybeSingle();
        
        if (existingNextExec) {
          await supabase
            .from('auto_commenter_liker_settings')
            .update({ 
              setting_value: nextExecutionTime.toISOString(),
              updated_at: now.toISOString()
            })
            .eq('setting_key', 'next_execution_time');
        } else {
          await supabase
            .from('auto_commenter_liker_settings')
            .insert({ 
              setting_key: 'next_execution_time',
              setting_value: nextExecutionTime.toISOString(),
              updated_at: now.toISOString()
            });
        }
      }

      const { error } = await supabase
        .from('auto_commenter_liker_settings')
        .update({ setting_value: newEnabled ? 'true' : 'false', updated_at: new Date().toISOString() })
        .eq('setting_key', 'enabled');

      if (!error) {
        setSettings({ ...settings, enabled: newEnabled ? 'true' : 'false' });
        setMessage(newEnabled ? 'AI自動コメントを開始しました' : 'AI自動コメントを停止しました');
        await fetchNextRunTime();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('切り替えに失敗しました: ' + error.message);
      }
    } catch (error) {
      console.error('Toggle error:', error);
      setMessage('切り替えに失敗しました');
    } finally {
      setToggling(false);
    }
  };

  const handleManualExecute = async () => {
    if (!settings) return;
    
    setExecuting(true);
    setMessage('');

    try {
      const response = await fetch('/api/auto-voter/execute-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('実行結果の詳細:', data);

      if (data.success) {
        const details = data.details || {};
        const settingsInfo = data.settings || {};
        
        let message = `✅ ${data.message}\n\n`;
        message += `📊 実行詳細:\n`;
        if (details.processed_posts) message += `- 処理記事数: ${details.processed_posts}件\n`;
        if (details.total_votes) message += `- 投票数: ${details.total_votes}票\n`;
        if (details.total_comments) message += `- コメント数: ${details.total_comments}件\n`;
        
        // 処理した記事の詳細を表示
        if (details.posts_details && details.posts_details.length > 0) {
          message += `\n📝 処理した記事:\n`;
          details.posts_details.forEach((post: any) => {
            message += `- [ID: ${post.post_id}] ${post.title}\n`;
            message += `  カテゴリ: ${post.category_id}, 投票数: ${post.votes_added}票, 優先度: ${post.priority}\n`;
          });
        }
        
        message += `\n⚙️ 使用された設定:\n`;
        if (settingsInfo.posts_per_run) message += `- 処理記事数: ${settingsInfo.posts_per_run}件\n`;
        if (settingsInfo.votes_per_run) message += `- 投票数: ${settingsInfo.votes_per_run}±${settingsInfo.votes_variance}票\n`;
        if (settingsInfo.ai_member_probability) message += `- AI会員確率: ${settingsInfo.ai_member_probability}%\n`;
        
        setMessage(message);
        
        // 設定と次回実行予定時刻を更新
        await fetchSettings();
        await fetchNextRunTime();
      } else {
        setMessage(`❌ ${data.message || data.error}\n\nエラー詳細: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (error) {
      console.error('Error executing:', error);
      setMessage(`❌ 実行に失敗しました\n\nエラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setExecuting(false);
      setTimeout(() => setMessage(''), 10000);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    setSaving(true);
    setMessage('');

    try {
      for (const [key, value] of Object.entries(settings)) {
        const { error } = await supabase
          .from('auto_commenter_liker_settings')
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

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI自動コメント・いいね 設定</h1>
        <p className="mt-2 text-sm text-gray-600">
          相談への自動コメント・返信・いいね機能の設定を管理します
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
              <strong className="text-lg">AI自動コメント・いいね</strong>
            </div>
            
            <div className="border-l border-gray-300 pl-4 flex items-center gap-3">
              <strong className="text-sm">自動実行:</strong>
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
                {settings.interval}分
                {settings.interval_variance !== '0' && `±${settings.interval_variance}分`}
              </span>
            </div>

            {lastExecution && (
              <div className="border-l border-gray-300 pl-4">
                <strong className="text-sm">最終実行:</strong>
                <span className="ml-2 text-sm text-gray-600">
                  {new Date(lastExecution).toLocaleString('ja-JP', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  {elapsedTime && ` (${elapsedTime})`}
                </span>
              </div>
            )}

            {settings.enabled === 'true' && (
              <div className="border-l border-gray-300 pl-4">
                <strong className="text-sm">次回実行予定:</strong>
                <span className="ml-2 text-sm text-blue-600 font-medium">
                  {nextRunTime ? `${nextRunTime}頃` : '計算中...'}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={handleManualExecute}
            disabled={executing}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
          >
            {executing ? '実行中...' : '今すぐ実行'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左列: 入力フィールド */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 space-y-4">

          {/* 実行間隔設定 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 justify-items-start">
            <div>
              <label htmlFor="interval" className="block text-sm font-medium text-gray-700 mb-1">
                実行間隔（分）
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  id="interval"
                  value={settings.interval}
                  onChange={(e) => setSettings({ ...settings, interval: e.target.value })}
                  className="max-w-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="1440"
                />
                <span className="text-gray-600 font-medium">±</span>
                <input
                  type="number"
                  id="interval_variance"
                  value={settings.interval_variance}
                  onChange={(e) => setSettings({ ...settings, interval_variance: e.target.value })}
                  className="max-w-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="60"
                />
                <span className="text-gray-600 text-sm whitespace-nowrap">分（ゆらぎ）</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="no_run_start_hour" className="block text-sm font-medium text-gray-700 mb-1">
                  実行しない開始時刻
                </label>
                <select
                  id="no_run_start_hour"
                  value={settings.no_run_start.split(':')[0] || '0'}
                  onChange={(e) => setSettings({ ...settings, no_run_start: `${e.target.value}:00` })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i}時</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="no_run_end_hour" className="block text-sm font-medium text-gray-700 mb-1">
                  実行しない終了時刻
                </label>
                <select
                  id="no_run_end_hour"
                  value={settings.no_run_end.split(':')[0] || '6'}
                  onChange={(e) => setSettings({ ...settings, no_run_end: `${e.target.value}:00` })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i}時</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 投稿設定 */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">投稿設定</h3>
              <a 
                href="/admin/categories" 
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                カテゴリごとの対象期間・フィルタはこちら
              </a>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 justify-items-start">
              <div>
                <label htmlFor="posts_per_run" className="block text-sm font-medium text-gray-700 mb-1">
                  1回の実行で処理する記事数
                </label>
                <input
                  type="number"
                  id="posts_per_run"
                  value={settings.posts_per_run}
                  onChange={(e) => setSettings({ ...settings, posts_per_run: e.target.value })}
                  className="max-w-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="10"
                />
                <p className="mt-1 text-xs text-gray-500">1～10件（推奨: 1件）</p>
              </div>

              <div>
                <label htmlFor="post_like_probability" className="block text-sm font-medium text-gray-700 mb-1">
                  投稿いいね確率（%）
                </label>
                <input
                  type="number"
                  id="post_like_probability"
                  value={settings.post_like_probability}
                  onChange={(e) => setSettings({ ...settings, post_like_probability: e.target.value })}
                  className="max-w-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  投稿にいいねする確率
                </p>
              </div>
            </div>
          </div>

          {/* 対象記事設定 */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-900">対象記事設定</h3>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 justify-items-start">
              <div>
                <label htmlFor="priority_days" className="block text-sm font-medium text-gray-700 mb-1">
                  優先期間（日）
                </label>
                <input
                  type="number"
                  id="priority_days"
                  value={settings.priority_days}
                  onChange={(e) => setSettings({ ...settings, priority_days: e.target.value })}
                  className="max-w-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="7"
                />
                <p className="mt-1 text-xs text-gray-500">
                  この期間内の記事を優先
                </p>
              </div>

              <div>
                <label htmlFor="priority_weight" className="block text-sm font-medium text-gray-700 mb-1">
                  優先重み
                </label>
                <input
                  type="number"
                  id="priority_weight"
                  value={settings.priority_weight}
                  onChange={(e) => setSettings({ ...settings, priority_weight: e.target.value })}
                  className="max-w-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="10"
                />
                <p className="mt-1 text-xs text-gray-500">
                  今日×2、昨日×1.5、期間内×1の段階的重み付け
                </p>
              </div>
            </div>
          </div>

          {/* コメント設定 */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">コメント設定</h3>
            {/* 1行目: 基本設定 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="comments_per_run" className="block text-sm font-medium text-gray-700 mb-1">
                  1回の実行でのコメント数
                </label>
                <input
                  type="number"
                  id="comments_per_run"
                  value={settings.comments_per_run}
                  onChange={(e) => setSettings({ ...settings, comments_per_run: e.target.value })}
                  className="max-w-[100px] px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  min="1"
                  max="10"
                />
                <p className="mt-1 text-xs text-gray-500">推奨: 1件</p>
              </div>

              <div>
                <label htmlFor="comment_length" className="block text-sm font-medium text-gray-700 mb-1">
                  コメント文字数
                </label>
                <div className="bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-700">
                    <strong>自動設定:</strong> 70%の確率で10〜40文字（短文）、30%の確率で40〜250文字（長文）
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    ※ コメント文字数はコード内でランダムに生成されます。変更する場合は<code className="bg-gray-200 px-1 rounded">execute/route.ts</code>を編集してください。
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="max_comments_per_post" className="block text-sm font-medium text-gray-700 mb-1">
                  記事ごとの最大コメント数
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    id="max_comments_per_post"
                    value={settings.max_comments_per_post}
                    onChange={(e) => setSettings({ ...settings, max_comments_per_post: e.target.value })}
                    className="max-w-[100px] px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    min="10"
                    max="200"
                  />
                  <span className="text-gray-600 text-sm">±</span>
                  <input
                    type="number"
                    id="max_comments_variance"
                    value={settings.max_comments_variance}
                    onChange={(e) => setSettings({ ...settings, max_comments_variance: e.target.value })}
                    className="max-w-[100px] px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    min="0"
                    max="50"
                  />
                </div>
              </div>
            </div>

            {/* 2行目: 確率設定 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="reply_probability" className="block text-sm font-medium text-gray-700 mb-1">
                  コメント返信確率（%）
                </label>
                <input
                  type="number"
                  id="reply_probability"
                  value={settings.reply_probability}
                  onChange={(e) => setSettings({ ...settings, reply_probability: e.target.value })}
                  className="max-w-[100px] px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label htmlFor="like_probability" className="block text-sm font-medium text-gray-700 mb-1">
                  コメントいいね確率（%）
                </label>
                <input
                  type="number"
                  id="like_probability"
                  value={settings.like_probability}
                  onChange={(e) => setSettings({ ...settings, like_probability: e.target.value })}
                  className="max-w-[100px] px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  min="0"
                  max="100"
                />
              </div>

            </div>

            {/* 3行目: 投稿者返信と多様性 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="author_reply_probability" className="block text-sm font-medium text-gray-700 mb-1">
                  投稿者返信（%）
                </label>
                <input
                  type="number"
                  id="author_reply_probability"
                  value={settings.author_reply_probability}
                  onChange={(e) => setSettings({ ...settings, author_reply_probability: e.target.value })}
                  className="max-w-[100px] px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label htmlFor="mention_other_choices_probability" className="block text-sm font-medium text-gray-700 mb-1">
                  多様性（%）
                </label>
                <input
                  type="number"
                  id="mention_other_choices_probability"
                  value={settings.mention_other_choices_probability}
                  onChange={(e) => setSettings({ ...settings, mention_other_choices_probability: e.target.value })}
                  className="max-w-[100px] px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            {/* 4行目: 考慮度設定 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile_weight" className="block text-sm font-medium text-gray-700 mb-1">
                  プロフィール考慮度
                </label>
                <select
                  id="profile_weight"
                  value={settings.profile_weight}
                  onChange={(e) => setSettings({ ...settings, profile_weight: e.target.value })}
                  className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>

              <div>
                <label htmlFor="content_weight" className="block text-sm font-medium text-gray-700 mb-1">
                  記事内容考慮度
                </label>
                <select
                  id="content_weight"
                  value={settings.content_weight}
                  onChange={(e) => setSettings({ ...settings, content_weight: e.target.value })}
                  className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
            </div>
          </div>

          {/* コメント投稿者設定 */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">コメント投稿者設定</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ai_member_probability" className="block text-sm font-medium text-gray-700 mb-1">
                  AI会員使用確率（%）
                </label>
                <input
                  type="number"
                  id="ai_member_probability"
                  value={settings.ai_member_probability}
                  onChange={(e) => setSettings({ ...settings, ai_member_probability: e.target.value })}
                  className="max-w-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  0%: 編集者のみ、100%: AI会員のみ
                </p>
              </div>
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

          {/* 優先順位ルール */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-green-900 mb-2">🎯 投稿選択の優先順位ルール</p>
            <ol className="text-sm text-green-800 space-y-1 ml-4 list-decimal">
              <li><strong>ベストアンサー有無:</strong> ベストアンサー設定済みの投稿は除外</li>
              <li><strong>コメント0件:</strong> コメントがない投稿を最優先（優先度+1000）</li>
              <li><strong>日付の最新度:</strong> 24時間以内(+50) → 48時間以内(+30) → 3日以内(+15) → それ以降(+5)</li>
              <li><strong>コメント数:</strong> コメントが多いほど優先度が下がる</li>
              <li><strong>カテゴリ別対象期間:</strong> 各カテゴリ180日以内の投稿が対象</li>
            </ol>
          </div>

          {/* コメント投稿ルール */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">💬 自然なコメント投稿ルール</p>
            <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
              <li><strong>コメントがない場合:</strong> 新規コメント投稿 → コメントいいね</li>
              <li><strong>コメントがある場合:</strong> 新規コメント投稿 OR コメント返信 OR 投稿者返信 のいずれか1つをランダム実行</li>
            </ul>
            <p className="text-xs text-blue-700 mt-2">※ 1回の実行で1つのアクションのみ実行し、自然な時間間隔でコメントが投稿されます</p>
          </div>

          {/* AIコメント生成プロンプト */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-purple-900 mb-2">🤖 AIコメント生成プロンプト</h3>
            <textarea
              value={settings?.comment_prompt || ''}
              onChange={(e) => setSettings({ ...settings!, comment_prompt: e.target.value })}
              className="w-full h-96 p-3 text-xs border border-purple-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
              placeholder="AIコメント生成プロンプトを入力してください"
            />
          </div>

          {/* 注意事項 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">⚠️ 注意事項</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 実行間隔は最短1分、最長24時間です</li>
              <li>• AI会員確率は0%で編集者のみ、100%でAI会員のみ使用</li>
              <li>• コメント数は1件推奨（自然な投稿間隔を保つため）</li>
              <li>• 自動実行はVPSのcrontabで動作します</li>
              <li>• 開始/停止ボタンでCRON実行を制御できます</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
}
