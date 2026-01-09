import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: '環境変数が設定されていません' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 最大IDを取得
    const { data: maxData, error: maxError } = await supabase
      .from('points')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    if (maxError) {
      return NextResponse.json(
        { error: '最大ID取得エラー', details: maxError },
        { status: 500 }
      );
    }

    const maxId = maxData && maxData.length > 0 ? maxData[0].id : 0;

    // PostgreSQL関数を使用してシーケンスをリセット
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `SELECT setval('points_id_seq', ${maxId});`
    });

    if (error) {
      console.error('シーケンスリセットエラー:', error);
      
      // 代替方法: 直接SQLを実行
      const { data: altData, error: altError } = await supabase
        .from('points')
        .select('id')
        .limit(0);
      
      return NextResponse.json({
        success: false,
        error: 'シーケンスのリセットに失敗しました',
        details: error,
        maxId,
        message: `手動でSupabaseダッシュボードから以下のSQLを実行してください: SELECT setval('points_id_seq', ${maxId});`
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      maxId,
      nextId: maxId + 1,
      message: `シーケンスを${maxId}にリセットしました。次のIDは${maxId + 1}から採番されます。`
    });
  } catch (error) {
    console.error('Reset sequence error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
