import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

async function getTemplate(templateKey: string) {
  const { data, error } = await supabase
    .from('mail_templates')
    .select('*')
    .eq('template_key', templateKey)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

function replaceVariables(text: string, variables: Record<string, string>) {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

export async function POST(request: Request) {
  try {
    const { userId, inquiryType, inquiryContent, userEmail, userNickname } = await request.json();

    if (!userId || !inquiryType || !inquiryContent) {
      return NextResponse.json(
        { success: false, error: '必須項目が入力されていません' },
        { status: 400 }
      );
    }

    const variables = {
      name: userNickname || 'ユーザー',
      email: userEmail || '',
      message: `【${inquiryType}】\n${inquiryContent}`,
      date: new Date().toLocaleString('ja-JP'),
    };

    // ユーザーへの自動返信メール
    const userTemplate = await getTemplate('inquiry');
    if (userTemplate && userEmail) {
      const userSubject = replaceVariables(userTemplate.subject, variables);
      const userBody = replaceVariables(userTemplate.body, variables);

      await fetch(`${process.env.NEXTAUTH_URL}/api/send-mail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: userEmail,
          subject: userSubject,
          body: userBody,
          templateKey: 'inquiry',
        }),
      });
    }

    // 管理者への通知メール
    const adminTemplate = await getTemplate('inquiry_admin');
    if (adminTemplate) {
      const adminSubject = replaceVariables(adminTemplate.subject, variables);
      const adminBody = replaceVariables(adminTemplate.body, variables);
      const adminEmail = process.env.ADMIN_EMAIL || 'info@anke.jp';

      await fetch(`${process.env.NEXTAUTH_URL}/api/send-mail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: adminEmail,
          subject: adminSubject,
          body: adminBody,
          templateKey: 'inquiry_admin',
        }),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'お問い合わせを送信しました。ご連絡ありがとうございます。'
    });
  } catch (error) {
    console.error('Inquiry error:', error);
    return NextResponse.json(
      { success: false, error: 'お問い合わせの送信に失敗しました' },
      { status: 500 }
    );
  }
}
