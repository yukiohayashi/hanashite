import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    // 仮登録メールテンプレート
    const { error: verificationError } = await supabase
      .from('mail_templates')
      .insert({
        template_key: 'verification_email',
        subject: '【ハナシテ】メールアドレスの認証',
        body: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>メールアドレスの認証</h2>
  <p>メールアドレスの認証が完了しました。</p>
  <p>ハナシテへの会員登録が完了しました。</p>
  <p>下記のリンクをクリックして、本登録を完了してください。</p>
  <p style="margin: 30px 0;">
    <a href="{{activationLink}}" style="background-color: #5ac971; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
      本登録を完了する
    </a>
  </p>
  <p>または、以下のURLをコピーしてブラウザに貼り付けてください：</p>
  <p style="word-break: break-all; color: #666;">{{activationLink}}</p>
  <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
  <p style="color: #999; font-size: 12px;">
    このメールに心当たりがない場合は、削除していただいて構いません。
  </p>
</div>`,
        is_active: true,
      });

    if (verificationError) {
      console.error('Verification template error:', verificationError);
      return NextResponse.json(
        { error: '仮登録メールテンプレートの追加に失敗しました', details: verificationError },
        { status: 500 }
      );
    }

    // 本登録完了メールテンプレート
    const { error: welcomeError } = await supabase
      .from('mail_templates')
      .insert({
        template_key: 'welcome_email',
        subject: '【ハナシテ】本登録完了',
        body: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>{{nickname}} 様</h2>
  <p>メールアドレスの認証が完了しました。</p>
  <p>ハナシテへの会員登録が完了しました。</p>
  <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
  <h3>ログイン情報</h3>
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 8px; background-color: #f5f5f5; font-weight: bold;">メールアドレス</td>
      <td style="padding: 8px;">{{email}}</td>
    </tr>
    <tr>
      <td style="padding: 8px; background-color: #f5f5f5; font-weight: bold;">パスワード</td>
      <td style="padding: 8px;">{{password}}</td>
    </tr>
  </table>
  <p style="margin-top: 20px;">大切に保管してください。</p>
  <p style="margin: 30px 0;">
    <a href="{{loginUrl}}" style="background-color: #5ac971; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
      ログインする
    </a>
  </p>
  <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
  <p>ハナシテ運営事務局</p>
  <p><a href="{{siteUrl}}" style="color: #5ac971;">{{siteName}}</a></p>
</div>`,
        is_active: true,
      });

    if (welcomeError) {
      console.error('Welcome template error:', welcomeError);
      return NextResponse.json(
        { error: '本登録完了メールテンプレートの追加に失敗しました', details: welcomeError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'メールテンプレートを追加しました',
    });
  } catch (error) {
    console.error('Init templates error:', error);
    return NextResponse.json(
      { error: 'テンプレート初期化に失敗しました' },
      { status: 500 }
    );
  }
}
