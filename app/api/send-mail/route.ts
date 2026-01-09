import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import nodemailer from 'nodemailer';

interface MailData {
  to: string;
  subject: string;
  body: string;
  templateKey?: string;
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

async function sendMail(mailData: MailData) {
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
    to: mailData.to,
    subject: mailData.subject,
    text: mailData.body,
    html: mailData.body.replace(/\n/g, '<br>'),
  });
  
  console.log('Mail sent successfully:', {
    messageId: info.messageId,
    to: mailData.to,
    subject: mailData.subject,
  });

  return info;
}

async function logMail(mailData: MailData, status: string, errorMessage?: string) {
  await supabase.from('mail_logs').insert({
    template_key: mailData.templateKey,
    to_email: mailData.to,
    from_email: (await getMailSettings()).from_email,
    subject: mailData.subject,
    body: mailData.body,
    status,
    error_message: errorMessage,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  });
}

export async function POST(request: Request) {
  try {
    const { to, subject, body, templateKey } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { success: false, error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    const mailData: MailData = { to, subject, body, templateKey };

    try {
      await sendMail(mailData);
      await logMail(mailData, 'sent');

      return NextResponse.json({
        success: true,
        message: 'メールを送信しました',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'メール送信に失敗しました';
      await logMail(mailData, 'failed', errorMessage);

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Send mail error:', error);
    return NextResponse.json(
      { success: false, error: 'メール送信処理に失敗しました' },
      { status: 500 }
    );
  }
}
