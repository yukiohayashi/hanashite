'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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

export default function AnkeCreateForm() {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const { data: session } = useSession();
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'auto',
    multi: false,
    random: false,
    imageUrl: '',
    closeDate: '',
    closeTime: ''
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
          closeTime: data.closeTime || ''
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

    const validChoices = choices.filter(c => c.value.trim() !== '');
    if (validChoices.length < 2) {
      setErrorMessage('選択肢を2つ以上入力してください');
      setSubmitting(false);
      return;
    }

    // セッションストレージに保存して確認画面へ遷移
    const ankeData = {
      userId: session?.user?.id,
      userName: session?.user?.name,
      ...formData,
      choices: validChoices.map(c => c.value),
      imagePreview: imagePreview // 画像プレビューを保存
    };

    sessionStorage.setItem('anke_create_data', JSON.stringify(ankeData));
    
    // 画像ファイルがある場合は別途保存（Fileオブジェクトは直接JSONにできないため）
    if (imageFile) {
      sessionStorage.setItem('anke_image_file', imagePreview);
    } else {
      sessionStorage.removeItem('anke_image_file');
    }
    
    router.push('/anke-confirm');
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
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                アンケート内容 <span className="text-red-600">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="タイトルを入力（35文字以内）"
                maxLength={35}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">
                補足内容 <span className="text-red-600">*</span>
              </Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="補足内容を入力"
                rows={6}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">カテゴリー</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">自動選択</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>選択肢</CardTitle>
            <CardDescription>※「どちらでもない」などの曖昧な選択肢は避けて、明確な回答をお選びください</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => autoFillChoices('prefecture')} variant="outline" size="sm">
                47都道府県
              </Button>
              <Button type="button" onClick={() => autoFillChoices('percent')} variant="outline" size="sm">
                0～100％
              </Button>
              <Button type="button" onClick={() => autoFillChoices('frequency')} variant="outline" size="sm">
                頻度
              </Button>
              <Button type="button" onClick={() => autoFillChoices('rating')} variant="outline" size="sm">
                5段階評価
              </Button>
              <Button type="button" onClick={() => autoFillChoices('weekday')} variant="outline" size="sm">
                曜日
              </Button>
              <Button type="button" onClick={() => autoFillChoices('agree')} variant="outline" size="sm">
                賛成/反対
              </Button>
            </div>

            <div className="space-y-2">
              {choices.map((choice, index) => (
                <Input
                  key={choice.id}
                  value={choice.value}
                  onChange={(e) => updateChoice(choice.id, e.target.value)}
                  placeholder={`選択肢${index + 1}`}
                />
              ))}
            </div>

            <div className="flex justify-center gap-2">
              <Button type="button" onClick={addChoice} variant="secondary">
                ＋ 追加
              </Button>
              <Button type="button" onClick={removeChoice} variant="secondary" disabled={choices.length <= 2}>
                － 削除
              </Button>
              <Button type="button" onClick={clearAllChoices} variant="destructive">
                すべて消去
              </Button>
            </div>

            <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
              <Label htmlFor="bulkInput">一括入力（1行に1つの選択肢）</Label>
              <Textarea
                id="bulkInput"
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                rows={5}
                placeholder="例：&#10;思う&#10;思わない&#10;どちらとも言えない"
              />
              <Button type="button" onClick={applyBulkChoices} variant="secondary" size="sm">
                一括適用
              </Button>
              <p className="text-gray-600 text-xs">※既存の選択肢は削除され、入力した内容で置き換わります</p>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="multi"
                  checked={formData.multi}
                  onCheckedChange={(checked) => setFormData({ ...formData, multi: checked as boolean })}
                />
                <Label htmlFor="multi" className="cursor-pointer">複数選択</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="random"
                  checked={formData.random}
                  onCheckedChange={(checked) => setFormData({ ...formData, random: checked as boolean })}
                />
                <Label htmlFor="random" className="cursor-pointer">ランダム表示</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>オプション</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file_photo">
                画像をアップロード <i className="far fa-image"></i>
              </Label>
              <Input
                id="file_photo"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="cursor-pointer"
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

            <div className="space-y-2">
              <Label htmlFor="imageUrl">画像URL（任意）</Label>
              <Input
                id="imageUrl"
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="画像の代わりに関連するニュースや動画等があればURLを貼ってください"
              />
            </div>

            <div className="space-y-2">
              <Label>締め切り（任意）</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={formData.closeDate}
                  onChange={(e) => setFormData({ ...formData, closeDate: e.target.value })}
                />
                <Input
                  type="time"
                  value={formData.closeTime}
                  onChange={(e) => setFormData({ ...formData, closeTime: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            type="submit"
            disabled={submitting}
            className="bg-[#ff6b35] hover:bg-orange-600 px-10 py-6 text-base"
          >
            {submitting ? '確認画面へ移動中...' : '確認画面へ進む'}
          </Button>
        </div>
      </form>
    </div>
  );
}
