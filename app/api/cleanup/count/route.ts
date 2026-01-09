import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // 全投稿IDを取得
    const { data: posts } = await supabase
      .from('posts')
      .select('id');

    const postIds = posts?.map(p => p.id) || [];

    // 孤立した投票選択肢
    const { data: voteChoices } = await supabase
      .from('vote_choices')
      .select('id, post_id');

    const orphaned_vote_choices = voteChoices?.filter(
      vc => !postIds.includes(vc.post_id)
    ).length || 0;

    // 孤立した投票オプション
    const { data: voteOptions } = await supabase
      .from('vote_options')
      .select('id, post_id');

    const orphaned_vote_options = voteOptions?.filter(
      vo => !postIds.includes(vo.post_id)
    ).length || 0;

    // 孤立したコメント
    const { data: comments } = await supabase
      .from('comments')
      .select('id, post_id');

    const orphaned_comments = comments?.filter(
      c => !postIds.includes(c.post_id)
    ).length || 0;

    // 投稿が存在しないキーワード（カテゴリタイプは除外）
    const { data: keywords } = await supabase
      .from('keywords')
      .select('id, keyword_type, post_count')
      .neq('keyword_type', 'category')
      .eq('post_count', 0);

    const orphaned_keywords = keywords?.length || 0;

    // 孤立したいいね
    const { data: likes } = await supabase
      .from('likes')
      .select('id, like_type, target_id')
      .eq('like_type', 'post');

    const orphaned_likes = likes?.filter(
      l => !postIds.includes(l.target_id)
    ).length || 0;

    // 孤立したお気に入り
    const { data: favorites } = await supabase
      .from('favorites')
      .select('id, post_id');

    const orphaned_favorites = favorites?.filter(
      f => !postIds.includes(f.post_id)
    ).length || 0;

    return NextResponse.json({
      orphaned_vote_choices,
      orphaned_vote_options,
      orphaned_comments,
      orphaned_keywords,
      orphaned_likes,
      orphaned_favorites,
    });
  } catch (error) {
    console.error('Count error:', error);
    return NextResponse.json(
      { error: '件数取得に失敗しました' },
      { status: 500 }
    );
  }
}
