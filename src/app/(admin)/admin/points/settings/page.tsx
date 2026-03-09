'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface PointSetting {
  id: number;
  point_type: string;
  point_value: number;
  label: string;
  description: string;
  is_active: boolean;
  display_order: number;
}

export default function PointsSettingsPage() {
  const [settings, setSettings] = useState<PointSetting[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('point_settings')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      if (data) setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleValueChange = (id: number, value: number) => {
    setSettings(settings.map(s => 
      s.id === id ? { ...s, point_value: value } : s
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      for (const setting of settings) {
        const { error } = await supabase
          .from('point_settings')
          .update({ 
            point_value: setting.point_value,
            updated_at: new Date().toISOString()
          })
          .eq('id', setting.id);

        if (error) throw error;
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

  const getIcon = (pointType: string) => {
    switch (pointType) {
      case 'regist':
        return '👤';
      case 'login':
        return '🔑';
      case 'post':
        return '📝';
      case 'comment':
        return '💬';
      case 'best_answer':
        return '🏆';
      case 'incentive':
        return '🎁';
      case 'campaign':
        return '🎉';
      default:
        return '⭐';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ポイント設定</h1>
        <p className="mt-2 text-sm text-gray-600">各アクションで付与されるポイント数を設定します。</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.includes('成功') || message.includes('保存しました') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {settings.map((setting) => (
              <div key={setting.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{getIcon(setting.point_type)}</span>
                  <div>
                    <h3 className="font-medium text-gray-900">{setting.label}</h3>
                    <p className="text-xs text-gray-500">{setting.point_type}</p>
                  </div>
                </div>
                <input
                  type="number"
                  value={setting.point_value}
                  onChange={(e) => handleValueChange(setting.id, parseInt(e.target.value) || 0)}
                  min="0"
                  max="10000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {setting.description && (
                  <p className="mt-2 text-xs text-gray-500">{setting.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400 font-medium"
          >
            {saving ? '保存中...' : '設定を保存'}
          </button>
        </div>
      </form>

      {/* ポイント付与状況 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">ポイント付与状況</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600">
            ポイント履歴は「ポイント履歴」ページで確認できます。
          </p>
        </div>
      </div>
    </div>
  );
}
