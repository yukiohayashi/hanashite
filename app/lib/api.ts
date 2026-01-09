import { supabase } from './supabase';

// 検索履歴の型定義
export interface SearchHistory {
  id: number;
  user_id: number;
  search_keyword: string;
  search_type: string | null;
  result_count: number | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ユーザーの検索履歴を取得（最新5件、重複除外）
export async function getUserSearchHistory(userId: string | number): Promise<SearchHistory[]> {
  try {
    // userIdが"user_3863"のような文字列の場合、数値部分を抽出
    let numericUserId: number;
    if (typeof userId === 'string') {
      const match = userId.match(/\d+/);
      numericUserId = match ? parseInt(match[0], 10) : 0;
    } else {
      numericUserId = userId;
    }
    
    const { data, error } = await supabase
      .from('keyword_search_history')
      .select('*')
      .eq('user_id', numericUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('検索履歴取得エラー:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return [];
    }

    // 重複を除外し、最新5件のみを返す
    const uniqueKeywords = new Map<string, SearchHistory>();
    
    data?.forEach((item) => {
      if (!uniqueKeywords.has(item.search_keyword)) {
        uniqueKeywords.set(item.search_keyword, item);
      }
    });

    return Array.from(uniqueKeywords.values()).slice(0, 5);
  } catch (error) {
    console.error('検索履歴取得エラー:', error);
    return [];
  }
}

// ユーザーの検索履歴をすべて削除
export async function clearUserSearchHistory(userId: string | number): Promise<boolean> {
  try {
    // userIdが"user_3863"のような文字列の場合、数値部分を抽出
    let numericUserId: number;
    if (typeof userId === 'string') {
      const match = userId.match(/\d+/);
      numericUserId = match ? parseInt(match[0], 10) : 0;
    } else {
      numericUserId = userId;
    }
    
    const { error } = await supabase
      .from('keyword_search_history')
      .delete()
      .eq('user_id', numericUserId);

    if (error) {
      console.error('検索履歴削除エラー:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('検索履歴削除エラー:', error);
    return false;
  }
}

// 検索履歴を記録
export async function recordSearchHistory(
  userId: string | number,
  searchKeyword: string,
  searchType: string = 'keyword',
  resultCount: number = 0
): Promise<boolean> {
  try {
    // userIdを数値に変換（"user_3863"のような形式から数値を抽出）
    let numericUserId: number;
    if (typeof userId === 'string') {
      const match = userId.match(/\d+/);
      numericUserId = match ? parseInt(match[0], 10) : 0;
    } else {
      numericUserId = userId;
    }
    
    const { data, error } = await supabase
      .from('keyword_search_history')
      .insert({
        user_id: numericUserId,
        search_keyword: searchKeyword,
        search_type: searchType,
        result_count: resultCount,
        created_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('検索履歴記録エラー:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('検索履歴記録エラー:', error);
    return false;
  }
}
