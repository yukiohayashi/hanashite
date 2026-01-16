import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// 管理者チェック
async function isAdmin() {
  const session = await auth();
  console.log('Session:', session);
  console.log('User status:', session?.user?.status);
  return session?.user?.status && session.user.status >= 2;
}

// ユーザー情報更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await isAdmin();
  console.log('Admin check result:', adminCheck);
  
  if (!adminCheck) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const userId = parseInt(id);
  const body = await request.json();

  const {
    name,
    email,
    status,
    is_banned,
    user_description,
    user_img_url,
    sei,
    mei,
    kana_sei,
    kana_mei,
    birth_year,
    sex,
    marriage,
    child_count,
    job,
    prefecture,
    sns_x,
  } = body;

  const updateData: Record<string, any> = {};

  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (typeof status === 'number' && (status >= 0 && status <= 3 || status === 6)) {
    updateData.status = status;
  }
  if (typeof is_banned === 'boolean') updateData.is_banned = is_banned;
  if (user_description !== undefined) updateData.user_description = user_description || null;
  if (user_img_url !== undefined) updateData.user_img_url = user_img_url || null;
  if (sei !== undefined) updateData.sei = sei || null;
  if (mei !== undefined) updateData.mei = mei || null;
  if (kana_sei !== undefined) updateData.kana_sei = kana_sei || null;
  if (kana_mei !== undefined) updateData.kana_mei = kana_mei || null;
  if (birth_year !== undefined) updateData.birth_year = birth_year || null;
  if (sex !== undefined) updateData.sex = sex || null;
  if (marriage !== undefined) updateData.marriage = marriage || null;
  if (child_count !== undefined) updateData.child_count = child_count;
  if (job !== undefined) updateData.job = job || null;
  if (prefecture !== undefined) updateData.prefecture = prefecture || null;
  if (sns_x !== undefined) updateData.sns_x = sns_x || null;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    );
  }

  try {
    console.log('Updating user:', userId, 'with data:', updateData);
    
    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update user',
        details: error?.message || 'Unknown error',
        code: error?.code
      },
      { status: 500 }
    );
  }
}
