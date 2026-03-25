import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // 全投稿を対象
    const { data: allPosts, error: postsError } = await supabase
      .from('posts')
      .select('id');

    if (postsError) {
      console.error('Posts fetch error:', postsError);
      return NextResponse.json({ error: postsError.message }, { status: 500 });
    }

    const postIds = new Set((allPosts || []).map(p => p.id));
    
    console.log('Total posts fetched:', postIds.size);

    // 孤立した投票選択肢
    const { data: voteChoices, error: voteChoicesError } = await supabase
      .from('vote_choices')
      .select('id, post_id');

    if (voteChoicesError) {
      console.error('Vote choices fetch error:', voteChoicesError);
    }

    console.log('Total vote_choices:', voteChoices?.length);
    const orphaned_vote_choices = voteChoices?.filter(
      vc => !postIds.has(vc.post_id)
    ).length || 0;
    console.log('Orphaned vote_choices:', orphaned_vote_choices);

    // 孤立した投票オプション
    const { data: voteOptions, error: voteOptionsError } = await supabase
      .from('vote_options')
      .select('id, post_id');

    if (voteOptionsError) {
      console.error('Vote options fetch error:', voteOptionsError);
    }

    console.log('Total vote_options:', voteOptions?.length);
    const orphaned_vote_options = voteOptions?.filter(
      vo => !postIds.has(vo.post_id)
    ).length || 0;
    console.log('Orphaned vote_options:', orphaned_vote_options);

    // 孤立したコメント
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('id, post_id');

    if (commentsError) {
      console.error('Comments fetch error:', commentsError);
    }

    console.log('Total comments:', comments?.length);
    const orphaned_comments = comments?.filter(
      c => !postIds.has(c.post_id)
    ).length || 0;
    console.log('Orphaned comments:', orphaned_comments);

    // 投稿が存在しないキーワード（カテゴリタイプは除外）
    const { data: keywords } = await supabase
      .from('keywords')
      .select('id, keyword_type, post_count')
      .neq('keyword_type', 'category')
      .eq('post_count', 0);

    const orphaned_keywords = keywords?.length || 0;

    // 孤立したいいね
    const { data: likes, error: likesError } = await supabase
      .from('likes')
      .select('id, like_type, target_id')
      .eq('like_type', 'post');

    if (likesError) {
      console.error('Likes fetch error:', likesError);
    }

    const orphaned_likes = likes?.filter(
      l => !postIds.has(l.target_id)
    ).length || 0;

    // 孤立したお気に入り
    const { data: favorites, error: favoritesError } = await supabase
      .from('favorites')
      .select('id, post_id');

    if (favoritesError) {
      console.error('Favorites fetch error:', favoritesError);
    }

    const orphaned_favorites = favorites?.filter(
      f => !postIds.has(f.post_id)
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
