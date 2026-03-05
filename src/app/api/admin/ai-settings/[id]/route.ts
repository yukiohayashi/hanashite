import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { api_name, api_key, api_secret, endpoint_url, description, is_active } = body;

    const { data, error } = await supabaseAdmin
      .from('api_settings')
      .update({
        api_name,
        api_key,
        api_secret,
        endpoint_url,
        description,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating API setting:', error);
    return NextResponse.json(
      { error: 'API設定の更新に失敗しました' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('api_settings')
      .delete()
      .eq('id', parseInt(id));

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting API setting:', error);
    return NextResponse.json(
      { error: 'API設定の削除に失敗しました' },
      { status: 500 }
    );
  }
}
