import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: settings, error } = await supabaseAdmin
      .from('api_settings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching API settings:', error);
    return NextResponse.json(
      { error: 'API設定の取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { api_name, api_key, api_secret, endpoint_url, description, model, is_active } = body;

    if (!api_name) {
      return NextResponse.json(
        { error: 'API名は必須です' },
        { status: 400 }
      );
    }

    if (!model) {
      return NextResponse.json(
        { error: 'モデルは必須です' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('api_settings')
      .insert({
        api_name,
        api_key,
        api_secret,
        endpoint_url,
        description,
        model,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating API setting:', error);
    return NextResponse.json(
      { error: 'API設定の作成に失敗しました' },
      { status: 500 }
    );
  }
}
