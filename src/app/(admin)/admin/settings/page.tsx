import { Metadata } from 'next';
import SiteSettingsForm from './SiteSettingsForm';
import { supabaseAdmin } from '@/lib/supabase';

export const metadata: Metadata = {
  title: '基本設定｜ハナシテ',
};

async function getSettings() {
  const { data } = await supabaseAdmin
    .from('site_settings')
    .select('*');

  if (!data) return [];

  // カスタム順序で並び替え
  const order = [
    'site_name',
    'site_catchphrase',
    'site_description',
    'site_url',
    'powered_by_text',
    'total_posts_count',
    'company_name',
    'company_address',
    'company_phone',
    'company_email',
    'footer_copyright',
    'maintenance_mode',
    'twitter_url',
    'instagram_url',
    'tiktok_url',
  ];

  return data.sort((a, b) => {
    const indexA = order.indexOf(a.setting_key);
    const indexB = order.indexOf(b.setting_key);
    return indexA - indexB;
  });
}

export default async function SiteSettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">基本設定</h1>
        <p className="mt-2 text-gray-600">サイトの基本情報を管理します</p>
      </div>

      <SiteSettingsForm initialSettings={settings} />
    </div>
  );
}
