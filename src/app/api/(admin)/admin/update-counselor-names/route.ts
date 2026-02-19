import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 相談員のニックネームを遊び心のある短い名前に更新するAPI
export async function POST() {
  try {
    // 自然で遊び心のあるニックネームリスト
    const newNames = [
      { id: '2001', name: 'ゆめみん' },
      { id: '2002', name: 'そらっち' },
      { id: '2003', name: 'りんご' },
      { id: '2004', name: 'ひなたん' },
      { id: '2005', name: 'まるこ' },
      { id: '2006', name: 'ここあ' },
      { id: '2007', name: 'ななみ' },
      { id: '2008', name: 'ももか' },
      { id: '2009', name: 'るるな' },
      { id: '2010', name: 'みくる' },
    ];

    const results = [];

    for (const user of newNames) {
      const { error } = await supabase
        .from('users')
        .update({ name: user.name })
        .eq('id', user.id);

      if (error) {
        results.push({ id: user.id, name: user.name, error: error.message });
      } else {
        results.push({ id: user.id, name: user.name, success: true });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error updating counselor names:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
