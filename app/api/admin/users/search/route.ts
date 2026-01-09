import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json(
        { error: 'ユーザー名が必要です' },
        { status: 400 }
      );
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .ilike('name', `%${name}%`);

    if (error) {
      console.error('User search error:', error);
      return NextResponse.json(
        { error: 'ユーザー検索に失敗しました', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      users,
      count: users?.length || 0
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
