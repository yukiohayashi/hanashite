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
    const { userId, reportUrl, reportType, reportDetail, userEmail, userNickname } = await request.json();

    if (!userId || !reportUrl || !reportType) {
      return NextResponse.json(
        { success: false, error: '通報対象のURLと通報理由を選択してください' },
        { status: 400 }
      );
    }

    const variables = {
      name: userNickname || 'ユーザー',
      email: userEmail || '',
      target_type: '投稿/コメント',
      target_id: reportUrl,
      reason: reportType,
      detail: reportDetail || '詳細なし',
      date: new Date().toLocaleString('ja-JP'),
    };

    // ユーザーへの自動返信メール
    const userTemplate = await getTemplate('report');
    if (userTemplate && userEmail) {
      const userSubject = replaceVariables(userTemplate.subject, variables);
      const userBody = replaceVariables(userTemplate.body, variables);

      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-mail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: userEmail,
          subject: userSubject,
          body: userBody,
          templateKey: 'report',
        }),
      });
    }

    // 管理者への通知メール
    const adminTemplate = await getTemplate('report_admin');
    if (adminTemplate) {
      const adminSubject = replaceVariables(adminTemplate.subject, variables);
      const adminBody = replaceVariables(adminTemplate.body, variables);
      const adminEmail = process.env.ADMIN_EMAIL || 'info@dokujo.com';

      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-mail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: adminEmail,
          subject: adminSubject,
          body: adminBody,
          templateKey: 'report_admin',
        }),
      });
    }

    return NextResponse.json({
      success: true,
      message: '通報を受け付けました。ご協力ありがとうございます。'
    });
  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json(
      { success: false, error: 'メール送信に失敗しました' },
      { status: 500 }
    );
  }
}
