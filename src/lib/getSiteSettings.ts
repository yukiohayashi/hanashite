import { supabase } from './supabase';

export interface SiteSettings {
  site_name: string;
  site_catchphrase: string;
  site_description: string;
  site_url: string;
  powered_by_text: string;
  total_posts_count: string;
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  footer_copyright: string;
  maintenance_mode: string;
  twitter_url: string;
  instagram_url: string;
  tiktok_url: string;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const { data } = await supabase
    .from('site_settings')
    .select('setting_key, setting_value');

  const settings: Partial<SiteSettings> = {};
  
  if (data) {
    data.forEach((item) => {
      settings[item.setting_key as keyof SiteSettings] = item.setting_value || '';
    });
  }

  return {
    site_name: settings.site_name || '',
    site_catchphrase: settings.site_catchphrase || '',
    site_description: settings.site_description || '',
    site_url: settings.site_url || '',
    powered_by_text: settings.powered_by_text || '',
    total_posts_count: settings.total_posts_count || '',
    company_name: settings.company_name || '',
    company_address: settings.company_address || '',
    company_phone: settings.company_phone || '',
    company_email: settings.company_email || '',
    footer_copyright: settings.footer_copyright || '',
    maintenance_mode: settings.maintenance_mode || '',
    twitter_url: settings.twitter_url || '',
    instagram_url: settings.instagram_url || '',
    tiktok_url: settings.tiktok_url || '',
  };
}
