import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pointId = searchParams.get('id');

    if (!pointId) {
      return NextResponse.json(
        { error: 'ポイントIDが必要です' },
        { status: 400 }
      );
    }

    // ポイントレコードを削除
    const { error } = await supabase
      .from('points')
      .delete()
      .eq('id', pointId);

    if (error) {
      console.error('Point delete error:', error);
      return NextResponse.json(
        { error: 'ポイントレコードの削除に失敗しました', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `ポイントレコード(ID: ${pointId})を削除しました`
    });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
