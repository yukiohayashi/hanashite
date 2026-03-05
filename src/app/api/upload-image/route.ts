import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: '画像ファイルが見つかりません' },
        { status: 400 }
      );
    }

    // ファイルをBufferに変換
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 画像を最適化（最大幅1200px、JPEG品質85%）
    const optimizedImage = await sharp(buffer)
      .resize(1200, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // ファイル名を生成（タイムスタンプ + ランダム文字列）
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const filename = `${timestamp}-${randomString}.jpg`;
    const filePath = `posts/${filename}`;

    // Supabase Storageにアップロード
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(filePath, optimizedImage, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json(
        { success: false, error: '画像のアップロードに失敗しました' },
        { status: 500 }
      );
    }

    // 公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: filename
    });

  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { success: false, error: '画像のアップロードに失敗しました' },
      { status: 500 }
    );
  }
}
