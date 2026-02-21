import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/lib/email';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, invite_code } = await request.json();

    // バリデーション
    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスを入力してください。' },
        { status: 400 }
      );
    }

    // メールアドレス形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'メールアドレスの形式が正しくありません。' },
        { status: 400 }
      );
    }

    // メールアドレス重複チェック
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています。' },
        { status: 400 }
      );
    }

    // 認証コード生成
    const activationCode = crypto.randomBytes(32).toString('hex');
    const hashedCode = await bcrypt.hash(activationCode, 10);

    // 仮パスワード生成
    const tempPassword = crypto.randomBytes(12).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // ニックネーム生成（メールアドレスの@前部分）
    const defaultNickname = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');

    // usersテーブルに仮登録（IDはデフォルト値のUUIDが自動生成される）
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        user_pass: hashedPassword,
        name: defaultNickname,
        status: 0, // 仮登録
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (userError) {
      console.error('User insert error:', userError);
      return NextResponse.json(
        { error: '登録に失敗しました。しばらくしてから再度お試しください。' },
        { status: 500 }
      );
    }

    // verification_tokensテーブルに認証コード保存
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { error: tokenError } = await supabase
      .from('verification_tokens')
      .insert({
        identifier: email,
        token: hashedCode,
        expires: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error('Token insert error:', tokenError);
      // ユーザーは作成されたが、トークン保存に失敗した場合
      // ユーザーを削除するか、エラーを返すか判断
    }

    // メール送信
    const activationLink = `${process.env.NEXT_PUBLIC_APP_URL}/verify?code=${activationCode}`;
    
    const emailResult = await sendVerificationEmail({
      email,
      activationLink,
    });

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      // メール送信失敗してもユーザーには成功メッセージを返す（セキュリティ上）
    }

    console.log('Activation link:', activationLink);
    console.log('Email:', email);
    console.log('Invite code:', invite_code);

    return NextResponse.json({
      success: true,
      message: 'メールアドレス宛に認証メールを送信しました。',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: '登録に失敗しました。しばらくしてから再度お試しください。' },
      { status: 500 }
    );
  }
}
