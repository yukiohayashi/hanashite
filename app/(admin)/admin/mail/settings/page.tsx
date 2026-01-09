'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface MailSettings {
  id: number;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  from_email: string;
  from_name: string;
  use_ssl: boolean;
  is_active: boolean;
}

export default function MailSettingsPage() {
  const [settings, setSettings] = useState<MailSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('mail_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) throw error;
      if (data) setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('mail_settings')
        .update({
          smtp_host: settings.smtp_host,
          smtp_port: settings.smtp_port,
          smtp_user: settings.smtp_user,
          smtp_pass: settings.smtp_pass,
          from_email: settings.from_email,
          from_name: settings.from_name,
          use_ssl: settings.use_ssl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) throw error;

      setMessage('設定を保存しました');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleTestMail = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/send-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: settings.from_email,
          subject: 'テストメール',
          body: 'これはテストメールです。\n\nSMTP設定が正しく動作しています。',
          templateKey: 'test',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('テストメールを送信しました');
      } else {
        setMessage(`送信失敗: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending test mail:', error);
      setMessage('テストメール送信に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return <div className="p-6">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">SMTP設定</h1>
        <p className="mt-2 text-sm text-gray-600">メール送信に使用するSMTP設定を管理します</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.includes('成功') || message.includes('保存しました') || message.includes('送信しました') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="smtp_host" className="block text-sm font-medium text-gray-700 mb-2">
                SMTPホスト <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="smtp_host"
                value={settings.smtp_host}
                onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">例: mail10.onamae.ne.jp</p>
            </div>

            <div>
              <label htmlFor="smtp_port" className="block text-sm font-medium text-gray-700 mb-2">
                SMTPポート <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                id="smtp_port"
                value={settings.smtp_port}
                onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">SSL: 465, TLS: 587</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="smtp_user" className="block text-sm font-medium text-gray-700 mb-2">
                SMTPユーザー名 <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="smtp_user"
                value={settings.smtp_user}
                onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="smtp_pass" className="block text-sm font-medium text-gray-700 mb-2">
                SMTPパスワード <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="smtp_pass"
                  value={settings.smtp_pass}
                  onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  {showPassword ? '隠す' : '表示'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="from_email" className="block text-sm font-medium text-gray-700 mb-2">
                送信元メールアドレス <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                id="from_email"
                value={settings.from_email}
                onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="from_name" className="block text-sm font-medium text-gray-700 mb-2">
                送信元名 <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="from_name"
                value={settings.from_name}
                onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.use_ssl}
                onChange={(e) => setSettings({ ...settings, use_ssl: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                SSL/TLS を使用する（推奨）
              </span>
            </label>
            <p className="mt-2 text-sm text-gray-500">
              ポート465の場合はSSL、ポート587の場合はTLSを使用します
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <button
            type="button"
            onClick={handleTestMail}
            disabled={saving}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 font-medium"
          >
            {saving ? 'テスト中...' : 'テストメール送信'}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            {saving ? '保存中...' : '設定を保存'}
          </button>
        </div>
      </form>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-yellow-800 mb-2">⚠️ セキュリティに関する注意</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• SMTPパスワードは暗号化されずに保存されます</li>
          <li>• 本番環境では環境変数での管理を推奨します</li>
          <li>• 定期的にパスワードを変更してください</li>
        </ul>
      </div>
    </div>
  );
}
