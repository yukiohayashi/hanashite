import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1時間キャッシュ

export async function GET() {
  try {
    const { count, error } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error fetching posts count:', error);
      return NextResponse.json({ count: 0 }, { status: 500 });
    }

    return NextResponse.json(
      { count: count || 0 },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error) {
    console.error('Error in posts count API:', error);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
