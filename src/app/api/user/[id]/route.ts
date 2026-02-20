import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // UUID形式または数値IDに対応
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidPattern.test(id);
    const isNumeric = /^\d+$/.test(id);
    
    if (!isUuid && !isNumeric) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // ユーザー情報を取得（UUID形式または数値IDで検索）
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, image, user_description, sns_x, created_at, profile_slug, avatar_style, avatar_seed, use_custom_image, participate_points')
      .eq('id', id)
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
      .eq('user_id', id);

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
