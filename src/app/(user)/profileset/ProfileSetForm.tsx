'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarStyle } from '@/components/Avatar';
import { supabase } from '@/lib/supabase';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  user_description?: string;
  participate_points?: boolean;
  sex?: string;
  birth_year?: string;
  prefecture?: string;
  sns_x?: string;
  marriage?: string;
  child_count?: number;
  job?: string;
  kana_sei?: string;
  kana_mei?: string;
  sei?: string;
  mei?: string;
  email_subscription?: boolean;
  interest_categories?: string;
  profile_slug?: string;
  profile_slug_updated_at?: string;
  image?: string;
  avatar_style?: AvatarStyle;
  avatar_seed?: string;
  use_custom_image?: boolean;
}

interface ProfileSetFormProps {
  user: User;
  categories: Category[];
  isFirstTime: boolean;
}

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県',
  '山形県', '福島県', '茨城県', '栃木県', '群馬県',
  '埼玉県', '千葉県', '東京都', '神奈川県', '新潟県',
  '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県', '滋賀県',
  '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県',
  '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県',
  '鹿児島県', '沖縄県'
];

const JOBS = [
  '会社員', '会社役員', '自営業', 'フリーランス',
  '大学生/大学院生', '専門学校生', '小/中/高校生',
  '主婦', '無職', 'その他'
];


type ImageMode = 'upload' | 'avatar' | 'none';

export default function ProfileSetForm({ user, categories, isFirstTime }: ProfileSetFormProps) {
  
  const [nickname, setNickname] = useState(user.name || '');
  const [profile, setProfile] = useState(user.user_description || '');
  const [profileSlug, setProfileSlug] = useState(user.profile_slug || user.id || '');
  const [snsX, setSnsX] = useState(user.sns_x || '');
  const [participatePoints, setParticipatePoints] = useState(user.participate_points || false);
  const [bestAnswerPoints, setBestAnswerPoints] = useState<number>(10);
  const [sex, setSex] = useState(user.sex || '');
  const currentYear = new Date().getFullYear();
  const defaultBirthYear = currentYear - 30; // デフォルト30歳
  const [birthYear, setBirthYear] = useState(user.birth_year || '');
  const [prefecture, setPrefecture] = useState(user.prefecture || '');
  const [marriage, setMarriage] = useState(user.marriage || 'not_specified');
  const [childCount, setChildCount] = useState(user.child_count || 0);
  const [job, setJob] = useState(user.job || '');
  const [kanaSei, setKanaSei] = useState(user.kana_sei || '');
  const [kanaMei, setKanaMei] = useState(user.kana_mei || '');
  const [sei, setSei] = useState(user.sei || '');
  const [mei, setMei] = useState(user.mei || '');
  const [emailSubscription, setEmailSubscription] = useState(user.email_subscription ?? true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  // DiceBearアバター関連の状態
  const [imageMode, setImageMode] = useState<ImageMode>(() => {
    console.log('Initializing imageMode:', {
      use_custom_image: user.use_custom_image,
      image: user.image,
      avatar_seed: user.avatar_seed
    });
    return user.use_custom_image ? 'upload' : (user.avatar_seed ? 'avatar' : 'none');
  });
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(user.avatar_style || 'fun-emoji');
  const [avatarSeed, setAvatarSeed] = useState<string>(user.avatar_seed || '');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [profileLength, setProfileLength] = useState(0);

  useEffect(() => {
    if (user.interest_categories) {
      try {
        const cats = JSON.parse(user.interest_categories);
        setSelectedCategories(Array.isArray(cats) ? cats : []);
      } catch {
        setSelectedCategories([]);
      }
    }
  }, [user.interest_categories]);

  useEffect(() => {
    setProfileLength(profile.length);
  }, [profile]);

  useEffect(() => {
    const fetchBestAnswerPoints = async () => {
      const { data } = await supabase
        .from('point_settings')
        .select('point_value')
        .eq('point_type', 'best_answer')
        .single();
      
      if (data) {
        setBestAnswerPoints(data.point_value);
      }
    };
    
    fetchBestAnswerPoints();
  }, []);

  const canChangeSlug = () => {
    if (!user.profile_slug_updated_at) return true;
    const lastUpdate = new Date(user.profile_slug_updated_at);
    const oneMonthLater = new Date(lastUpdate);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    return new Date() >= oneMonthLater;
  };

  const getDaysUntilChange = () => {
    if (!user.profile_slug_updated_at) return 0;
    const lastUpdate = new Date(user.profile_slug_updated_at);
    const oneMonthLater = new Date(lastUpdate);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    const diff = oneMonthLater.getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleCategoryChange = (slug: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, slug]);
    } else {
      setSelectedCategories(selectedCategories.filter(s => s !== slug));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submission started');
    console.log('Current imageMode:', imageMode);
    console.log('Avatar file:', avatarFile ? avatarFile.name : 'No file');
    
    const newErrors: string[] = [];
    
    if (!nickname.trim()) {
      newErrors.push('ニックネームを入力してください');
    }
    
    if (!job) {
      newErrors.push('職種を選択してください');
    }
    
    if (profileSlug && profileSlug !== `?user_id=${user.id}`) {
      if (!canChangeSlug()) {
        newErrors.push(`プロフィールURLは変更後1ヶ月間変更できません。あと${getDaysUntilChange()}日お待ちください。`);
      } else if (!/^[a-zA-Z0-9_-]+$/.test(profileSlug)) {
        newErrors.push('プロフィールURLは英数字、ハイフン、アンダースコアのみ使用できます。');
      } else if (profileSlug.length < 3 || profileSlug.length > 30) {
        newErrors.push('プロフィールURLは3文字以上30文字以内で入力してください。');
      }
    }
    
    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    setErrors([]);
    
    try {
      const formData = new FormData();
      formData.append('nickname', nickname);
      formData.append('profile', profile);
      formData.append('profileSlug', profileSlug);
      formData.append('snsX', snsX);
      formData.append('participatePoints', participatePoints ? '1' : '0');
      formData.append('sex', sex);
      formData.append('birthYear', birthYear);
      formData.append('prefecture', prefecture);
      formData.append('marriage', marriage);
      formData.append('childCount', childCount.toString());
      formData.append('job', job);
      formData.append('kanaSei', kanaSei);
      formData.append('kanaMei', kanaMei);
      formData.append('sei', sei);
      formData.append('mei', mei);
      formData.append('emailSubscription', emailSubscription ? '1' : '0');
      formData.append('interestCategories', JSON.stringify(selectedCategories));
      
      // DiceBearアバター関連の情報を追加
      formData.append('imageMode', imageMode);
      formData.append('avatarStyle', imageMode === 'avatar' ? avatarStyle : '');
      formData.append('avatarSeed', imageMode === 'avatar' ? avatarSeed : '');
      formData.append('useCustomImage', imageMode === 'upload' ? '1' : '0');
      
      if (avatarFile && imageMode === 'upload') {
        formData.append('avatar', avatarFile);
      }
      
      let data;
      try {
        console.log('Sending request to /api/user/profileset');
        const response = await fetch('/api/user/profileset', {
          method: 'POST',
          body: formData,
        });
        
        console.log('Response status:', response.status);
        data = await response.json();
        
        console.log('API Response:', data);
        console.log('Updated user data:', data.user);
      } catch (error) {
        console.error('Request error:', error);
        setErrors(['ネットワークエラーが発生しました']);
        setIsSubmitting(false);
        return;
      }
      
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          // ページをリロードして更新内容を反映
          window.location.reload();
        }, 2000);
      } else {
        setErrors([data.error || 'プロフィールの更新に失敗しました']);
      }
    } catch (error) {
      setErrors(['プロフィールの更新に失敗しました: ' + String(error)]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 13歳以上のみ利用可能（最大年齢は1940年生まれ）
  const minBirthYear = 1940;
  const maxBirthYear = currentYear - 13;

  return (
    <>
      {success && (
        <Alert className="bg-green-50 mb-4 border-green-200">
          <AlertDescription className="text-green-800 text-center">
            <p className="font-bold">✅ プロフィールを更新しました（ポイント獲得: {participatePoints ? '参加中' : '不参加'}）</p>
          </AlertDescription>
        </Alert>
      )}
      
      {errors.length > 0 && (
        <Alert className="bg-red-50 mb-4 border-red-200">
          <AlertDescription className="text-red-800">
            {errors.map((error, index) => (
              <p key={index}>❌ {error}</p>
            ))}
          </AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-6">
        {isFirstTime && (
          <div className="text-gray-600 text-sm text-right">
            <sup>※印は入力必須</sup>
          </div>
        )}
        
        <div className="mb-4">
          <label className="block mb-2 font-bold text-gray-700">
            興味のあるカテゴリ（１つ以上選択して下さい）
          </label>
          <div className="gap-x-1 gap-y-1 grid grid-cols-6">
            {categories.map((category) => (
              <label key={category.id} className="items-center space-x-1 hover:bg-gray-50 p-1 rounded whitespace-nowrap cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category.slug)}
                  onChange={(e) => handleCategoryChange(category.slug, e.target.checked)}
                  className="rounded focus:ring-orange-400 w-4 h-4 text-orange-500"
                />
                <span className="text-gray-700 text-sm leading-none">{category.name}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 font-bold text-gray-700">メールアドレス</label>
          <p className="mb-2 text-gray-600 text-sm">
            メールアドレスの変更は一度<a href="/logout" className="text-orange-500 hover:underline">ログアウト</a>してログインページの下にあるパスワードの再設定から行う必要があります。
          </p>
          <Input type="text" value={user.email} disabled className="bg-gray-200" />
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 font-bold text-gray-700">
            ニックネーム <sup className="text-gray-600 text-xs">※日本語推奨</sup>
          </label>
          <Input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full"
          />
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 font-bold text-gray-700">
            自己紹介<sup className="text-red-600">※</sup>
          </label>
          <Textarea
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            className="w-full min-h-[80px] resize-y"
          />
          <div className="mt-1 text-gray-600 text-sm">
            <sup>現在: {profileLength}文字</sup>
          </div>
        </div>
        
        {/* プロフィール画像選択（DiceBear統合版） */}
        <div className="mb-4">
          <label className="block mb-2 font-bold text-gray-700">プロフィール画像</label>
          
          {/* プレビュー */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              {imageMode === 'none' ? (
                <img
                  src="/images/default-avatar.svg"
                  alt="デフォルトアバター"
                  width={120}
                  height={120}
                  className="rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <Avatar
                  userId={imageMode === 'avatar' ? avatarSeed : user.id}
                  imageUrl={
                    imageMode === 'upload'
                      ? (avatarFile ? URL.createObjectURL(avatarFile) : user.image)
                      : null
                  }
                  style={avatarStyle}
                  size={120}
                  className="border-4 border-white shadow-lg"
                />
              )}
              {imageMode === 'none' && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                  未設定
                </div>
              )}
            </div>
          </div>

          {/* モード選択ボタン */}
          <div className="flex gap-2 justify-center mb-4">
            <button
              type="button"
              onClick={() => setImageMode('upload')}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${
                  imageMode === 'upload'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              画像をアップロード
            </button>
            <button
              type="button"
              onClick={() => setImageMode('avatar')}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${
                  imageMode === 'avatar'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              アバターを選択
            </button>
            <button
              type="button"
              onClick={() => setImageMode('none')}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${
                  imageMode === 'none'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              未設定
            </button>
          </div>

          {/* 画像アップロードモード */}
          {imageMode === 'upload' && (
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-700">
                プロフィール画像をアップロードしてください。
              </div>
              
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setAvatarFile(file);
                    setImageMode('upload');
                  }
                }}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-orange-50 file:text-orange-700
                  hover:file:bg-orange-100 cursor-pointer"
              />
              
              <div className="text-xs text-gray-500 bg-white p-3 rounded border border-gray-200">
                <div className="font-medium mb-1">アップロード要件：</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>ファイルサイズ: 2MBまで</li>
                  <li>ファイル形式: JPEG、PNG、WEBP</li>
                  <li>他者の権利侵害や暴力的な表現は禁止</li>
                  <li>性的な表現を含む画像はNG</li>
                </ul>
              </div>
            </div>
          )}

          {/* アバター選択モード */}
          {imageMode === 'avatar' && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-6">
              <div className="max-h-[600px] overflow-y-auto border border-gray-200 rounded-lg bg-white p-3 space-y-6">

                {([
                  { style: 'adventurer' as AvatarStyle, label: '✨ アニメ風', prefix: 'adv' },
                  { style: 'adventurer-neutral' as AvatarStyle, label: '✨ アニメ風（中性）', prefix: 'advn' },
                  { style: 'avataaars' as AvatarStyle, label: '👤 アバター', prefix: 'av' },
                  { style: 'avataaars-neutral' as AvatarStyle, label: '� アバター（中性）', prefix: 'avn' },
                  { style: 'croodles' as AvatarStyle, label: '�️ 手書き風', prefix: 'croodles' },
                  { style: 'croodles-neutral' as AvatarStyle, label: '🖊️ 手書き風（中性）', prefix: 'croodlesn' },
                  { style: 'fun-emoji' as AvatarStyle, label: '😄 絵文字', prefix: 'emoji' },
                  { style: 'pixel-art' as AvatarStyle, label: '🎮 ドット絵', prefix: 'pixel' },
                ] as { style: AvatarStyle; label: string; prefix: string }[]).map(({ style: s, label, prefix }) => (
                  <div key={s}>
                    <div className="text-sm font-medium text-gray-700 mb-2 sticky top-0 bg-white py-1 z-10">
                      {label}
                    </div>
                    <div className="grid grid-cols-6 md:grid-cols-10 gap-2">
                      {Array.from({ length: 20 }, (_, i) => {
                        const seed = `${prefix}-${i + 1}`;
                        const isSelected = avatarSeed === seed && avatarStyle === s;
                        return (
                          <button
                            key={seed}
                            type="button"
                            onClick={() => { setAvatarStyle(s); setAvatarSeed(seed); }}
                            className={`p-1 rounded-lg transition-all ${isSelected ? 'ring-2 ring-orange-500 bg-orange-50' : 'hover:bg-gray-100'}`}
                            title={`${label} ${i + 1}`}
                          >
                            <img
                              src={`https://api.dicebear.com/9.x/${s}/svg?seed=${seed}&size=40`}
                              alt={`${label} ${i + 1}`}
                              width={40}
                              height={40}
                              loading="lazy"
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

              </div>
              <div className="text-xs text-gray-500 text-center">
                160種類のキャラクターから選べます
              </div>
            </div>
          )}

          {/* 未設定モード */}
          {imageMode === 'none' && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 text-center">
                プロフィール画像が未設定の場合、デフォルトのアバターが自動的に表示されます。
              </div>
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 font-bold text-gray-700">
            性別<sup className="text-red-600">※</sup>
          </label>
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value)}
            className="p-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400 w-full"
          >
            <option value="">選択してください</option>
            <option value="female">女性</option>
            <option value="male">男性</option>
            <option value="other">その他</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 font-bold text-gray-700">
            生まれた年<sup className="text-red-600">※</sup>
            <span className="ml-2 text-gray-500 text-xs font-normal">※20代など年代のみ表示されます</span>
          </label>
          <select
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            className="p-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400 w-full"
          >
            <option value="">選択してください</option>
            {Array.from({ length: maxBirthYear - minBirthYear + 1 }, (_, i) => maxBirthYear - i).map((year) => (
              <option key={year} value={year}>{year}年生まれ</option>
            ))}
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 font-bold text-gray-700">
            都道府県<sup className="text-red-600">※</sup>
          </label>
          <select
            value={prefecture}
            onChange={(e) => setPrefecture(e.target.value)}
            className="p-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400 w-full"
          >
            <option value="">選択してください</option>
            {PREFECTURES.map((pref) => (
              <option key={pref} value={pref}>{pref}</option>
            ))}
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 font-bold text-gray-700">
            職種<sup className="text-red-600">※</sup>
            <span className="ml-2 text-gray-500 text-xs font-normal">※表示されません</span>
          </label>
          <select
            value={job}
            onChange={(e) => setJob(e.target.value)}
            className="p-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400 w-full"
          >
            <option value="">選択してください</option>
            {JOBS.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 font-bold text-gray-700">
            プロフィールURL
            {!canChangeSlug() ? (
              <sup className="text-red-600 text-xs">※変更後1ヶ月間は変更できません（あと{getDaysUntilChange()}日）</sup>
            ) : (
              <sup className="text-gray-600 text-xs">※英数字、ハイフン、アンダースコアのみ（3-30文字）</sup>
            )}
          </label>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700 text-sm whitespace-nowrap">{process.env.NEXT_PUBLIC_APP_URL}/user/</span>
            <Input
              type="text"
              value={profileSlug}
              onChange={(e) => setProfileSlug(e.target.value)}
              placeholder="tanaka_taro"
              disabled={!canChangeSlug()}
              className={`flex-1 max-w-[200px] text-sm ${!canChangeSlug() ? 'bg-gray-200' : ''}`}
            />
            <a
              href={profileSlug && profileSlug !== `?user_id=${user.id}` ? `/users/${profileSlug}` : `/users/${user.id}`}
              target="_blank"
              className="shrink-0 text-orange-500 hover:text-orange-600 text-lg"
              title="プロフィールページを見る"
            >
              <i className="fas fa-external-link-alt"></i>
            </a>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 font-bold text-gray-700">X(url)</label>
          <Input
            type="text"
            value={snsX}
            onChange={(e) => setSnsX(e.target.value)}
            className="w-full"
          />
          <p className="mt-1 text-gray-600 text-xs">https://からすべて入力してください</p>
        </div>
        
        <div className="flex justify-center items-center gap-2 my-6">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={emailSubscription}
              onChange={(e) => setEmailSubscription(e.target.checked)}
              className="mr-2 rounded focus:ring-orange-400 w-4 h-4 text-orange-500"
            />
            <span className="text-gray-700">メルマガを受け取る</span>
          </label>
        </div>
        
        {participatePoints && (
          <div className="space-y-4">
            <div className="mb-4">
              <label className="block mb-2 font-bold text-gray-700">結婚の有無</label>
              <select
                value={marriage}
                onChange={(e) => setMarriage(e.target.value)}
                className="p-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400 w-full"
              >
                <option value="not_specified">選択して下さい</option>
                <option value="single">未婚</option>
                <option value="married">既婚</option>
                <option value="divorced">離婚</option>
                <option value="widowed">死別</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 font-bold text-gray-700">子どもの数</label>
              <select
                value={childCount}
                onChange={(e) => setChildCount(parseInt(e.target.value))}
                className="p-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-400 w-full"
              >
                {[0, 1, 2, 3, 4].map((num) => (
                  <option key={num} value={num}>{num}人</option>
                ))}
                <option value="5">5人以上</option>
              </select>
            </div>
            
            <div className="gap-4 grid grid-cols-2 mb-4">
              <div>
                <label className="block mb-2 font-bold text-gray-700">
                  セイ<sup className="text-red-600 text-xs">※還元申請時に必須</sup>
                </label>
                <Input
                  type="text"
                  value={kanaSei}
                  onChange={(e) => setKanaSei(e.target.value)}
                />
              </div>
              <div>
                <label className="block mb-2 font-bold text-gray-700">メイ</label>
                <Input
                  type="text"
                  value={kanaMei}
                  onChange={(e) => setKanaMei(e.target.value)}
                />
              </div>
            </div>
            
            <div className="gap-4 grid grid-cols-2 mb-4">
              <div>
                <label className="block mb-2 font-bold text-gray-700">姓</label>
                <Input
                  type="text"
                  value={sei}
                  onChange={(e) => setSei(e.target.value)}
                />
              </div>
              <div>
                <label className="block mb-2 font-bold text-gray-700">名</label>
                <Input
                  type="text"
                  value={mei}
                  onChange={(e) => setMei(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-gray-50 my-6 p-4 border border-gray-300 rounded-lg">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={participatePoints}
              onChange={(e) => setParticipatePoints(e.target.checked)}
              className="mr-3 rounded focus:ring-orange-400 w-5 h-5 text-orange-500"
            />
            <span className="font-bold text-gray-800">ポイント獲得に参加する</span>
          </label>
          <p className="mt-2 ml-8 text-gray-600 text-sm">
            チェックを入れると、ベストアンサーで<span className="font-bold text-orange-600">{bestAnswerPoints}ポイント</span>獲得できます。<br />
            参加する場合は、以下の詳細情報の入力をお願いします。
          </p>
        </div>
        
        <div className="mt-8 text-center">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#ff6b35] hover:bg-[#e55a2b] mx-auto px-10 py-6 font-bold text-white text-lg disabled:opacity-50 w-auto"
          >
            {isSubmitting ? '更新中...' : 'プロフィールを更新する'}
          </Button>
        </div>
      </form>
    </>
  );
}
