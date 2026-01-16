import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 数値IDとして取得
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // ユーザー情報を取得
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, user_nicename, email, user_img_url, user_description, sns_x, created_at, profile_slug')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // ユーザーのポイント合計を取得
    const { data: pointsData } = await supabase
      .from('points')
      .select('points')
      .eq('user_id', userId.toString());

    const totalPoints = pointsData?.reduce((sum, p) => sum + (p.points || 0), 0) || 0;

    return NextResponse.json({ 
      ...user,
      points: totalPoints
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
