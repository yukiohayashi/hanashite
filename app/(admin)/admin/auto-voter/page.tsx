'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Stats {
  totalExecutions: number;
  todayExecutions: number;
  successRate: number;
  lastExecution: string | null;
}

export default function AutoVoterDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalExecutions: 0,
    todayExecutions: 0,
    successRate: 0,
    lastExecution: null,
  });
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    // 全実行数
    const { count: totalCount } = await supabase
      .from('auto_voter_logs')
      .select('*', { count: 'exact', head: true });

    // 今日の実行数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayCount } = await supabase
      .from('auto_voter_logs')
      .select('*', { count: 'exact', head: true })
      .gte('executed_at', today.toISOString());

    // 成功率
    const { count: successCount } = await supabase
      .from('auto_voter_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'success');

    // 最終実行日時
    const { data: lastLog } = await supabase
      .from('auto_voter_logs')
      .select('executed_at')
      .order('executed_at', { ascending: false })
      .limit(1)
      .single();

    setStats({
      totalExecutions: totalCount || 0,
      todayExecutions: todayCount || 0,
      successRate: totalCount ? ((successCount || 0) / totalCount) * 100 : 0,
      lastExecution: lastLog?.executed_at || null,
    });
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('auto_voter_settings')
      .select('*')
      .eq('setting_key', 'enabled')
      .single();

    setIsEnabled(data?.setting_value === 'true');
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
    fetchSettings();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '未実行';
    const date = new Date(dateString);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">自動投票・コメント ダッシュボード</h1>
        <p className="mt-2 text-sm text-gray-600">
          アンケートへの自動投票・コメント・返信・いいね機能の管理
        </p>
      </div>

      {/* ステータスカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isEnabled ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <svg className={`w-6 h-6 ${isEnabled ? 'text-green-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">ステータス</p>
              <p className={`text-2xl font-bold ${isEnabled ? 'text-green-600' : 'text-gray-600'}`}>
                {loading ? '...' : (isEnabled ? '稼働中' : '停止中')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">総実行数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalExecutions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">今日の実行</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todayExecutions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">成功率</p>
              <p className="text-2xl font-bold text-gray-900">{stats.successRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* 最終実行情報 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">最終実行情報</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">最終実行日時:</span>
            <span className="text-sm font-medium text-gray-900">{formatDate(stats.lastExecution)}</span>
          </div>
        </div>
      </div>

      {/* クイックアクション */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/auto-voter/settings"
          className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">設定</h3>
              <p className="text-sm text-gray-600">実行間隔、確率などの設定</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/auto-voter/logs"
          className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">実行履歴</h3>
              <p className="text-sm text-gray-600">過去の実行ログを確認</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/auto-voter/manual"
          className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">手動実行</h3>
              <p className="text-sm text-gray-600">テスト実行・動作確認</p>
            </div>
          </div>
        </Link>
      </div>

      {/* 注意事項 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-yellow-800 mb-2">⚠️ 注意事項</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• 自動実行はCRON設定後に有効になります</li>
          <li>• 手動実行で動作テストを行ってください</li>
          <li>• OpenAI APIキーは設定画面で設定してください</li>
          <li>• AI会員とコメント投稿者の確率を調整できます</li>
        </ul>
      </div>
    </div>
  );
}
