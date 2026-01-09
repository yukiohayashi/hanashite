import { supabase } from '@/lib/supabase';
import Link from 'next/link';

async function getStats() {
  const { count: totalProcessed } = await supabase
    .from('auto_creator_processed')
    .select('*', { count: 'exact', head: true });

  const { count: todayProcessed } = await supabase
    .from('auto_creator_processed')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

  const { count: successLogs } = await supabase
    .from('auto_creator_logs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'success');

  const { count: failedLogs } = await supabase
    .from('auto_creator_logs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed');

  return {
    total: totalProcessed || 0,
    today: todayProcessed || 0,
    success: successLogs || 0,
    failed: failedLogs || 0,
  };
}

async function getRecentProcessed() {
  const { data, error } = await supabase
    .from('auto_creator_processed')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching recent processed:', error);
    return [];
  }

  return data || [];
}

async function getSettings() {
  const { data, error } = await supabase
    .from('auto_creator_settings')
    .select('*');

  if (error) {
    console.error('Error fetching settings:', error);
    return {};
  }

  const settings: Record<string, string> = {};
  data?.forEach((item) => {
    settings[item.setting_key] = item.setting_value;
  });

  return settings;
}

export default async function AutoCreatorDashboard() {
  const stats = await getStats();
  const recentProcessed = await getRecentProcessed();
  const settings = await getSettings();

  const isEnabled = settings.is_enabled === 'true';
  const lastExecution = settings.last_execution;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">AI自動投稿</h1>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {isEnabled ? '自動実行中' : '停止中'}
          </span>
          <Link
            href="/admin/auto-creator/settings"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            設定
          </Link>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">総処理数</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</div>
          <div className="mt-1 text-xs text-gray-500">累計</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">本日の処理数</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">{stats.today}</div>
          <div className="mt-1 text-xs text-gray-500">今日</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">成功</div>
          <div className="mt-2 text-3xl font-bold text-green-600">{stats.success}</div>
          <div className="mt-1 text-xs text-gray-500">実行ログ</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">失敗</div>
          <div className="mt-2 text-3xl font-bold text-red-600">{stats.failed}</div>
          <div className="mt-1 text-xs text-gray-500">実行ログ</div>
        </div>
      </div>

      {/* 最終実行情報 */}
      {lastExecution && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-800">最終実行:</span>
            <span className="text-sm text-blue-600">
              {new Date(lastExecution).toLocaleString('ja-JP')}
            </span>
          </div>
        </div>
      )}

      {/* 最近処理した記事 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">最近処理した記事</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  記事タイトル
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  投稿ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  処理日時
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentProcessed.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-md truncate">{item.article_title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.post_id ? (
                      <Link
                        href={`/posts/${item.post_id}`}
                        className="text-blue-600 hover:text-blue-800"
                        target="_blank"
                      >
                        {item.post_id}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.created_at).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <a
                      href={item.article_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      元記事
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {recentProcessed.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">処理済みの記事がありません</p>
          </div>
        )}
      </div>

      {/* クイックリンク */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/admin/auto-creator/logs"
          className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">実行履歴</h3>
          <p className="text-sm text-gray-600">
            AI自動投稿の実行履歴とエラーログを確認できます
          </p>
        </Link>

        <Link
          href="/admin/auto-creator/settings"
          className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">設定</h3>
          <p className="text-sm text-gray-600">
            スクレイピングURL、OpenAI APIキー、実行間隔などを設定できます
          </p>
        </Link>
      </div>
    </div>
  );
}
