'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface AnkeData {
  userId: string;
  userName: string;
  title: string;
  content: string;
  category: string;
  choices: string[];
  multi: boolean;
  random: boolean;
  imageUrl: string;
  imagePreview?: string;
  closeDate: string;
  closeTime: string;
}

export default function AnkeConfirmView() {
  const [ankeData, setAnkeData] = useState<AnkeData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const savedData = sessionStorage.getItem('anke_create_data');
    if (savedData) {
      setAnkeData(JSON.parse(savedData));
    } else {
      router.push('/anke-create');
    }
  }, [router]);

  const handleBack = () => {
    router.push('/anke-create');
  };

  const handleSubmit = async () => {
    if (!ankeData) return;

    setSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/anke-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ankeData),
      });

      const data = await response.json();

      if (data.success) {
        sessionStorage.removeItem('anke_create_data');
        sessionStorage.removeItem('anke_image_file');
        router.push(`/posts/${data.postId}`);
      } else {
        setErrorMessage(data.error);
      }
    } catch (error) {
      setErrorMessage('アンケートの作成に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (!ankeData) {
    return <div className="text-center py-10">読み込み中...</div>;
  }

  const getCategoryName = (category: string) => {
    const categories: { [key: string]: string } = {
      'auto': '自動選択',
      '1': 'お金',
      '2': '恋愛',
      '3': '仕事',
      '4': '生活',
      '5': '趣味'
    };
    return categories[category] || category;
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <Alert className="border-red-600 bg-red-50">
          <AlertDescription className="font-bold text-red-800">
            ❌ {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      <Alert className="border-blue-500 bg-blue-50">
        <AlertDescription className="text-blue-800">
          以下の内容でアンケートを作成します。よろしければ「投稿する」ボタンをクリックしてください。
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>質問者</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium">{ankeData.userName}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>アンケート内容</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-bold text-gray-700 text-sm">タイトル</p>
            <p className="mt-1 text-lg">{ankeData.title}</p>
          </div>
          <div>
            <p className="font-bold text-gray-700 text-sm">補足内容</p>
            <p className="mt-1 whitespace-pre-wrap">{ankeData.content}</p>
          </div>
          <div>
            <p className="font-bold text-gray-700 text-sm">カテゴリー</p>
            <p className="mt-1">{getCategoryName(ankeData.category)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>選択肢</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {ankeData.choices.map((choice, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="flex-shrink-0 flex justify-center items-center bg-gray-200 rounded-full w-6 h-6 font-bold text-gray-700 text-sm">
                  {index + 1}
                </span>
                <span>{choice}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-4 mt-4">
            {ankeData.multi && (
              <span className="bg-blue-100 px-3 py-1 rounded-full text-blue-800 text-sm">
                複数選択可
              </span>
            )}
            {ankeData.random && (
              <span className="bg-purple-100 px-3 py-1 rounded-full text-purple-800 text-sm">
                ランダム表示
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {(ankeData.imagePreview || ankeData.imageUrl || ankeData.closeDate) && (
        <Card>
          <CardHeader>
            <CardTitle>オプション</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ankeData.imagePreview && (
              <div>
                <p className="font-bold text-gray-700 text-sm mb-2">アップロード画像</p>
                <img 
                  src={ankeData.imagePreview} 
                  alt="アップロード画像" 
                  className="max-w-full h-auto max-h-64 rounded-lg border border-gray-300"
                />
              </div>
            )}
            {ankeData.imageUrl && (
              <div>
                <p className="font-bold text-gray-700 text-sm">画像URL</p>
                <p className="mt-1 text-blue-600 break-all">{ankeData.imageUrl}</p>
              </div>
            )}
            {ankeData.closeDate && (
              <div>
                <p className="font-bold text-gray-700 text-sm">締め切り</p>
                <p className="mt-1">
                  {ankeData.closeDate} {ankeData.closeTime}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center gap-4">
        <Button
          type="button"
          onClick={handleBack}
          variant="outline"
          className="px-10 py-6 text-base"
        >
          戻る
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-[#ff6b35] hover:bg-orange-600 px-10 py-6 text-base"
        >
          {submitting ? '投稿中...' : '投稿する'}
        </Button>
      </div>
    </div>
  );
}
