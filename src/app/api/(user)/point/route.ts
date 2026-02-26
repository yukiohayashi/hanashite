import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { userId, exchangePoints, sei, mei, kanaSei, kanaMei, email, remarks } = await request.json();

    if (!userId || !exchangePoints || !sei || !mei || !kanaSei || !kanaMei || !email) {
      return NextResponse.json(
        { success: false, error: '必須項目が入力されていません' },
        { status: 400 }
      );
    }

    // バリデーション
    if (exchangePoints < 10000 || exchangePoints % 10000 !== 0) {
      return NextResponse.json(
        { success: false, error: 'ポイント数が不正です' },
        { status: 400 }
      );
    }

    // 現在のポイントを取得
    const { data: pointHistory } = await supabase
      .from('points')
      .select('amount')
      .eq('user_id', userId);

    const currentPoints = (pointHistory || []).reduce((sum, record) => sum + (record.amount || 0), 0);

    if (exchangePoints > currentPoints) {
      return NextResponse.json(
        { success: false, error: '所有ポイントが不足しています' },
        { status: 400 }
      );
    }

    // 管理者にメール送信
    const adminEmail = process.env.ADMIN_EMAIL || 'info@dokujo.com';
    const subject = '【Anke】ポイント交換申請';
    const message = `ポイント交換の申請がありました。

ユーザーID: ${userId}
姓名: ${sei} ${mei}
セイメイ: ${kanaSei} ${kanaMei}
メールアドレス: ${email}
交換ポイント: ${exchangePoints.toLocaleString()}pt
交換金額: ${(exchangePoints / 10).toLocaleString()}円分
現在の所有ポイント: ${currentPoints.toLocaleString()}pt
${remarks ? `備考: ${remarks}\n` : ''}
申請日時: ${new Date().toLocaleString('ja-JP')}`;

    // メール送信
    try {
      const mailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-mail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: adminEmail,
          subject: subject,
          body: message,
          templateKey: 'point_exchange'
        }),
      });

      if (!mailResponse.ok) {
        console.error('メール送信に失敗しました:', await mailResponse.text());
      } else {
        console.log('ポイント交換申請メールを送信しました:', adminEmail);
      }
    } catch (mailError) {
      console.error('メール送信エラー:', mailError);
      // メール送信失敗でも申請は受け付ける
    }

    return NextResponse.json({
      success: true,
      message: 'ポイント交換申請を受け付けました。5営業日以内にメールにてAmazonギフトクーポンコードをお送りします。'
    });
  } catch (error) {
    console.error('Point exchange error:', error);
    return NextResponse.json(
      { success: false, error: 'ポイント交換申請に失敗しました' },
      { status: 500 }
    );
  }
}
