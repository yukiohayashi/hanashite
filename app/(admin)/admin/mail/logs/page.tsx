import { supabase } from '@/lib/supabase';

async function getMailLogs(status?: string, limit: number = 100) {
  let query = supabase
    .from('mail_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data: logs, error } = await query.limit(limit);

  if (error) {
    console.error('Error fetching mail logs:', error);
    return [];
  }

  return logs || [];
}

async function getMailLogCounts() {
  const { count: allCount } = await supabase
    .from('mail_logs')
    .select('*', { count: 'exact', head: true });

  const { count: sentCount } = await supabase
    .from('mail_logs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sent');

  const { count: failedCount } = await supabase
    .from('mail_logs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed');

  return {
    all: allCount || 0,
    sent: sentCount || 0,
    failed: failedCount || 0,
  };
}

export default async function MailLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const status = params.status;
  const limit = params.limit ? parseInt(params.limit) : 100;
  const logs = await getMailLogs(status, limit);
  const counts = await getMailLogCounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">メール送信履歴</h1>
      </div>

      {/* 表示件数選択 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">表示件数:</span>
          <a
            href={`/admin/mail/logs${status ? `?status=${status}&` : '?'}limit=50`}
            className={`px-3 py-1 rounded ${
              limit === 50 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            50件
          </a>
          <a
            href={`/admin/mail/logs${status ? `?status=${status}&` : '?'}limit=100`}
            className={`px-3 py-1 rounded ${
              limit === 100 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            100件
          </a>
          <a
            href={`/admin/mail/logs${status ? `?status=${status}&` : '?'}limit=200`}
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
          href="/admin/mail/logs"
          className={`hover:text-blue-600 ${
            !status ? 'text-blue-600 font-semibold' : 'text-gray-600'
          }`}
        >
          すべて ({counts.all})
        </a>
        <span className="text-gray-400">|</span>
        <a
          href="/admin/mail/logs?status=sent"
          className={`hover:text-blue-600 ${
            status === 'sent' ? 'text-blue-600 font-semibold' : 'text-gray-600'
          }`}
        >
          送信成功 ({counts.sent})
        </a>
        <span className="text-gray-400">|</span>
        <a
          href="/admin/mail/logs?status=failed"
          className={`hover:text-blue-600 ${
            status === 'failed' ? 'text-blue-600 font-semibold' : 'text-gray-600'
          }`}
        >
          送信失敗 ({counts.failed})
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
                  送信先
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  件名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  テンプレート
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  送信日時
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {log.to_email}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {log.subject}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.template_key ? (
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {log.template_key}
                      </code>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.status === 'sent' ? (
                      <span className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                        送信成功
                      </span>
                    ) : log.status === 'failed' ? (
                      <span className="inline-flex px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                        送信失敗
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                        {log.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.sent_at ? (
                      <>
                        {new Date(log.sent_at).toLocaleDateString('ja-JP')}
                        <br />
                        {new Date(log.sent_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">送信履歴がありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
