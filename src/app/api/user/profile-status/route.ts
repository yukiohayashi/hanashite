import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('name')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('Error fetching profile status:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profile status' },
        { status: 500 }
      );
    }

    // nameフィールドが存在し、空でない場合はプロフィール登録済みとみなす
    return NextResponse.json({
      profile_registered: !!(user?.name && user.name.trim() !== '')
    });
  } catch (error) {
    console.error('Profile status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
