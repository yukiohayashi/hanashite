import { supabase } from './supabase';

export interface Keyword {
  id: number;
  keyword: string;
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
 * IDからキーワードを取得
 */
export async function getKeywordById(id: number): Promise<Keyword | null> {
  const { data, error } = await supabase
    .from('keywords')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('❌ Error fetching keyword:', error);
      console.error('Searched id:', id);
    }
    return null;
  }

  return data;
}

/**
 * 人気検索ワードを取得（keyword_search_historyから集計）
 * keywordsテーブルに存在しないキーワードも含む
 */
export async function getPopularKeywords(limit: number = 10): Promise<Array<{ keyword: string; count: number }>> {
  // keyword_search_historyから検索キーワードを集計
  const { data: searchHistory, error: historyError } = await supabase
    .from('keyword_search_history')
    .select('search_keyword');

  if (historyError) {
    console.error('Error fetching search history:', historyError);
    return [];
  }

  // 検索キーワードの出現回数をカウント
  const keywordCounts: { [key: string]: number } = {};
  searchHistory?.forEach((item) => {
    const keyword = item.search_keyword;
    keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
  });

  // 出現回数でソートして上位を取得
  return Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([keyword, count]) => ({ keyword, count }));
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
