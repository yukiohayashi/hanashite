import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    
    const nickname = formData.get('nickname') as string;
    const profile = formData.get('profile') as string;
    const profileSlug = formData.get('profileSlug') as string;
    const snsX = formData.get('snsX') as string;
    const participatePoints = formData.get('participatePoints') === '1';
    const sex = formData.get('sex') as string;
    const birthYear = formData.get('birthYear') as string;
    const prefecture = formData.get('prefecture') as string;
    const marriage = formData.get('marriage') as string;
    const childCount = parseInt(formData.get('childCount') as string) || 0;
    const job = formData.get('job') as string;
    const kanaSei = formData.get('kanaSei') as string;
    const kanaMei = formData.get('kanaMei') as string;
    const sei = formData.get('sei') as string;
    const mei = formData.get('mei') as string;
    const emailSubscription = formData.get('emailSubscription') === '1';
    const interestCategories = formData.get('interestCategories') as string;
    const avatarFile = formData.get('avatar') as File | null;
    
    // DiceBearアバター関連
    const imageMode = formData.get('imageMode') as string;
    const avatarStyle = formData.get('avatarStyle') as string;
    const avatarSeed = formData.get('avatarSeed') as string;
    const useCustomImage = formData.get('useCustomImage') === '1';

    if (!nickname?.trim()) {
      return NextResponse.json(
        { success: false, error: 'ニックネームを入力してください' },
        { status: 400 }
      );
    }

    if (!job) {
      return NextResponse.json(
        { success: false, error: '職種を選択してください' },
        { status: 400 }
      );
    }

    // プロフィールスラッグのバリデーション
    let updateSlug = false;
    let slugValue = profileSlug;

    if (profileSlug) {
      const { data: currentUser } = await supabase
        .from('users')
        .select('profile_slug, profile_slug_updated_at')
        .eq('id', session.user.id)
        .single();

      if (currentUser?.profile_slug_updated_at) {
        const lastUpdate = new Date(currentUser.profile_slug_updated_at);
        const oneMonthLater = new Date(lastUpdate);
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
        if (new Date() < oneMonthLater && profileSlug !== currentUser.profile_slug) {
          const daysUntilChange = Math.ceil((oneMonthLater.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          return NextResponse.json(
            { success: false, error: `プロフィールURLは変更後1ヶ月間変更できません。あと${daysUntilChange}日お待ちください。` },
            { status: 400 }
          );
        }
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(profileSlug)) {
        return NextResponse.json(
          { success: false, error: 'プロフィールURLは英数字、ハイフン、アンダースコアのみ使用できます。' },
          { status: 400 }
        );
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileSlug);
      if (!isUuid && (profileSlug.length < 3 || profileSlug.length > 30)) {
        return NextResponse.json(
          { success: false, error: 'プロフィールURLは3文字以上30文字以内で入力してください。' },
          { status: 400 }
        );
      }

      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('profile_slug', profileSlug)
        .neq('id', session.user.id)
        .single();

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'このプロフィールURLは既に使用されています。' },
          { status: 400 }
        );
      }

      if (profileSlug !== currentUser?.profile_slug) {
        updateSlug = true;
      }
    } else {
      slugValue = '';
    }

    // アバター画像のアップロード処理
    let avatarUrl = null;
    console.log('Avatar file:', avatarFile ? {
      name: avatarFile.name,
      size: avatarFile.size,
      type: avatarFile.type
    } : 'No file');
    
    if (avatarFile && avatarFile.size > 0) {
      try {
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (avatarFile.size > maxSize) {
          return NextResponse.json(
            { success: false, error: 'ファイルサイズが2MBを超えています。' },
            { status: 400 }
          );
        }

        // ファイルをSupabase Storageにアップロード
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
        const filePath = fileName;

        const arrayBuffer = await avatarFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log('Uploading to Supabase Storage:', filePath);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, buffer, {
            contentType: avatarFile.type,
            upsert: true
          });

        if (uploadError) {
          console.error('Avatar upload error:', uploadError);
          // エラーでも続行（画像なしで保存）
        } else {
          console.log('Upload successful:', uploadData);
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
          avatarUrl = publicUrl;
          console.log('Public URL:', avatarUrl);
        }
      } catch (uploadErr) {
        console.error('Upload exception:', uploadErr);
        // エラーでも続行
      }
    }

    // ユーザー情報を更新
    const updateData: any = {
      name: nickname.trim(),
      user_description: profile.trim(),
      participate_points: participatePoints ? 1 : 0,
      sex: sex || null,
      birth_year: birthYear || null,
      prefecture: prefecture || null,
      sns_x: snsX || null,
      marriage: marriage || null,
      child_count: childCount,
      job: job || null,
      kana_sei: kanaSei || null,
      kana_mei: kanaMei || null,
      sei: sei || null,
      mei: mei || null,
      email_subscription: emailSubscription ? 1 : 0,
      interest_categories: interestCategories || null,
      profile_registered: 1,
      updated_at: new Date().toISOString(),
      // DiceBearアバター関連
      avatar_style: avatarStyle || null,
      avatar_seed: avatarSeed || null,
      use_custom_image: useCustomImage ? 1 : 0
    };

    if (updateSlug) {
      updateData.profile_slug = slugValue;
      updateData.profile_slug_updated_at = new Date().toISOString();
    }

    if (avatarUrl) {
      updateData.image = avatarUrl;
    }

    console.log('Updating user:', session.user.id);
    console.log('Image mode:', imageMode);
    console.log('Use custom image:', useCustomImage);
    console.log('Avatar URL:', avatarUrl);
    console.log('Update data:', JSON.stringify(updateData, null, 2));

    const { data: updateResult, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', session.user.id)
      .select();

    console.log('Update result:', updateResult);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'プロフィールの更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      user: updateResult 
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'サーバーエラーが発生しました' 
    }, { status: 500 });
  }
}
