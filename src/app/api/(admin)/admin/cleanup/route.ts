import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json();

    const deletedCounts: { [key: string]: number } = {};

    // 全ての投稿IDを取得
    const { data: allPosts } = await supabase
      .from('posts')
      .select('id');

    const postIds = new Set((allPosts || []).map(p => p.id));

    if (type === 'all' || type === 'comments') {
      // 孤立したコメントを削除（全件対象）
      let deletedCount = 0;
      let hasMore = true;
      
      while (hasMore) {
        const { data: comments } = await supabase
          .from('comments')
          .select('id, post_id')
          .limit(1000);

        if (!comments || comments.length === 0) {
          hasMore = false;
          break;
        }

        const orphanedComments = comments.filter(
          c => !postIds.has(c.post_id)
        );

        if (orphanedComments.length > 0) {
          const ids = orphanedComments.map(c => c.id);
          const { error } = await supabase
            .from('comments')
            .delete()
            .in('id', ids);

          if (!error) {
            deletedCount += orphanedComments.length;
          }
        }

        // 全てのコメントをチェックしたら終了
        if (comments.length < 1000) {
          hasMore = false;
        }
      }

      if (deletedCount > 0) {
        deletedCounts['コメント'] = deletedCount;
      }
    }

    if (type === 'all' || type === 'keywords') {
      // 投稿が存在しないキーワードを削除（カテゴリタイプは除外）
      const { data: orphanedKeywords } = await supabase
        .from('keywords')
        .select('id')
        .neq('keyword_type', 'category')
        .eq('post_count', 0);

      if (orphanedKeywords && orphanedKeywords.length > 0) {
        const ids = orphanedKeywords.map(k => k.id);
        const { error } = await supabase
          .from('keywords')
          .delete()
          .in('id', ids);

        if (!error) {
          deletedCounts['キーワード'] = orphanedKeywords.length;
        }
      }
    }

    if (type === 'all' || type === 'likes') {
      // 孤立したいいねを削除（全件対象）
      const { data: likes } = await supabase
        .from('likes')
        .select('id, like_type, target_id')
        .eq('like_type', 'post');

      const orphanedLikes = likes?.filter(
        l => !postIds.has(l.target_id)
      ) || [];

      if (orphanedLikes.length > 0) {
        const ids = orphanedLikes.map(l => l.id);
        const { error } = await supabase
          .from('likes')
          .delete()
          .in('id', ids);

        if (!error) {
          deletedCounts['いいね'] = orphanedLikes.length;
        }
      }
    }

    if (type === 'all' || type === 'favorites') {
      // 孤立したお気に入りを削除（全件対象）
      const { data: favorites } = await supabase
        .from('favorites')
        .select('id, post_id');

      const orphanedFavorites = favorites?.filter(
        f => !postIds.has(f.post_id)
      ) || [];

      if (orphanedFavorites.length > 0) {
        const ids = orphanedFavorites.map(f => f.id);
        const { error } = await supabase
          .from('favorites')
          .delete()
          .in('id', ids);

        if (!error) {
          deletedCounts['お気に入り'] = orphanedFavorites.length;
        }
      }
    }

    const message = Object.entries(deletedCounts)
      .map(([key, count]) => `${key}: ${count}件`)
      .join(', ');

    return NextResponse.json({
      success: true,
      message: message || '削除するデータがありませんでした',
      deletedCounts,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'クリーンアップ処理に失敗しました' },
      { status: 500 }
    );
  }
}
