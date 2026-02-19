'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface PostEditFormProps {
  postId: number;
  initialTitle: string;
  initialContent: string;
  initialRandom: boolean;
  initialCloseAt: string | null;
  categories: Category[];
}

export default function PostEditForm({
  postId,
  initialTitle,
  initialContent,
  initialRandom,
  initialCloseAt,
  categories
}: PostEditFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent.replace(/\\n/g, '\n'));
  const [random, setRandom] = useState(initialRandom);
  const [closeDate, setCloseDate] = useState(
    initialCloseAt ? new Date(initialCloseAt).toISOString().split('T')[0] : ''
  );
  const [closeTime, setCloseTime] = useState(
    initialCloseAt ? new Date(initialCloseAt).toTimeString().slice(0, 8) : ''
  );
  const [category, setCategory] = useState('auto');
  const [agreement, setAgreement] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: string[] = [];
    
    if (!title.trim()) {
      newErrors.push('タイトルを入力してください');
    }
    if (!content.trim()) {
      newErrors.push('内容を入力してください');
    }
    if (!agreement) {
      newErrors.push('利用規約に同意してください');
    }
    
    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    setErrors([]);
    
    try {
      const response = await fetch('/api/post-edit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          title,
          content,
          random,
          closeDate: closeDate || null,
          closeTime: closeTime || null,
          category
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/posts/${postId}`);
        }, 2000);
      } else {
        setErrors([data.error || '更新に失敗しました']);
      }
    } catch (error) {
      setErrors(['更新に失敗しました: ' + String(error)]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('このアンケートを削除しますか？')) {
      return;
    }
    
    try {
      const response = await fetch('/api/post-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postId }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('削除しました');
        router.push('/my-posts');
      } else {
        alert('削除に失敗しました: ' + (data.error || '不明なエラー'));
      }
    } catch (error) {
      alert('削除に失敗しました: ' + String(error));
    }
  };

  return (
    <>
      {success && (
        <Alert className="bg-green-50 mb-6 border-green-200">
          <AlertDescription className="text-green-800">
            <h4 className="mb-2 font-bold">✓ 更新完了</h4>
            <p>アンケートを正常に更新しました。記事ページに移動します...</p>
          </AlertDescription>
        </Alert>
      )}
      
      {errors.length > 0 && (
        <Alert className="bg-red-50 mb-6 border-red-200">
          <AlertDescription className="text-red-800">
            <h4 className="mb-2 font-bold">エラー</h4>
            <ul className="list-disc list-inside">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-6">
          <div className="mb-4">
            <label className="block mb-2 font-bold text-gray-700">アンケート内容</label>
            
            <div className="space-y-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="タイトルを入力（35文字以内）"
                maxLength={35}
                className="p-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400 w-full"
              />
              
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="補足内容を入力"
                className="p-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400 w-full resize-y"
                style={{ minHeight: '200px' }}
              />
              
              <div className="bg-gray-100 p-4 rounded-lg">
                <div className="mb-4">
                  <label className="block mb-2 font-bold text-gray-700">カテゴリー</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="p-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400 w-full"
                  >
                    <option value="auto">自動選択</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="bg-gray-50 mb-4 p-4 border border-gray-300 rounded">
                  <p className="text-gray-700 text-sm">
                    <strong>注意：</strong>アンケートの選択肢は変更できません。選択肢を変更したい場合は、このアンケートを削除して新規作成してください。
                  </p>
                </div>
                
                <div className="mb-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={random}
                      onChange={(e) => setRandom(e.target.checked)}
                      className="mr-2 rounded focus:ring-orange-400 w-4 h-4 text-orange-500"
                    />
                    <span className="text-gray-700">ランダム表示</span>
                  </label>
                </div>
                
                <div className="mb-4">
                  <label className="block mb-2 font-bold text-gray-700">
                    期限 <span className="text-gray-500 text-sm">(締め切り機能)</span>
                  </label>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block mb-1 text-gray-600 text-sm">日付</label>
                      <input
                        type="date"
                        value={closeDate}
                        onChange={(e) => setCloseDate(e.target.value)}
                        className="p-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400 w-full"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block mb-1 text-gray-600 text-sm">時刻</label>
                      <input
                        type="time"
                        value={closeTime}
                        onChange={(e) => setCloseTime(e.target.value)}
                        className="p-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400 w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center items-center mb-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={agreement}
                onChange={(e) => setAgreement(e.target.checked)}
                className="mr-2 rounded focus:ring-orange-400 w-4 h-4 text-orange-500"
              />
              <span className="text-gray-700">
                <a href="/termsofservice/" target="_blank" className="text-orange-500 hover:underline">
                  利用規約
                </a>
                に同意する
              </span>
            </label>
          </div>
          
          <div className="text-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-block bg-[#ff6b35] hover:bg-[#e55a2b] shadow-md px-10 py-3 border-0 rounded w-full max-w-[400px] font-bold text-white text-base text-center transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '更新中...' : '変更する'}
            </button>
          </div>
        </div>
      </form>
      
      <div className="my-8 text-center">
        <p className="mb-4 font-bold text-gray-800">
          アンケートの選択肢は変更できませんので、削除して新規作成してください。
        </p>
        <button
          type="button"
          onClick={handleDelete}
          className="inline-block bg-gray-600 hover:bg-gray-700 shadow-md px-10 py-3 border-0 rounded w-full max-w-[400px] font-bold text-white text-base text-center transition-colors cursor-pointer"
        >
          削除する
        </button>
      </div>
    </>
  );
}
