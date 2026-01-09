'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

  const [formData, setFormData] = useState({
    inquiryType: '',
    inquiryContent: ''
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
        setFormData({ inquiryType: '', inquiryContent: '' });
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

      <Card>
        <CardHeader>
          <CardTitle>お問い合わせフォーム</CardTitle>
          <CardDescription>ご質問やご意見をお聞かせください</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inquiryType">
                お問い合わせ区分 <span className="text-red-600">*</span>
              </Label>
              <Select
                value={formData.inquiryType}
                onValueChange={(value) => setFormData({ ...formData, inquiryType: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="アンケートについて">アンケートについて</SelectItem>
                  <SelectItem value="ポイントについて">ポイントについて</SelectItem>
                  <SelectItem value="アカウントについて">アカウントについて</SelectItem>
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
              />
            </div>

            <div className="pt-4 text-center">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#ff6b35] hover:bg-orange-600 px-10 py-6 text-base"
              >
                {submitting ? '送信中...' : '送信する'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-base">お問い合わせ前にご確認ください</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-gray-600 text-sm">
            <li>• お問い合わせには数日かかる場合があります</li>
            <li>• 登録されているメールアドレスに返信いたします</li>
            <li>• よくある質問もご確認ください</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
