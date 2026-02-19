import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// カテゴリマッピング
const CATEGORIES = {
  1: '片思い',
  2: '結婚・婚活',
  3: '復縁',
  4: '出会い',
  6: '浮気・不倫',
  7: 'デート',
  10: '職場恋愛',
  12: '告白・プロポーズ',
  14: 'その他',
  16: '遠距離恋愛',
  17: 'マンネリ・倦怠期',
  18: '夜の悩み',
};

// 投稿内容からカテゴリを判定
function categorizePost(title: string, content: string): number {
  const text = `${title} ${content}`;
  
  // 浮気・不倫（優先度高）
  if (text.includes('浮気') || text.includes('不倫') || text.includes('二股') || text.includes('裏切り')) {
    return 6;
  }
  
  // 夜の悩み（優先度高）
  if (text.includes('夜の') || text.includes('セックス') || text.includes('体の相性') || text.includes('セックスレス') || text.includes('性欲') || text.includes('夜の相性')) {
    return 18;
  }
  
  // 職場恋愛
  if (text.includes('職場') || (text.includes('先輩') && text.includes('アプローチ')) || text.includes('同僚') || text.includes('上司')) {
    return 10;
  }
  
  // 遠距離恋愛
  if (text.includes('遠距離')) {
    return 16;
  }
  
  // 結婚・婚活
  if (text.includes('結婚') || text.includes('婚活') || text.includes('プロポーズ') || text.includes('マリッジ') || text.includes('入籍') || text.includes('離婚')) {
    return 2;
  }
  
  // 告白・プロポーズ
  if (text.includes('告白') || text.includes('気持ちを伝え')) {
    return 12;
  }
  
  // 復縁
  if (text.includes('復縁') || text.includes('元カレ') || text.includes('元彼') || text.includes('元カノ') || text.includes('やり直')) {
    return 3;
  }
  
  // マンネリ・倦怠期
  if (text.includes('マンネリ') || text.includes('倦怠期') || text.includes('冷めて') || text.includes('ドキドキしな') || text.includes('元カノの影') || text.includes('気になってしまい')) {
    return 17;
  }
  
  // デート
  if (text.includes('デート') || text.includes('回目のデート') || text.includes('食事に行く')) {
    return 7;
  }
  
  // 出会い
  if (text.includes('出会い') || text.includes('マッチングアプリ') || text.includes('合コン') || text.includes('紹介')) {
    return 4;
  }
  
  // 片思い
  if (text.includes('片思い') || text.includes('好きな人') || text.includes('気になる人') || text.includes('アプローチ') || text.includes('脈あり') || text.includes('脈なし')) {
    return 1;
  }
  
  // その他
  return 14;
}

export async function GET() {
  try {
    // 全投稿を取得
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, title, content, category_id')
      .in('status', ['publish', 'published'])
      .order('id', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 各投稿のカテゴリを判定
    const results = posts?.map(post => ({
      id: post.id,
      title: post.title?.substring(0, 50),
      current_category: post.category_id,
      suggested_category: categorizePost(post.title || '', post.content || ''),
      suggested_name: CATEGORIES[categorizePost(post.title || '', post.content || '') as keyof typeof CATEGORIES]
    })) || [];

    return NextResponse.json({ 
      total: results.length,
      posts: results 
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    // 全投稿を取得
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, title, content')
      .in('status', ['publish', 'published']);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results = [];

    // 各投稿のカテゴリを更新
    for (const post of posts || []) {
      const newCategoryId = categorizePost(post.title || '', post.content || '');
      
      const { error: updateError } = await supabase
        .from('posts')
        .update({ category_id: newCategoryId })
        .eq('id', post.id);

      results.push({
        id: post.id,
        title: post.title?.substring(0, 30),
        category_id: newCategoryId,
        category_name: CATEGORIES[newCategoryId as keyof typeof CATEGORIES],
        success: !updateError,
        error: updateError?.message
      });
    }

    return NextResponse.json({ 
      success: true,
      total: results.length,
      results 
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
