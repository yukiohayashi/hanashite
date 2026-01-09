import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      );
    }

    // ユーザー情報を取得
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません', details: userError },
        { status: 404 }
      );
    }

    // ポイント履歴を取得
    const { data: points, error: pointsError } = await supabase
      .from('points')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (pointsError) {
      return NextResponse.json(
        { error: 'ポイント履歴の取得に失敗しました', details: pointsError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
      points,
      totalPoints: (points || []).reduce((sum, p) => sum + p.amount, 0)
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
