'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";

interface Choice {
  id: string;
  value: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

export default function PostCreateForm() {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workid = searchParams.get('workid');

  // 締切日時の最小値と最大値を計算（3週間以内）
  const { minDate, maxDate } = useMemo(() => {
    const today = new Date();
    const threeWeeksLater = new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000);
    return {
      minDate: today.toISOString().split('T')[0],
      maxDate: threeWeeksLater.toISOString().split('T')[0]
    };
  }, []);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'auto',
    multi: false,
    random: false,
    imageUrl: '',
    closeDate: '',
    closeTime: '00:00'
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // 画像ファイル選択ハンドラー
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 画像削除ハンドラー
  const handleImageRemove = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const [choices, setChoices] = useState<Choice[]>([
    { id: '1', value: '' },
    { id: '2', value: '' }
  ]);

  // カテゴリーを取得
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        if (data.success) {
          setCategories(data.categories);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // セッションストレージからデータを復元
  useEffect(() => {
    const savedData = sessionStorage.getItem('anke_create_data');
    const savedImage = sessionStorage.getItem('anke_image_file');
    
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        setFormData({
          title: data.title || '',
          content: data.content || '',
          category: data.category || 'auto',
          multi: data.multi || false,
          random: data.random || false,
          imageUrl: data.imageUrl || '',
          closeDate: data.closeDate || '',
          closeTime: '00:00'
        });
        
        if (data.choices && Array.isArray(data.choices)) {
          setChoices(data.choices.map((value: string, index: number) => ({
            id: (index + 1).toString(),
            value
          })));
        }
      } catch (error) {
        console.error('Failed to restore form data:', error);
      }
    }
    
    if (savedImage) {
      setImagePreview(savedImage);
    }
  }, []);

  // 選択肢を追加
  const addChoice = () => {
    const newId = (Math.max(...choices.map(c => parseInt(c.id))) + 1).toString();
    setChoices([...choices, { id: newId, value: '' }]);
  };

  // 選択肢を削除
  const removeChoice = () => {
    if (choices.length > 2) {
      setChoices(choices.slice(0, -1));
    }
  };

  // すべての選択肢をクリア
  const clearAllChoices = () => {
    setChoices([
      { id: '1', value: '' },
      { id: '2', value: '' }
    ]);
  };

  // 選択肢の値を更新
  const updateChoice = (id: string, value: string) => {
    setChoices(choices.map(c => c.id === id ? { ...c, value } : c));
  };

  // 自動入力機能
  const autoFillChoices = (type: string) => {
    let newChoices: string[] = [];
    
    switch(type) {
      case 'prefecture':
        newChoices = ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県', 
                      '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
                      '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
                      '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
                      '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
                      '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
                      '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'];
        break;
      case 'percent':
        newChoices = Array.from({length: 11}, (_, i) => `${i * 10}%`);
        break;
      case 'frequency':
        newChoices = ['毎日', '週に数回', '週に1回', '月に数回', '月に1回', 'ほとんどない', 'まったくない'];
        break;
      case 'rating':
        newChoices = ['非常に良い', '良い', '普通', '悪い', '非常に悪い'];
        break;
      case 'weekday':
        newChoices = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'];
        break;
      case 'agree':
        newChoices = ['賛成', '反対'];
        break;
    }

    setChoices(newChoices.map((value, index) => ({
      id: (index + 1).toString(),
      value
    })));
  };

  // 一括入力
  const [bulkInput, setBulkInput] = useState('');
  const applyBulkChoices = () => {
    const lines = bulkInput.split('\n').filter(line => line.trim() !== '');
    if (lines.length >= 2) {
      setChoices(lines.map((value, index) => ({
        id: (index + 1).toString(),
        value: value.trim()
      })));
      setBulkInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');

    // バリデーション
    if (!formData.title.trim()) {
      setErrorMessage('タイトルを入力してください');
      setSubmitting(false);
      return;
    }

    if (!formData.content.trim()) {
      setErrorMessage('内容を入力してください');
      setSubmitting(false);
      return;
    }

    if (!formData.closeDate || !formData.closeTime) {
      setErrorMessage('締切日時を入力してください');
      setSubmitting(false);
      return;
    }

    // 相談フォームでは選択肢は不要

    // セッションストレージに保存して確認画面へ遷移
    const ankeData = {
      userId: session?.user?.id,
      userName: session?.user?.name,
      ...formData,
      choices: [], // 相談フォームでは選択肢なし
      imagePreview: imagePreview, // 画像プレビューを保存
      workid: workid ? parseInt(workid) : undefined // workidを追加
    };

    sessionStorage.setItem('anke_create_data', JSON.stringify(ankeData));
    
    // 画像ファイルがある場合は別途保存（Fileオブジェクトは直接JSONにできないため）
    if (imageFile) {
      sessionStorage.setItem('anke_image_file', imagePreview);
    } else {
      sessionStorage.removeItem('anke_image_file');
    }
    
    router.push('/post-confirm');
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-gray-300 rounded-md shadow-sm">
          <div className="p-4 space-y-6">
            {/* 基本情報 */}
            <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                相談タイトル <span className="text-red-600">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="相談のタイトルを入力（35文字以内）"
                maxLength={35}
                required
                className="border-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">
                相談内容 <span className="text-red-600">*</span>
              </Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="相談内容を詳しく入力してください"
                rows={30}
                required
                className="border-gray-300 !field-sizing-auto"
                style={{ minHeight: '400px', height: 'auto' }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">カテゴリー</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="auto">自動選択</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="closeDate">締切日時（3週間以内を選択） <span className="text-red-600">*</span></Label>
              <Input
                id="closeDate"
                type="date"
                value={formData.closeDate}
                onChange={(e) => setFormData({ ...formData, closeDate: e.target.value })}
                min={minDate}
                max={maxDate}
                required
                className="border-gray-300 cursor-pointer w-auto"
              />
            </div>
            </div>

            {/* 区切り線 */}
            <div className="border-t border-gray-300"></div>

            {/* オプション */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowOptions(!showOptions)}
                className="flex items-center gap-2 font-bold text-lg text-gray-700 hover:text-gray-900"
              >
                <span>{showOptions ? '▼' : '▶'}</span>
                <span>オプション（画像アップロード）</span>
              </button>
              
              {showOptions && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="file_photo">
                      画像をアップロード <i className="far fa-image"></i>
                    </Label>
                    <Input
                      id="file_photo"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="cursor-pointer border-gray-300"
                    />
                    {imagePreview && (
                      <div className="relative mt-2">
                        <img src={imagePreview} alt="プレビュー" className="max-w-full h-auto max-h-64 rounded-lg" />
                        <Button
                          type="button"
                          onClick={handleImageRemove}
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                        >
                          削除
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="text-center">
          <Button
            type="submit"
            disabled={submitting}
            className="bg-[#ff6b35] hover:bg-[#e58a2f] px-10 py-6 rounded font-bold text-white text-base"
          >
            {submitting ? '確認画面へ移動中...' : '確認画面へ進む'}
          </Button>
        </div>
      </form>
    </div>
  );
}
