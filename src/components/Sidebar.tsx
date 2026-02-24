import { supabase } from '../lib/supabase';
import SidebarClient from './SidebarClient';

interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
}

export default async function Sidebar() {
  // サーバーサイドでカテゴリを取得（キャッシュ可能）
  const { data: categoriesData } = await supabase
    .from('categories')
    .select('id, name, slug, icon')
    .eq('is_active', true)
    .neq('slug', 'announcement')
    .order('display_order', { ascending: true });

  const categories = categoriesData || [];

  return <SidebarClient categories={categories} />;
}
