import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendWelcomeEmail } from '@/lib/email';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: '認証コードが見つかりません。' },
        { status: 400 }
      );
    }

    // verification_tokensから該当するトークンを検索
    const { data: tokens } = await supabase
      .from('verification_tokens')
      .select('*')
      .gt('expires', new Date().toISOString());

    if (!tokens || tokens.length === 0) {
      return NextResponse.json(
        { error: '認証コードが無効または期限切れです。' },
        { status: 400 }
      );
    }

    // 各トークンと照合
    let matchedToken = null;
    for (const token of tokens) {
      const isMatch = await bcrypt.compare(code, token.token);
      if (isMatch) {
        matchedToken = token;
        break;
      }
    }

    if (!matchedToken) {
      return NextResponse.json(
        { error: '認証コードが無効です。' },
        { status: 400 }
      );
    }

    // ユーザーを本登録に更新
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', matchedToken.identifier)
      .eq('status', 0)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません。' },
        { status: 400 }
      );
    }

    // 新しいパスワードを生成
    const newPassword = crypto.randomBytes(12).toString('hex');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // ユーザーのステータスを本登録に更新
    const { error: updateError } = await supabase
      .from('users')
      .update({
        status: 1,
        user_pass: hashedPassword,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('User update error:', updateError);
      return NextResponse.json(
        { error: '本登録に失敗しました。' },
        { status: 500 }
      );
    }

    // 使用済みトークンを削除
    await supabase
      .from('verification_tokens')
      .delete()
      .eq('identifier', matchedToken.identifier);

    // point_settingsからregistのポイント値を取得
    const { data: pointSetting, error: settingError } = await supabase
      .from('point_settings')
      .select('point_value')
      .eq('point_type', 'regist')
      .eq('is_active', true)
      .single();

    console.log('========== ポイント付与処理開始 ==========');
    console.log('User ID:', user.id);
    console.log('Point setting:', JSON.stringify(pointSetting, null, 2));
    console.log('Setting error:', JSON.stringify(settingError, null, 2));

    // 会員登録ポイントを付与
    if (pointSetting && pointSetting.point_value > 0) {
      console.log('ポイント付与実行:', pointSetting.point_value, 'pt to user:', user.id);
      
      // 最大IDを取得してシーケンスエラーを回避
      const { data: maxIdData } = await supabase
        .from('points')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);
      
      const nextId = maxIdData && maxIdData.length > 0 ? maxIdData[0].id + 1 : 1;
      console.log('Next ID:', nextId);
      
      const insertData = {
        id: nextId,
        user_id: user.id,
        amount: pointSetting.point_value,
        type: 'regist',
        created_at: new Date().toISOString(),
      };
      console.log('Insert data:', JSON.stringify(insertData, null, 2));
      
      const { data: insertedPoint, error: pointError } = await supabase
        .from('points')
        .insert(insertData)
        .select();

      if (pointError) {
        console.error('========== ポイント付与エラー ==========');
        console.error('Error code:', pointError.code);
        console.error('Error message:', pointError.message);
        console.error('Error details:', JSON.stringify(pointError, null, 2));
        console.error('========================================');
        // ポイント付与失敗してもユーザーには成功メッセージを返す
      } else {
        console.log('========== ポイント付与成功 ==========');
        console.log('Inserted point:', JSON.stringify(insertedPoint, null, 2));
        console.log('====================================');
      }
    } else {
      console.error('========== ポイント設定エラー ==========');
      console.error('Point setting not found or value is 0');
      console.error('pointSetting:', pointSetting);
      console.error('settingError:', settingError);
      console.error('======================================');
    }

    // 本登録完了メールを送信
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const loginUrl = `${siteUrl}/login`;
    
    const emailResult = await sendWelcomeEmail({
      email: user.email,
      nickname: user.user_nicename || user.name,
      password: newPassword,
      loginUrl,
      siteUrl,
      siteName: 'Anke',
    });

    if (!emailResult.success) {
      console.error('Failed to send welcome email:', emailResult.error);
      // メール送信失敗してもユーザーには成功メッセージを返す
    }

    console.log('User verified:', user.email);
    console.log('New password:', newPassword);

    return NextResponse.json({
      success: true,
      message: '本登録が完了しました。ログイン情報をメールで送信しました。',
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: '認証に失敗しました。しばらくしてから再度お試しください。' },
      { status: 500 }
    );
  }
}
