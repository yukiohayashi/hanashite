/**
 * Avatar.tsx
 * ハナシテ - ユーザーアバター表示コンポーネント
 * 
 * DiceBearを使用してデフォルトアバターを生成
 * ユーザーが画像をアップロードしていない場合、選択したスタイルのアバターを表示
 */

import { useMemo } from 'react';

export type AvatarStyle = 
  | 'adventurer'           // アニメ風の人物キャラクター
  | 'adventurer-neutral'   // アニメ風（中性的）
  | 'avataaars'            // 多様性のあるキャラクター
  | 'avataaars-neutral'    // アバター（中性的）
  | 'croodles'             // 手書き風の可愛いキャラクター
  | 'croodles-neutral'     // 手書き風（中性的）
  | 'fun-emoji'            // 絵文字風の可愛らしいアバター
  | 'pixel-art';           // ドット絵風

interface AvatarProps {
  /** ユーザーID（アバター生成のシードとして使用） */
  userId: string;
  /** ユーザーがアップロードした画像URL（nullの場合はDiceBearアバターを表示） */
  imageUrl?: string | null;
  /** DiceBearのスタイル（デフォルト: 'fun-emoji'） */
  style?: AvatarStyle;
  /** アバターのサイズ（px）（デフォルト: 40） */
  size?: number;
  /** 代替テキスト */
  alt?: string;
  /** 追加のCSSクラス */
  className?: string;
}

export function Avatar({
  userId,
  imageUrl,
  style = 'fun-emoji',
  size = 40,
  alt,
  className = '',
}: AvatarProps) {
  // DiceBear HTTP APIのURL生成
  const dicebearUrl = useMemo(() => {
    return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(userId)}&size=${size}`;
  }, [userId, style, size]);

  // 表示する画像URL（アップロード画像 or DiceBearアバター）
  const displayUrl = imageUrl || dicebearUrl;

  // 代替テキスト
  const altText = alt || `${userId}のアバター`;

  return (
    <img
      src={displayUrl}
      alt={altText}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      loading="lazy"
    />
  );
}

/**
 * AvatarWithFallback
 * 画像読み込み失敗時にDiceBearアバターにフォールバックするコンポーネント
 */
interface AvatarWithFallbackProps extends AvatarProps {
  /** 画像読み込み失敗時のコールバック */
  onError?: () => void;
}

export function AvatarWithFallback({
  userId,
  imageUrl,
  style = 'fun-emoji',
  size = 40,
  alt,
  className = '',
  onError,
}: AvatarWithFallbackProps) {
  const dicebearUrl = useMemo(() => {
    return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(userId)}&size=${size}`;
  }, [userId, style, size]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // 画像読み込み失敗時、DiceBearアバターにフォールバック
    e.currentTarget.src = dicebearUrl;
    onError?.();
  };

  const displayUrl = imageUrl || dicebearUrl;
  const altText = alt || `${userId}のアバター`;

  return (
    <img
      src={displayUrl}
      alt={altText}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      loading="lazy"
      onError={handleError}
    />
  );
}
