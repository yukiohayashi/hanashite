import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const categoryId = parseInt(id);
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;
  const offset = (page - 1) * limit;

  // カテゴリ情報を取得
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id, name, slug, icon')
    .eq('id', categoryId)
    .single();

  if (categoryError || !category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  // 総投稿数を取得
  const { count: totalCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId);

  // 投稿を取得
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('id, title, content, created_at, user_id, og_image, thumbnail_url')
    .eq('category_id', categoryId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (postsError) {
    return NextResponse.json({ error: postsError.message }, { status: 500 });
  }

  return NextResponse.json({
    category,
    posts: posts || [],
    totalCount: totalCount || 0,
    totalPages: Math.ceil((totalCount || 0) / limit),
    currentPage: page
  });
}
