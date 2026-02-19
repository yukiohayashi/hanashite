import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// カテゴリを再設計するAPI
export async function POST() {
  try {
    const results = [];

    // 1. 削除するカテゴリ（非アクティブ化）: 夫婦(5), 離婚(13), 格差恋愛(9), 性(11), セックスレス(8)
    const deactivateIds = [5, 13, 9, 11, 8];
    for (const id of deactivateIds) {
      const { error } = await supabase
        .from('categories')
        .update({ is_active: false })
        .eq('id', id);
      results.push({ id, action: 'deactivate', success: !error, error: error?.message });
    }

    // 2. 名称変更・統合
    // プロポーズ(12) → 告白・プロポーズ
    const { error: err12 } = await supabase
      .from('categories')
      .update({ name: '告白・プロポーズ', slug: 'kokuhaku' })
      .eq('id', 12);
    results.push({ id: 12, action: 'rename', name: '告白・プロポーズ', success: !err12 });

    // 結婚(2) → 結婚・婚活
    const { error: err2 } = await supabase
      .from('categories')
      .update({ name: '結婚・婚活' })
      .eq('id', 2);
    results.push({ id: 2, action: 'rename', name: '結婚・婚活', success: !err2 });

    // 不倫(6) → 浮気・不倫（slugは変更しない）
    const { error: err6 } = await supabase
      .from('categories')
      .update({ name: '浮気・不倫', icon: '<i class="fas fa-mask"></i>' })
      .eq('id', 6);
    results.push({ id: 6, action: 'rename', name: '浮気・不倫', success: !err6, error: err6?.message });

    // 浮気(15) を非アクティブ化（不倫と統合）
    const { error: err15 } = await supabase
      .from('categories')
      .update({ is_active: false })
      .eq('id', 15);
    results.push({ id: 15, action: 'deactivate', success: !err15 });

    // 3. 新規カテゴリ追加: 遠距離恋愛, マンネリ・倦怠期, 夜の悩み
    const newCategories = [
      { name: '遠距離恋愛', slug: 'longdistance', icon: '<i class="fas fa-train"></i>', display_order: 6, is_active: true },
      { name: 'マンネリ・倦怠期', slug: 'manneri', icon: '<i class="fas fa-battery-half"></i>', display_order: 10, is_active: true },
      { name: '夜の悩み', slug: 'yoru', icon: '<i class="fas fa-moon"></i>', display_order: 11, is_active: true },
    ];

    for (const cat of newCategories) {
      // 既存チェック
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', cat.slug)
        .single();

      if (existing) {
        // 既存なら更新
        const { error } = await supabase
          .from('categories')
          .update({ name: cat.name, icon: cat.icon, display_order: cat.display_order, is_active: true })
          .eq('slug', cat.slug);
        results.push({ slug: cat.slug, action: 'update', success: !error });
      } else {
        // 新規作成
        const { error } = await supabase
          .from('categories')
          .insert(cat);
        results.push({ slug: cat.slug, action: 'insert', success: !error, error: error?.message });
      }
    }

    // 4. display_order を再設定（その他を最後に）
    const orderUpdates = [
      { id: 1, display_order: 1 },   // 片思い
      { id: 4, display_order: 2 },   // 出会い
      { id: 7, display_order: 3 },   // デート
      { id: 10, display_order: 4 },  // 職場恋愛
      { id: 12, display_order: 5 },  // 告白・プロポーズ
      { id: 3, display_order: 7 },   // 復縁
      { id: 6, display_order: 8 },   // 浮気・不倫
      { id: 2, display_order: 9 },   // 結婚・婚活
      { id: 14, display_order: 99 }, // その他（最後）
    ];

    for (const item of orderUpdates) {
      await supabase
        .from('categories')
        .update({ display_order: item.display_order })
        .eq('id', item.id);
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error updating categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// カテゴリ一覧を取得
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, icon, display_order, is_active')
      .order('display_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ categories: data });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
