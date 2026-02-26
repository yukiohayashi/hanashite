import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    console.log('=== AI自動コメント 手動実行開始 ===');
    
    // 設定を取得
    const { data: settingsData } = await supabase
      .from('auto_voter_settings')
      .select('*');

    const settings: Record<string, string> = {};
    settingsData?.forEach((item) => {
      settings[item.setting_key] = item.setting_value;
    });

    console.log('取得した設定:', {
      enabled: settings.enabled,
      posts_per_run: settings.posts_per_run,
      votes_per_run: settings.votes_per_run,
      votes_variance: settings.votes_variance,
      ai_member_probability: settings.ai_member_probability,
      reply_probability: settings.reply_probability,
      like_probability: settings.like_probability,
      post_like_probability: settings.post_like_probability,
      author_reply_probability: settings.author_reply_probability,
      comment_min_length: settings.comment_min_length,
      comment_max_length: settings.comment_max_length,
      max_comments_per_post: settings.max_comments_per_post,
      max_comments_variance: settings.max_comments_variance,
      prioritize_recent_posts: settings.prioritize_recent_posts,
      priority_days: settings.priority_days,
      priority_weight: settings.priority_weight,
      profile_weight: settings.profile_weight,
      content_weight: settings.content_weight,
      mention_other_choices_probability: settings.mention_other_choices_probability,
    });

    // 自動実行APIを呼び出し
    const executeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auto-voter/execute-auto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const executeData = await executeResponse.json();
    console.log('実行結果:', executeData);

    if (executeData.success) {
      return NextResponse.json({
        success: true,
        message: `✅ 実行完了: ${executeData.message}`,
        details: executeData.details || {},
        settings: {
          posts_per_run: settings.posts_per_run,
          votes_per_run: settings.votes_per_run,
          votes_variance: settings.votes_variance,
          ai_member_probability: settings.ai_member_probability,
          comment_settings: {
            reply_probability: settings.reply_probability,
            like_probability: settings.like_probability,
            author_reply_probability: settings.author_reply_probability,
            min_length: settings.comment_min_length,
            max_length: settings.comment_max_length,
            max_comments: settings.max_comments_per_post,
            variance: settings.max_comments_variance,
          },
          priority_settings: {
            enabled: settings.prioritize_recent_posts === '1',
            days: settings.priority_days,
            weight: settings.priority_weight,
          },
          content_settings: {
            profile_weight: settings.profile_weight,
            content_weight: settings.content_weight,
            mention_other_choices_probability: settings.mention_other_choices_probability,
          },
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        message: executeData.message || executeData.error || '実行に失敗しました',
        error: executeData.error,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('手動実行エラー:', error);
    return NextResponse.json(
      {
        success: false,
        message: '実行中にエラーが発生しました',
        error: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
