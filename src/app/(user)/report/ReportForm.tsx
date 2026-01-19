'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ReportForm() {
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    reportUrl: '',
    reportType: '',
    reportDetail: ''
  });

  useEffect(() => {
    const urlParam = searchParams.get('url');
    if (urlParam) {
      setFormData(prev => ({ ...prev, reportUrl: decodeURIComponent(urlParam) }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const response = await fetch('/api/report', {
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
        setFormData({ reportUrl: '', reportType: '', reportDetail: '' });
      } else {
        setErrorMessage(data.error);
      }
    } catch (error) {
      setErrorMessage('メール送信に失敗しました');
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
                <Label htmlFor="reportUrl">
                  通報対象のURL <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="reportUrl"
                  type="url"
                  value={formData.reportUrl}
                  onChange={(e) => setFormData({ ...formData, reportUrl: e.target.value })}
                  placeholder="https://anke.jp/..."
                  required
                  className="border-gray-300"
                />
                <p className="text-gray-600 text-sm">通報したい投稿やコメントのURLを入力してください</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportType">
                  通報理由 <span className="text-red-600">*</span>
                </Label>
                <Select
                  value={formData.reportType}
                  onValueChange={(value) => setFormData({ ...formData, reportType: value })}
                  required
                >
                  <SelectTrigger className="border-gray-300">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="誹謗・中傷">一般個人に関する誹謗・中傷コメント</SelectItem>
                    <SelectItem value="卑猥な内容">著しく卑猥な内容を含む表現</SelectItem>
                    <SelectItem value="個人情報">住所、電話番号、SNSのID、メールアドレス等の個人情報の掲載</SelectItem>
                    <SelectItem value="宣伝・勧誘">運営趣旨にそぐわない宣伝、勧誘</SelectItem>
                    <SelectItem value="その他">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportDetail">詳細（任意）</Label>
                <Textarea
                  id="reportDetail"
                  value={formData.reportDetail}
                  onChange={(e) => setFormData({ ...formData, reportDetail: e.target.value })}
                  rows={5}
                  placeholder="通報内容の詳細を入力してください（任意）"
                  className="border-gray-300"
                />
              </div>
            </div>

            <div className="border-t border-gray-300"></div>

            <div className="space-y-4">
              <p className="text-gray-600 text-sm font-bold">ご注意ください</p>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>• 投稿の削除を確約するものではありません</li>
                <li>• 確認にお時間を頂く場合がございます</li>
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
            {submitting ? '送信中...' : '通報する'}
          </Button>
        </div>
      </form>
    </div>
  );
}
