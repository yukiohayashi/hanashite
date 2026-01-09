import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    // 1. 全ポイントデータをcreated_atの古い順に取得
    const { data: allPoints, error: fetchError } = await supabase
      .from('points')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'データ取得に失敗しました', details: fetchError },
        { status: 500 }
      );
    }

    if (!allPoints || allPoints.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'ポイントデータがありません',
      });
    }

    console.log(`Total points to renumber: ${allPoints.length}`);

    // 2. 既存のデータを全削除
    const { error: deleteError } = await supabase
      .from('points')
      .delete()
      .neq('id', 0); // 全レコードを削除

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json(
        { error: 'データ削除に失敗しました', details: deleteError },
        { status: 500 }
      );
    }

    console.log('All existing points deleted');

    // 3. 新しいIDで再挿入（created_atの古い順に1から採番）
    const renumberedPoints = allPoints.map((point, index) => ({
      id: index + 1,
      user_id: point.user_id,
      amount: point.amount,
      type: point.type,
      created_at: point.created_at,
    }));

    // バッチサイズを小さくして挿入
    const batchSize = 100;
    for (let i = 0; i < renumberedPoints.length; i += batchSize) {
      const batch = renumberedPoints.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('points')
        .insert(batch);

      if (insertError) {
        console.error(`Insert error at batch ${i}:`, insertError);
        return NextResponse.json(
          { error: `バッチ${i}の挿入に失敗しました`, details: insertError },
          { status: 500 }
        );
      }
      console.log(`Inserted batch ${i}-${i + batch.length}`);
    }

    console.log('All points renumbered successfully');

    return NextResponse.json({
      success: true,
      message: `${allPoints.length}件のポイントデータのIDを再採番しました`,
      totalRecords: allPoints.length,
    });
  } catch (error) {
    console.error('Renumber error:', error);
    return NextResponse.json(
      { error: 'ID再採番に失敗しました', details: error },
      { status: 500 }
    );
  }
}
