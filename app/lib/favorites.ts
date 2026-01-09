import { supabaseAdmin } from './supabase';

/**
 * お気に入り機能のユーティリティ
 */

export interface Favorite {
  id: number;
  user_id: number;
  post_id: number;
  created_at: string;
}

/**
 * お気に入りの追加/削除をトグル
 */
export async function toggleFavorite(userId: number, postId: number): Promise<{ action: 'added' | 'removed'; count: number }> {
  console.log('toggleFavorite called - userId:', userId, 'postId:', postId);
  
  // 既存のお気に入りをチェック
  const { data: existing, error: checkError } = await supabaseAdmin
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .single();

  console.log('既存チェック - existing:', existing, 'error:', checkError);

  if (existing) {
    // 削除
    console.log('お気に入り削除開始');
    const { error: deleteError } = await supabaseAdmin
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);

    console.log('削除結果 - error:', deleteError);

    const count = await getFavoriteCount(postId);
    console.log('削除後のカウント:', count);
    return { action: 'removed', count };
  } else {
    // 追加
    console.log('お気に入り追加開始');
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('favorites')
      .insert({
        user_id: userId,
        post_id: postId
      })
      .select();

    console.log('追加結果 - data:', insertData, 'error:', insertError);

    const count = await getFavoriteCount(postId);
    console.log('追加後のカウント:', count);
    return { action: 'added', count };
  }
}

/**
 * お気に入り状態をチェック
 */
export async function isFavorited(userId: number, postId: number): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .single();

  return !!data;
}

/**
 * 投稿のお気に入り数を取得
 */
export async function getFavoriteCount(postId: number): Promise<number> {
  const { count } = await supabaseAdmin
    .from('favorites')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  return count || 0;
}

/**
 * ユーザーのお気に入り投稿IDリストを取得
 */
export async function getUserFavorites(userId: number, limit: number = 20, offset: number = 0): Promise<number[]> {
  const { data } = await supabaseAdmin
    .from('favorites')
    .select('post_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return data ? data.map(f => f.post_id) : [];
}

/**
 * お気に入りランキングを取得
 */
export async function getFavoritesRanking(limit: number = 10, days: number = 30): Promise<{ post_id: number; count: number }[]> {
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);

  const { data } = await supabaseAdmin
    .from('favorites')
    .select('post_id')
    .gte('created_at', dateFrom.toISOString());

  if (!data) return [];

  // 投稿IDごとにカウント
  const countMap = new Map<number, number>();
  data.forEach(f => {
    countMap.set(f.post_id, (countMap.get(f.post_id) || 0) + 1);
  });

  // ランキング形式に変換してソート
  return Array.from(countMap.entries())
    .map(([post_id, count]) => ({ post_id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * ユーザーのお気に入り総数を取得
 */
export async function getUserFavoriteCount(userId: number): Promise<number> {
  const { count } = await supabaseAdmin
    .from('favorites')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  return count || 0;
}
