import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    const defaultSettings = [
      { setting_key: 'enabled', setting_value: 'false' },
      { setting_key: 'interval', setting_value: '120' },
      { setting_key: 'interval_variance', setting_value: '30' },
      { setting_key: 'no_run_start', setting_value: '00:00' },
      { setting_key: 'no_run_end', setting_value: '06:00' },
      { setting_key: 'ai_member_probability', setting_value: '70' },
      { setting_key: 'posts_per_run', setting_value: '1' },
      { setting_key: 'votes_per_run', setting_value: '3' },
      { setting_key: 'votes_variance', setting_value: '2' },
      { setting_key: 'comments_per_run', setting_value: '1' },
      { setting_key: 'reply_probability', setting_value: '30' },
      { setting_key: 'like_probability', setting_value: '40' },
      { setting_key: 'post_like_probability', setting_value: '50' },
      { setting_key: 'author_reply_probability', setting_value: '70' },
      { setting_key: 'comment_min_length', setting_value: '10' },
      { setting_key: 'comment_max_length', setting_value: '60' },
      { setting_key: 'max_comments_per_post', setting_value: '50' },
      { setting_key: 'max_comments_variance', setting_value: '20' },
      { setting_key: 'prioritize_recent_posts', setting_value: '1' },
      { setting_key: 'priority_days', setting_value: '3' },
      { setting_key: 'priority_weight', setting_value: '5' },
      { setting_key: 'profile_weight', setting_value: 'medium' },
      { setting_key: 'content_weight', setting_value: 'medium' },
      { setting_key: 'mention_other_choices_probability', setting_value: '30' },
    ];

    // 既存の設定を確認
    const { data: existingSettings } = await supabase
      .from('auto_voter_settings')
      .select('setting_key');

    const existingKeys = new Set(existingSettings?.map(s => s.setting_key) || []);

    // 存在しない設定のみ追加
    const newSettings = defaultSettings.filter(s => !existingKeys.has(s.setting_key));

    if (newSettings.length > 0) {
      const { error } = await supabase
        .from('auto_voter_settings')
        .insert(newSettings);

      if (error) {
        console.error('Error inserting settings:', error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `${newSettings.length}件の設定を初期化しました`,
        initialized: newSettings.map(s => s.setting_key),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'すべての設定が既に存在します',
      initialized: [],
    });
  } catch (error) {
    console.error('Init settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize settings' },
      { status: 500 }
    );
  }
}
