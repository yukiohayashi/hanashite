import { supabase } from '@/lib/supabase';

async function getLogs(status?: string, limit: number = 100) {
  let query = supabase
    .from('auto_creator_logs')
    .select('*')
    .order('executed_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data: logs, error } = await query.limit(limit);

  if (error) {
    console.error('Error fetching logs:', error);
    return [];
  }

  return logs || [];
}

async function getLogCounts() {
  const { count: allCount } = await supabase
    .from('auto_creator_logs')
    .select('*', { count: 'exact', head: true });

  const { count: successCount } = await supabase
    .from('auto_creator_logs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'success');

  const { count: failedCount } = await supabase
    .from('auto_creator_logs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed');

  return {
    all: allCount || 0,
    success: successCount || 0,
    failed: failedCount || 0,
  };
}

export default async function AutoCreatorLogs({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const status = params.status;
  const limit = params.limit ? parseInt(params.limit) : 100;
  const logs = await getLogs(status, limit);
  const counts = await getLogCounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI自動投稿 実行履歴</h1>
      </div>

      {/* 表示件数選択 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">表示件数:</span>
          <a
            href={`/admin/auto-creator/logs${status ? `?status=${status}&` : '?'}limit=50`}
            className={`px-3 py-1 rounded ${
              limit === 50 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            50件
          </a>
          <a
            href={`/admin/auto-creator/logs${status ? `?status=${status}&` : '?'}limit=100`}
            className={`px-3 py-1 rounded ${
              limit === 100 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            100件
          </a>
          <a
            href={`/admin/auto-creator/logs${status ? `?status=${status}&` : '?'}limit=200`}
            className={`px-3 py-1 rounded ${
              limit === 200 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            200件
          </a>
        </div>
      </div>

      {/* ステータスフィルタ */}
      <div className="flex items-center gap-2 text-sm">
        <a
          href="/admin/auto-creator/logs"
          className={`hover:text-blue-600 ${
            !status ? 'text-blue-600 font-semibold' : 'text-gray-600'
          }`}
        >
          すべて ({counts.all})
        </a>
        <span className="text-gray-400">|</span>
        <a
          href="/admin/auto-creator/logs?status=success"
          className={`hover:text-blue-600 ${
            status === 'success' ? 'text-blue-600 font-semibold' : 'text-gray-600'
          }`}
        >
          成功 ({counts.success})
        </a>
        <span className="text-gray-400">|</span>
        <a
          href="/admin/auto-creator/logs?status=failed"
          className={`hover:text-blue-600 ${
            status === 'failed' ? 'text-blue-600 font-semibold' : 'text-gray-600'
          }`}
        >
          失敗 ({counts.failed})
        </a>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  実行タイプ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  記事URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  投稿ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  メッセージ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  実行日時
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.execution_type === 'auto' ? '自動' : '手動'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {log.article_url ? (
                      <a
                        href={log.article_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 truncate block max-w-xs"
                      >
                        {log.article_url}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.post_id ? (
                      <a
                        href={`/posts/${log.post_id}`}
                        target="_blank"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {log.post_id}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.status === 'success' ? (
                      <span className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                        成功
                      </span>
                    ) : log.status === 'failed' ? (
                      <span className="inline-flex px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                        失敗
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                        {log.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-md">
                      {log.message && (
                        <div className="text-gray-700">{log.message}</div>
                      )}
                      {log.error_message && (
                        <div className="text-red-600 text-xs mt-1">{log.error_message}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.executed_at).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">実行履歴がありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
