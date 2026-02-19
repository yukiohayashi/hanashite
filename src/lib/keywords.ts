import { supabase } from './supabase';

export interface Keyword {
  id: number;
  keyword: string;
  slug: string;
  description?: string;
  keyword_type: string;
  parent_id?: number;
  display_order: number;
  is_featured: boolean;
  post_count: number;
  search_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * スラッグからキーワードを取得
 */
export async function getKeywordBySlug(slug: string): Promise<Keyword | null> {
  console.log('🔍 Searching for keyword with slug:', slug);
  
  // 大文字小文字を区別しない検索（ilike使用）
  const { data, error } = await supabase
    .from('keywords')
    .select('*')
    .ilike('slug', slug)
    .single();

  if (error) {
    // PGRST116 は "no rows returned" エラー（キーワードが見つからない場合）
    if (error.code === 'PGRST116') {
      console.log('Keyword not found for slug:', slug);
    } else {
      console.error('❌ Error fetching keyword:', error);
      console.error('Searched slug:', slug);
    }
    return null;
  }

  console.log('✅ Found keyword:', data?.keyword);
  return data;
}

/**
 * 人気キーワードを取得
 */
export async function getPopularKeywords(limit: number = 10): Promise<Keyword[]> {
  const { data, error } = await supabase
    .from('keywords')
    .select('*')
    .order('search_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching popular keywords:', error);
    return [];
  }

  return data || [];
}

/**
 * 最新キーワードを取得
 */
export async function getLatestKeywords(limit: number = 10): Promise<Keyword[]> {
  const { data, error } = await supabase
    .from('keywords')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching latest keywords:', error);
    return [];
  }

  return data || [];
}

/**
 * 注目キーワードを取得
 */
export async function getFeaturedKeywords(limit: number = 10): Promise<Keyword[]> {
  const { data, error } = await supabase
    .from('keywords')
    .select('*')
    .eq('is_featured', true)
    .order('display_order', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching featured keywords:', error);
    return [];
  }

  return data || [];
}

/**
 * 検索履歴を記録
 */
export async function recordSearchHistory(
  searchKeyword: string,
  userId?: number,
  resultCount: number = 0
): Promise<void> {
  const { error } = await supabase
    .from('keyword_search_history')
    .insert({
      user_id: userId,
      search_keyword: searchKeyword,
      search_type: 'all',
      result_count: resultCount
    });

  if (error) {
    console.error('Error recording search history:', error);
  }
}

/**
 * キーワードの検索回数を更新
 */
export async function incrementSearchCount(keywordId: number): Promise<void> {
  const { error } = await supabase.rpc('increment_search_count', {
    keyword_id: keywordId
  });

  if (error) {
    console.error('Error incrementing search count:', error);
  }
}
