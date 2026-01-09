import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

async function getSettings() {
  const { data, error } = await supabase
    .from('auto_creator_settings')
    .select('*');

  if (error) {
    throw new Error('設定の取得に失敗しました');
  }

  const settings: Record<string, string> = {};
  data?.forEach((item) => {
    settings[item.setting_key] = item.setting_value;
  });

  return settings;
}

async function logExecution(
  status: string,
  message?: string,
  errorMessage?: string,
  aggregatedUsers?: number
) {
  await supabase.from('points_aggregate_logs').insert({
    execution_type: 'cron',
    status,
    message,
    error_message: errorMessage,
    aggregated_users: aggregatedUsers,
    executed_at: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('x-api-secret');
    if (authHeader !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getSettings();

    if (settings.points_aggregate_enabled !== 'true') {
      console.log('ポイント集計が停止中です');
      return NextResponse.json({
        success: false,
        message: 'ポイント集計が停止中です',
      });
    }

    const { data: users } = await supabase
      .from('users')
      .select('id')
      .neq('status', 0);

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: false,
        message: '集計対象ユーザーがいません',
      });
    }

    let aggregatedCount = 0;

    for (const user of users) {
      try {
        const { data: pointHistory } = await supabase
          .from('point_history')
          .select('points')
          .eq('user_id', user.id);

        const totalPoints = pointHistory?.reduce((sum, record) => sum + (record.points || 0), 0) || 0;

        await supabase
          .from('users')
          .update({
            total_points: totalPoints,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        aggregatedCount++;
      } catch (error) {
        console.error(`User ${user.id} points aggregation error:`, error);
      }
    }

    const { data: topUsers } = await supabase
      .from('users')
      .select('id, name, total_points')
      .order('total_points', { ascending: false })
      .limit(100);

    if (topUsers) {
      for (let i = 0; i < topUsers.length; i++) {
        await supabase
          .from('users')
          .update({ rank: i + 1 })
          .eq('id', topUsers[i].id);
      }
    }

    await logExecution(
      'success',
      `${aggregatedCount}人のポイント集計完了`,
      undefined,
      aggregatedCount
    );

    return NextResponse.json({
      success: true,
      message: `${aggregatedCount}人のポイント集計が完了しました`,
      aggregated_users: aggregatedCount,
    });
  } catch (error) {
    console.error('CRON points-aggregate error:', error);
    const errorMessage = error instanceof Error ? error.message : 'ポイント集計に失敗しました';

    await logExecution('error', undefined, errorMessage);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
