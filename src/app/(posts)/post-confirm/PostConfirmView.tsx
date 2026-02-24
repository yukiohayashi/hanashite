'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { checkNgWord } from '@/lib/ngWordCheck';

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

export default function PostConfirmView() {
  const [ankeData, setAnkeData] = useState<AnkeData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [ngWordWarning, setNgWordWarning] = useState<string>('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const savedData = sessionStorage.getItem('anke_create_data');
    if (savedData) {
      const data = JSON.parse(savedData);
      setAnkeData(data);
      checkForNgWords(data);
    } else {
      router.push('/post-create');
    }
  }, [router]);

  const checkForNgWords = async (data: AnkeData) => {
    // タイトルをチェック
    const titleCheck = await checkNgWord(data.title);
    if (titleCheck.isNg) {
      if (titleCheck.severity === 1) {
        setNgWordWarning('タイトルに不適切な表現が含まれています。投稿できません。');
        setIsBlocked(true);
        setNeedsApproval(false);
        return;
      } else if (titleCheck.severity === 2) {
        setNgWordWarning('タイトルに不適切な表現が含まれています。この投稿は管理者の承認後に公開されます。');
        setIsBlocked(false);
        setNeedsApproval(true);
        return;
      }
    }

    // 本文をチェック
    const contentCheck = await checkNgWord(data.content);
    if (contentCheck.isNg) {
      if (contentCheck.severity === 1) {
        setNgWordWarning('本文に不適切な表現が含まれています。投稿できません。');
        setIsBlocked(true);
        setNeedsApproval(false);
        return;
      } else if (contentCheck.severity === 2) {
        setNgWordWarning('本文に不適切な表現が含まれています。この投稿は管理者の承認後に公開されます。');
        setIsBlocked(false);
        setNeedsApproval(true);
        return;
      }
    }

    setNgWordWarning('');
    setIsBlocked(false);
    setNeedsApproval(false);
  };

  const handleBack = () => {
    router.push('/post-create');
  };

  const handleSubmit = async () => {
    if (!ankeData) return;

    // NGワードチェック（ブロックレベルのみ投稿不可）
    if (isBlocked) {
      setErrorMessage(ngWordWarning);
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      let uploadedImageUrl = ankeData.imageUrl;

      // Base64画像データがある場合、先にアップロードAPIに送信
      if (ankeData.imagePreview && ankeData.imagePreview.startsWith('data:')) {
        try {
          // Base64をBlobに変換
          const base64Response = await fetch(ankeData.imagePreview);
          const blob = await base64Response.blob();

          // FormDataで画像をアップロード
          const formData = new FormData();
          formData.append('image', blob, 'upload.jpg');

          const uploadResponse = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData,
          });

          const uploadData = await uploadResponse.json();

          if (uploadData.success) {
            uploadedImageUrl = uploadData.url;
          } else {
            console.error('画像アップロードエラー:', uploadData.error);
          }
        } catch (uploadError) {
          console.error('画像アップロード処理エラー:', uploadError);
        }
      }

      // 投稿を作成（アップロードされた画像URLを使用）
      const postData = {
        ...ankeData,
        imageUrl: uploadedImageUrl,
        imagePreview: undefined, // Base64データは送信しない
        status: needsApproval ? 'pending' : 'published' // NGワード警告レベルの場合は承認待ち
      };

      const response = await fetch('/api/post-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      const data = await response.json();

      if (data.success) {
        sessionStorage.removeItem('anke_create_data');
        sessionStorage.removeItem('anke_image_file');
        if (needsApproval) {
          // 承認待ちの場合は、承認待ちメッセージを表示してトップページへ
          alert('投稿を受け付けました。管理者の承認後に公開されます。');
          router.push('/');
        } else {
          router.push(`/posts/${data.postId}`);
        }
      } else {
        setErrorMessage(data.error);
      }
    } catch (error) {
      setErrorMessage('相談記事の投稿に失敗しました');
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

  const formatDateWithDay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeek = days[date.getDay()];
    return `${dateStr}(${dayOfWeek})`;
  };

  return (
    <div className="space-y-6">
      {ngWordWarning && (
        <Alert className={isBlocked ? "border-red-600 bg-red-50" : "border-yellow-600 bg-yellow-50"}>
          <AlertDescription className={isBlocked ? "font-bold text-red-800" : "font-bold text-yellow-800"}>
            {isBlocked ? '❌' : '⚠️'} {ngWordWarning}
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

      {!isBlocked && (
        <Alert className="border-blue-500 bg-blue-50">
          <AlertDescription className="text-blue-800">
            以下の内容で投稿します。内容をご確認の上、問題なければ下のボタンをクリックしてください。
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-white border border-gray-300 rounded-md shadow-sm">
        <div className="p-4 space-y-6">
          {/* 相談者 */}
          <div>
            <h3 className="font-bold text-lg mb-2">相談者</h3>
            <p className="font-medium">{ankeData.userName}</p>
          </div>

          {/* 相談内容 */}
          <div className="space-y-4">
          <div>
            <p className="font-bold text-gray-700 text-sm">タイトル</p>
            <p className="mt-1 text-lg">{ankeData.title}</p>
          </div>
          <div>
            <p className="font-bold text-gray-700 text-sm">相談内容</p>
            <p className="mt-1 whitespace-pre-wrap">{ankeData.content}</p>
          </div>
          <div>
            <p className="font-bold text-gray-700 text-sm">カテゴリー</p>
            <p className="mt-1">{getCategoryName(ankeData.category)}</p>
          </div>
          <div>
            <p className="font-bold text-gray-700 text-sm">締切日時</p>
            <p className="mt-1">
              {formatDateWithDay(ankeData.closeDate)} {ankeData.closeTime}
            </p>
          </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <Button
          type="button"
          onClick={handleBack}
          variant="outline"
          className="px-10 py-6 rounded font-bold text-base"
        >
          戻る
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || isBlocked}
          className="bg-[#ff6b35] hover:bg-[#e58a2f] px-10 py-6 rounded font-bold text-white text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '投稿中...' : 'この内容で投稿する'}
        </Button>
      </div>
    </div>
  );
}
