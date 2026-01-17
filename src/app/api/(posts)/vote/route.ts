import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { headers } from 'next/headers';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const session = await auth();
    const { choiceId, postId, sessionId, multi } = await request.json();

    if (!choiceId || !postId) {
      return NextResponse.json(
        { success: false, error: '選択肢IDと投稿IDが必要です' },
        { status: 400 }
      );
    }

    // 複数選択の場合は配列、単一選択の場合は配列に変換
    const choiceIds = Array.isArray(choiceId) ? choiceId : [choiceId];

    // IPアドレスを取得
    const headersList = await headers();
    const forwarded = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ipAddress = forwarded ? forwarded.split(',')[0] : realIp || 'unknown';
    
    // セッションIDをハッシュ化（プライバシー保護）
    const hashedSessionId = sessionId 
      ? crypto.createHash('sha256').update(sessionId).digest('hex')
      : null;

    // 既に投票済みかチェック（投票前に確認）
    const userId = session?.user?.id || null;
    
    // ログインユーザーの場合はuser_idでチェック
    if (userId) {
      const { data: existingVote } = await supabase
        .from('vote_history')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();
      
      if (existingVote) {
        return NextResponse.json(
          { success: false, error: '既に投票済みです' },
          { status: 400 }
        );
      }
    } else {
      // ゲストユーザーの場合はIPアドレスまたはセッションIDでチェック
      if (hashedSessionId) {
        const { data: existingVote } = await supabase
          .from('vote_history')
          .select('id')
          .eq('post_id', postId)
          .eq('session_id', hashedSessionId)
          .single();
        
        if (existingVote) {
          return NextResponse.json(
            { success: false, error: '既に投票済みです' },
            { status: 400 }
          );
        }
      }
      
      // セッションIDがない場合はIPアドレスでチェック（補助的）
      if (!hashedSessionId && ipAddress !== 'unknown') {
        const { data: existingVote } = await supabase
          .from('vote_history')
          .select('id')
          .eq('post_id', postId)
          .eq('ip_address', ipAddress)
          .is('session_id', null)
          .single();
        
        if (existingVote) {
          return NextResponse.json(
            { success: false, error: '既に投票済みです' },
            { status: 400 }
          );
        }
      }
    }

    // 投票数を更新（複数選択対応）
    for (const id of choiceIds) {
      const { data: choice, error: fetchError } = await supabase
        .from('vote_choices')
        .select('vote_count')
        .eq('id', id)
        .single();

      if (fetchError) {
        return NextResponse.json(
          { success: false, error: '選択肢が見つかりません' },
          { status: 404 }
        );
      }

      const newVoteCount = (choice.vote_count || 0) + 1;

      const { error: updateError } = await supabase
        .from('vote_choices')
        .update({ vote_count: newVoteCount })
        .eq('id', id);

      if (updateError) {
        return NextResponse.json(
          { success: false, error: '投票の更新に失敗しました' },
          { status: 500 }
        );
      }
    }

    // 投稿の総投票数を再計算して更新
    const { data: allChoices } = await supabase
      .from('vote_choices')
      .select('vote_count')
      .eq('post_id', postId);

    const totalVotes = allChoices?.reduce((sum, c) => sum + (c.vote_count || 0), 0) || 0;

    await supabase
      .from('posts')
      .update({ total_votes: totalVotes })
      .eq('id', postId);

    // 投票履歴を記録（複数選択の場合は最初の選択肢のみ記録）
    const { error: historyError } = await supabase
      .from('vote_history')
      .insert({
        post_id: postId,
        user_id: userId,
        choice_id: choiceIds[0],
        ip_address: ipAddress !== 'unknown' ? ipAddress : null,
        session_id: hashedSessionId
      });

    if (historyError) {
      console.error('投票履歴の記録に失敗:', historyError);
    }

    // アンケート作成者にwork_voteポイントを付与
    // workidがある場合（アンケワークス経由）のみポイント付与
    try {
      // アンケート作成者とworkidを取得
      const { data: post } = await supabase
        .from('posts')
        .select('user_id, workid')
        .eq('id', postId)
        .single();

      if (post && post.user_id && post.workid) {
        // workerのguest_check設定を取得
        const { data: worker } = await supabase
          .from('workers')
          .select('guest_check')
          .eq('id', post.workid)
          .single();

        // guest_checkがfalseの場合、ログインユーザーのみポイント付与
        if (worker && !worker.guest_check && !userId) {
          console.log('Guest vote on login-only worker, skipping point grant');
          // ゲストユーザーの投票なのでポイント付与をスキップ
        } else {
          // work_voteポイント設定を取得
          const { data: pointSetting } = await supabase
            .from('point_settings')
            .select('point_value')
            .eq('point_type', 'work_vote')
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
                user_id: post.user_id,
                amount: pointSetting.point_value,
                type: 'work_vote',
                related_id: postId,
                created_at: new Date().toISOString(),
              });

            if (pointError) {
              console.error('Work vote point grant error:', pointError);
            } else {
              console.log('Work vote point granted:', pointSetting.point_value, 'to user:', post.user_id);
            }
          }
        }
      }
    } catch (error) {
      console.error('Point grant process error:', error);
    }

    // 更新された投票選択肢を取得
    const { data: updatedChoices } = await supabase
      .from('vote_choices')
      .select('id, choice, vote_count')
      .eq('post_id', postId)
      .order('id');

    return NextResponse.json({
      success: true,
      choices: updatedChoices
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
