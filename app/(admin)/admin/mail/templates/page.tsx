import { supabase } from '@/lib/supabase';
import Link from 'next/link';

async function getTemplates() {
  const { data: templates, error } = await supabase
    .from('mail_templates')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching templates:', error);
    return [];
  }

  return templates || [];
}

export default async function MailTemplatesPage() {
  const templates = await getTemplates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">メールテンプレート</h1>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                名前
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                キー
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                件名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状態
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {templates.map((template) => (
              <tr key={template.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {template.id}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div>
                    <div className="font-medium">{template.name}</div>
                    {template.description && (
                      <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {template.template_key}
                  </code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {template.subject}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {template.is_active ? (
                    <span className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                      有効
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                      無効
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link
                    href={`/admin/mail/templates/${template.id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    編集
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">テンプレートがありません</p>
        </div>
      )}
    </div>
  );
}
