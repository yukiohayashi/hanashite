'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function InquiryForm() {
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { data: session } = useSession();

  // ダミーメールアドレス（LINE/Xログイン）を除外
  const userEmail = session?.user?.email || '';
  const isDummyEmail = userEmail && (userEmail.startsWith('line_') || userEmail.startsWith('x_')) && userEmail.endsWith('@dokujo.com');
  const initialEmail = isDummyEmail ? '' : userEmail;

  const [formData, setFormData] = useState({
    inquiryType: '',
    inquiryContent: '',
    replyEmail: initialEmail
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const response = await fetch('/api/inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          userNickname: session?.user?.name,
          ...formData
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(data.message);
        setFormData({ inquiryType: '', inquiryContent: '', replyEmail: initialEmail });
      } else {
        setErrorMessage(data.error);
      }
    } catch (error) {
      setErrorMessage('お問い合わせの送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {successMessage && (
        <Alert className="border-green-600 bg-green-50">
          <AlertDescription className="font-bold text-green-800">
            ✅ {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert className="border-red-600 bg-red-50">
          <AlertDescription className="font-bold text-red-800">
            ❌ {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-gray-300 rounded-md shadow-sm">
          <div className="p-4 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="replyEmail">
                  返信先メールアドレス <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="replyEmail"
                  type="email"
                  value={formData.replyEmail}
                  onChange={(e) => setFormData({ ...formData, replyEmail: e.target.value })}
                  placeholder="example@example.com"
                  required
                  className="border-gray-300"
                />
                <p className="text-gray-500 text-xs">
                  {!isDummyEmail && session?.user?.email 
                    ? 'プロフィールに登録されているメールアドレスが自動入力されています。変更も可能です。' 
                    : 'お問い合わせへの返信を受け取るメールアドレスを入力してください。'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inquiryType">
                  お問い合わせ区分 <span className="text-red-600">*</span>
                </Label>
                <Select
                  value={formData.inquiryType}
                  onValueChange={(value) => setFormData({ ...formData, inquiryType: value })}
                  required
                >
                  <SelectTrigger className="border-gray-300">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="相談内容について">相談内容について</SelectItem>
                    <SelectItem value="アカウントについて">アカウントについて</SelectItem>
                    <SelectItem value="ベストアンサーのポイントについて">ベストアンサーのポイントについて</SelectItem>
                    <SelectItem value="不具合・エラー">不具合・エラー</SelectItem>
                    <SelectItem value="その他">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inquiryContent">
                  お問い合わせ内容 <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  id="inquiryContent"
                  value={formData.inquiryContent}
                  onChange={(e) => setFormData({ ...formData, inquiryContent: e.target.value })}
                  rows={10}
                  placeholder="お問い合わせ内容を詳しくご記入ください"
                  required
                  className="border-gray-300"
                />
              </div>
            </div>

            <div className="border-t border-gray-300"></div>

            <div className="space-y-4">
              <p className="text-gray-600 text-sm font-bold">お問い合わせ前にご確認ください</p>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>• お問い合わせには数日かかる場合があります</li>
                <li>• 登録されているメールアドレスに返信いたします</li>
                <li>• よくある質問もご確認ください</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            type="submit"
            disabled={submitting}
            className="bg-[#ff6b35] hover:bg-orange-600 px-12 py-6 font-bold text-white text-lg"
          >
            {submitting ? '送信中...' : '送信する'}
          </Button>
        </div>
      </form>
    </div>
  );
}
