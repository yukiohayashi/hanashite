import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userIdが必要です' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('points')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      userId,
      points: data,
      total: data?.length || 0
    });
  } catch (error) {
    console.error('Check user points error:', error);
    return NextResponse.json({ error: 'ポイント確認に失敗しました' }, { status: 500 });
  }
}
