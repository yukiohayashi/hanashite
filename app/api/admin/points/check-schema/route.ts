import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('points')
      .select('*')
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      schema: data && data.length > 0 ? Object.keys(data[0]) : [],
      sample: data && data.length > 0 ? data[0] : null
    });
  } catch (error) {
    console.error('Check schema error:', error);
    return NextResponse.json({ error: 'スキーマ確認に失敗しました' }, { status: 500 });
  }
}
