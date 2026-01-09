import nodemailer from 'nodemailer';
import { supabase } from './supabase';

interface SendVerificationEmailParams {
  email: string;
  activationLink: string;
}

interface SendWelcomeEmailParams {
  email: string;
  nickname: string;
  password: string;
  loginUrl: string;
  siteUrl: string;
  siteName: string;
}

async function getMailSettings() {
  const { data, error } = await supabase
    .from('mail_settings')
    .select('*')
    .eq('is_active', true)
    .single();

  if (error || !data) {
    throw new Error('SMTP設定が見つかりません');
  }

  return data;
}

export async function sendVerificationEmail({ email, activationLink }: SendVerificationEmailParams) {
  try {
    const settings = await getMailSettings();

    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port,
      secure: settings.use_ssl,
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_pass,
      },
    });

    const info = await transporter.sendMail({
      from: `"${settings.from_name}" <${settings.from_email}>`,
      to: email,
      subject: '【Anke】メールアドレスの認証',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>メールアドレスの認証</h2>
          <p>メールアドレスの認証が完了しました。</p>
          <p>アンケへの会員登録が完了しました。</p>
          <p>下記のリンクをクリックして、本登録を完了してください。</p>
          <p style="margin: 30px 0;">
            <a href="${activationLink}" style="background-color: #5ac971; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              本登録を完了する
            </a>
          </p>
          <p>または、以下のURLをコピーしてブラウザに貼り付けてください：</p>
          <p style="word-break: break-all; color: #666;">${activationLink}</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #999; font-size: 12px;">
            このメールに心当たりがない場合は、削除していただいて構いません。
          </p>
        </div>
      `,
    });

    console.log('Verification email sent:', info.messageId);
    return { success: true, data: info };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

export async function sendWelcomeEmail({ 
  email, 
  nickname, 
  password, 
  loginUrl,
  siteUrl,
  siteName 
}: SendWelcomeEmailParams) {
  try {
    const settings = await getMailSettings();

    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port,
      secure: settings.use_ssl,
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_pass,
      },
    });

    const info = await transporter.sendMail({
      from: `"${settings.from_name}" <${settings.from_email}>`,
      to: email,
      subject: '【Anke】本登録完了',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${nickname} 様</h2>
          <p>メールアドレスの認証が完了しました。</p>
          <p>アンケへの会員登録が完了しました。</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <h3>ログイン情報</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; background-color: #f5f5f5; font-weight: bold;">メールアドレス</td>
              <td style="padding: 8px;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 8px; background-color: #f5f5f5; font-weight: bold;">パスワード</td>
              <td style="padding: 8px;">${password}</td>
            </tr>
          </table>
          <p style="margin-top: 20px;">大切に保管してください。</p>
          <p style="margin: 30px 0;">
            <a href="${loginUrl}" style="background-color: #5ac971; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              ログインする
            </a>
          </p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p>アンケ運営事務局</p>
          <p><a href="${siteUrl}" style="color: #5ac971;">${siteName}</a></p>
        </div>
      `,
    });

    console.log('Welcome email sent:', info.messageId);
    return { success: true, data: info };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}
