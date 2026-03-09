'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SiteSetting {
  id: number;
  setting_key: string;
  setting_value: string | null;
  setting_type: string;
  description: string | null;
}

interface SiteSettingsFormProps {
  initialSettings: SiteSetting[];
}

export default function SiteSettingsForm({ initialSettings }: SiteSettingsFormProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, string>>(
    initialSettings.reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value || '';
      return acc;
    }, {} as Record<string, string>)
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('設定を保存しました');
        setMessageType('success');
        router.refresh();
      } else {
        setMessage(data.error || '保存に失敗しました');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('エラーが発生しました');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const settingLabels: Record<string, string> = {
    site_name: 'サイト名',
    site_catchphrase: 'キャッチコピー',
    site_description: 'サイト説明文',
    site_url: 'サイトURL',
    powered_by_text: 'Powered byテキスト',
    total_posts_count: '相談合計数',
    company_name: '会社名',
    company_address: '会社住所',
    company_phone: '電話番号',
    company_email: '会社メールアドレス',
    footer_copyright: 'フッター著作権表示',
    maintenance_mode: 'メンテナンスモード',
    twitter_url: 'X (Twitter) URL',
    instagram_url: 'Instagram URL',
    tiktok_url: 'TikTok URL',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {message && (
        <div className={`mb-4 p-4 rounded ${
          messageType === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {initialSettings.map((setting) => (
          <div key={setting.id}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {settingLabels[setting.setting_key] || setting.setting_key}
            </label>
            {setting.description && (
              <p className="text-xs text-gray-500 mb-2">{setting.description}</p>
            )}
            {setting.setting_type === 'boolean' ? (
              <select
                value={settings[setting.setting_key]}
                onChange={(e) => handleChange(setting.setting_key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="false">無効</option>
                <option value="true">有効</option>
              </select>
            ) : setting.setting_key === 'site_catchphrase' || setting.setting_key === 'site_description' || setting.setting_key === 'company_address' ? (
              <textarea
                value={settings[setting.setting_key]}
                onChange={(e) => handleChange(setting.setting_key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                disabled={loading}
              />
            ) : (
              <input
                type={setting.setting_type === 'email' ? 'email' : setting.setting_type === 'number' ? 'number' : 'text'}
                value={settings[setting.setting_key]}
                onChange={(e) => handleChange(setting.setting_key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            )}
          </div>
        ))}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-6 rounded-md transition-colors"
          >
            {loading ? '保存中...' : '設定を保存'}
          </button>
        </div>
      </form>
    </div>
  );
}
