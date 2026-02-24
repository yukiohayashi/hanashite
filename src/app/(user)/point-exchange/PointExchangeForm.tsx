'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
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

export default function PointExchangeForm() {
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { data: session } = useSession();

  const [formData, setFormData] = useState({
    sei: '',
    mei: '',
    kanaSei: '',
    kanaMei: '',
    email: '',
    exchangePoints: '',
    remarks: ''
  });

  const fetchUserData = useCallback(async () => {
    if (!session?.user?.id) {
      console.log('[DEBUG] session.user.id が存在しません');
      return;
    }

    console.log('[DEBUG] fetchUserData 開始');
    console.log('[DEBUG] session.user.id:', session.user.id);
    console.log('[DEBUG] session.user.email:', session.user?.email);

    try {
      const url = `/api/user/${session.user.id}`;
      console.log('[DEBUG] API URL:', url);
      
      const response = await fetch(url);
      console.log('[DEBUG] API response status:', response.status);
      
      const user = await response.json();
      console.log('[DEBUG] API response:', user);
      console.log('[DEBUG] user.email:', user.email);
      
      const newFormData = {
        email: user.email || session.user?.email || '',
        sei: user.sei || '',
        mei: user.mei || '',
        kanaSei: user.kana_sei || '',
        kanaMei: user.kana_mei || ''
      };
      console.log('[DEBUG] 設定するフォームデータ:', newFormData);
      
      setFormData(prev => ({
        ...prev,
        ...newFormData
      }));
    } catch (error) {
      console.error('[DEBUG] ユーザー情報の取得エラー:', error);
    }
  }, [session?.user?.id, session?.user?.email]);

  const fetchTotalPoints = useCallback(async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/phistory?userId=${session.user.id}`);
      const data = await response.json();

      if (data.success) {
        setTotalPoints(data.totalPoints);
      }
    } catch (error) {
      console.error('ポイントの取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserData();
      fetchTotalPoints();
    }
  }, [session?.user?.id, fetchUserData, fetchTotalPoints]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const response = await fetch('/api/point', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session?.user?.id,
          ...formData,
          exchangePoints: parseInt(formData.exchangePoints)
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(data.message);
        setFormData(prev => ({ ...prev, exchangePoints: '', remarks: '' }));
        fetchTotalPoints();
      } else {
        setErrorMessage(data.error);
      }
    } catch (error) {
      setErrorMessage('ポイント交換申請に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const generateExchangeOptions = () => {
    const options = [];
    const maxExchange = Math.floor(totalPoints / 10000) * 10000;
    for (let i = 10000; i <= maxExchange; i += 10000) {
      const yen = i / 10;
      options.push(
        <SelectItem key={i} value={i.toString()}>
          {i.toLocaleString()}pt（{yen.toLocaleString()}円分）
        </SelectItem>
      );
    }
    return options;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p>いつもハナシテをご利用頂きまして、誠にありがとうございます。</p>
        <p>貯まったベストアンサーのポイントは<strong className="text-orange-600">10,000pt=1,000円分のAmazonギフト</strong>と交換できます。</p>
        <p>下記フォームから申請してください。</p>
        <p>プログラムによる不正行為等がないことを確認のうえ、5営業日以内にメールにて<strong className="text-orange-600">Amazonギフトクーポンコード</strong>をお送りします。</p>
        <p className="text-gray-600 text-sm">（なお、後日、不正が発覚した場合は、送付済みのポイントを返還して頂きます）</p>
      </div>

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

      <div className="bg-white border border-gray-300 rounded-md p-4">
        <p className="font-bold text-blue-600 text-lg mb-4">
          現在所有のハナシテpoint：{totalPoints.toLocaleString()}pt
        </p>

        {totalPoints < 10000 ? (
          <div className="bg-yellow-50 border border-yellow-500 rounded-md p-4">
            <p className="m-0 font-bold text-yellow-800">⚠️ ポイント交換には10,000pt以上が必要です。</p>
            <p className="mt-2 text-yellow-800">あと{(10000 - totalPoints).toLocaleString()}pt必要です。</p>
          </div>
        ) : (
          <div>
            <h2 className="font-bold text-lg mb-2">ポイント交換申請フォーム</h2>
            <p className="text-gray-600 text-sm mb-4">必要事項を入力して申請してください</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sei">姓 <span className="text-red-600">*</span></Label>
                  <Input
                    id="sei"
                    value={formData.sei}
                    onChange={(e) => setFormData({ ...formData, sei: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mei">名 <span className="text-red-600">*</span></Label>
                  <Input
                    id="mei"
                    value={formData.mei}
                    onChange={(e) => setFormData({ ...formData, mei: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="kanaSei">セイ（カナ） <span className="text-red-600">*</span></Label>
                  <Input
                    id="kanaSei"
                    value={formData.kanaSei}
                    onChange={(e) => setFormData({ ...formData, kanaSei: e.target.value })}
                    pattern="[ァ-ヶー]+"
                    title="全角カタカナで入力してください"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kanaMei">メイ（カナ） <span className="text-red-600">*</span></Label>
                  <Input
                    id="kanaMei"
                    value={formData.kanaMei}
                    onChange={(e) => setFormData({ ...formData, kanaMei: e.target.value })}
                    pattern="[ァ-ヶー]+"
                    title="全角カタカナで入力してください"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス <span className="text-red-600">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  readOnly
                  className="bg-gray-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exchangePoints">交換ポイント数 <span className="text-red-600">*</span></Label>
                <Select
                  value={formData.exchangePoints}
                  onValueChange={(value) => setFormData({ ...formData, exchangePoints: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateExchangeOptions()}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">備考</Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="pt-4 text-center">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#ff6b35] hover:bg-orange-600 px-10 py-6 text-base"
                >
                  {submitting ? '申請中...' : 'ポイント交換を申請する'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
