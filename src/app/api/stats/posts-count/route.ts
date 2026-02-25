import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5分キャッシュ

export async function GET() {
  try {
    // publish/publishedのみカウント（より高速）
    const { count, error } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .in('status', ['publish', 'published']);

    if (error) {
      console.error('Error fetching posts count:', error);
      return NextResponse.json({ count: 0 }, { status: 500 });
    }

    return NextResponse.json(
      { count: count || 0 },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Error in posts count API:', error);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
