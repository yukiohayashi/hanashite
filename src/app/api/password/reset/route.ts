import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスを入力してください' },
        { status: 400 }
      );
    }

    // メールアドレスでユーザーを検索
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email)
      .single();

    // セキュリティ上、ユーザーが存在しない場合でも同じメッセージを返す
    if (userError || !user) {
      return NextResponse.json({
        success: true,
        message: 'パスワードリセット用のメールを送信しました',
      });
    }

    // リセットトークンを生成
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1時間後（UTC）

    if (process.env.NODE_ENV === 'development') {
      console.log('トークン生成:', {
        now: new Date().toISOString(),
        expiry: resetTokenExpiry.toISOString(),
      });
    }

    // トークンをデータベースに保存（UTCタイムスタンプとして）
    const { error: updateError } = await supabase
      .from('users')
      .update({
        reset_token: resetToken,
        reset_token_expiry: resetTokenExpiry.toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('トークン保存エラー:', updateError);
      return NextResponse.json(
        { error: 'パスワードリセットの処理に失敗しました' },
        { status: 500 }
      );
    }

    // リセットURLを生成
    // リクエストヘッダーからホスト情報を取得
    const host = request.headers.get('host') || 'dokujo.com';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    const resetUrl = `${baseUrl}/resetpassword/confirm?token=${resetToken}`;
    
    // SMTP経由でメールを送信
    const emailResult = await sendPasswordResetEmail({
      email: user.email,
      resetUrl,
      userName: user.name,
    });

    if (!emailResult.success) {
      console.error('メール送信エラー:', emailResult.error);
      // メール送信に失敗してもトークンは保存されているので、開発環境ではURLを返す
      if (process.env.NODE_ENV === 'development') {
        console.log('パスワードリセットURL:', resetUrl);
        return NextResponse.json({
          success: true,
          message: 'パスワードリセット用のメールを送信しました（開発環境: メール送信失敗）',
          resetUrl,
        });
      }
      
      return NextResponse.json(
        { error: 'メール送信に失敗しました' },
        { status: 500 }
      );
    }

    console.log('パスワードリセットメール送信成功:', user.email);

    return NextResponse.json({
      success: true,
      message: 'パスワードリセット用のメールを送信しました',
      // 開発環境用: リセットURLを返す
      ...(process.env.NODE_ENV === 'development' && { resetUrl }),
    });
  } catch (error) {
    console.error('パスワードリセットエラー:', error);
    return NextResponse.json(
      { error: 'パスワードリセット中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
