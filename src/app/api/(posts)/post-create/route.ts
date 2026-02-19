import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { 
      userId, 
      title, 
      content, 
      category, 
      choices, 
      multi, 
      random, 
      imageUrl,
      imagePreview,
      closeDate, 
      closeTime,
      workid
    } = await request.json();

    // 相談記事の場合は選択肢不要、アンケートの場合は選択肢必須
    if (!userId || !title || !content) {
      return NextResponse.json(
        { success: false, error: '必須項目が入力されていません' },
        { status: 400 }
      );
    }

    // アンケートの場合は選択肢が2つ以上必要
    if (choices && choices.length > 0 && choices.length < 2) {
      return NextResponse.json(
        { success: false, error: '選択肢は2つ以上必要です' },
        { status: 400 }
      );
    }

    // 最新のpost IDを取得して次のIDを決定
    const { data: latestPost } = await supabase
      .from('posts')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    const nextId = latestPost ? latestPost.id + 1 : 1;

    // 投稿を作成
    // imagePreviewがある場合はそれを優先、なければimageUrlを使用
    // Base64データは保存せず、URLのみを保存（500文字制限のため）
    let finalImage = imagePreview || imageUrl || null;
    
    // Base64データまたは500文字を超える場合はnullを保存
    if (finalImage && (finalImage.startsWith('data:') || finalImage.length > 500)) {
      finalImage = null;
    }
    
    // 締切日時を設定
    let deadlineAt = null;
    if (closeDate && closeTime) {
      deadlineAt = new Date(`${closeDate}T${closeTime}:00`).toISOString();
    }

    const insertData: Record<string, unknown> = {
      id: nextId,
      title: title.trim(),
      content: content.trim(),
      user_id: userId,
      status: 'published',
      og_image: finalImage,
      deadline_at: deadlineAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (workid) {
      insertData.workid = workid;
    }

    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert(insertData)
      .select()
      .single();

    if (postError || !post) {
      console.error('Post creation error:', postError);
      console.error('Insert data:', {
        title_length: insertData.title?.toString().length,
        content_length: insertData.content?.toString().length,
        og_image_length: insertData.og_image?.toString().length,
        og_image: insertData.og_image
      });
      return NextResponse.json(
        { success: false, error: '投稿の作成に失敗しました' },
        { status: 500 }
      );
    }

    // 選択肢がある場合のみ投票オプションと選択肢を作成（アンケート用）
    if (choices && choices.length >= 2) {
      // 投票オプションを作成
      let closeAt = null;
      if (closeDate && closeTime) {
        closeAt = new Date(`${closeDate}T${closeTime}:00`).toISOString();
      }

      const { error: optionsError } = await supabase
        .from('vote_options')
        .insert({
          post_id: post.id,
          multi: multi || false,
          random: random || false,
          close_at: closeAt
        });

      if (optionsError) {
        console.error('Vote options creation error:', optionsError);
        // vote_options作成失敗時は投稿を削除してロールバック
        await supabase.from('posts').delete().eq('id', post.id);
        return NextResponse.json(
          { success: false, error: '投票オプションの作成に失敗しました' },
          { status: 500 }
        );
      }

      // 選択肢を作成（カラム名をchoiceに修正）
      // 最新のvote_choice IDを取得
      const { data: latestChoice } = await supabase
        .from('vote_choices')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .single();

      let nextChoiceId = latestChoice ? latestChoice.id + 1 : 1;

      const choiceInserts = choices.map((choice: string) => {
        const insert = {
          id: nextChoiceId,
          post_id: post.id,
          choice: choice,
          vote_count: 0
        };
        nextChoiceId++;
        return insert;
      });

      const { error: choicesError } = await supabase
        .from('vote_choices')
        .insert(choiceInserts);

      if (choicesError) {
        console.error('Choices creation error:', choicesError);
        return NextResponse.json(
          { success: false, error: '選択肢の作成に失敗しました' },
          { status: 500 }
        );
      }
    }

    // カテゴリーを設定（autoでない場合）
    if (category && category !== 'auto') {
      const { error: categoryError } = await supabase
        .from('post_categories')
        .insert({
          post_id: post.id,
          category_id: parseInt(category)
        });

      if (categoryError) {
        console.error('Category assignment error:', categoryError);
      }
    }

    // アンケート作成ポイントを付与（work_post）
    // workidが指定されている場合（アンケワークス経由）のみポイント付与
    if (workid) {
      try {
        const { data: pointSetting } = await supabase
          .from('point_settings')
          .select('point_value')
          .eq('point_type', 'work_post')
          .eq('is_active', true)
          .single();

        if (pointSetting && pointSetting.point_value > 0) {
        // 最大IDを取得してシーケンスエラーを回避
        const { data: maxIdData } = await supabase
          .from('points')
          .select('id')
          .order('id', { ascending: false })
          .limit(1);
        
        const nextId = maxIdData && maxIdData.length > 0 ? maxIdData[0].id + 1 : 1;

        const { error: pointError } = await supabase
          .from('points')
          .insert({
            id: nextId,
            points: pointSetting.point_value,
            user_id: userId,
            amount: pointSetting.point_value,
            type: 'work_post',
            related_id: post.id,
            created_at: new Date().toISOString(),
          });

        if (pointError) {
          console.error('Work post point grant error:', pointError);
        } else {
          console.log('Work post point granted:', pointSetting.point_value, 'to user:', userId);
        }
        }
      } catch (error) {
        console.error('Point grant process error:', error);
      }
    }

    return NextResponse.json({
      success: true,
      postId: post.id,
      message: choices && choices.length >= 2 ? 'アンケートを作成しました' : '相談記事を投稿しました'
    });
  } catch (error) {
    console.error('Post create error:', error);
    return NextResponse.json(
      { success: false, error: '投稿の作成に失敗しました' },
      { status: 500 }
    );
  }
}
