/**
 * Avatar.tsx
 * ハナシテ - ユーザーアバター表示コンポーネント
 * 
 * ローカルアバターを使用してデフォルトアバターを表示
 * ユーザーが画像をアップロードしていない場合、ローカルアバターを表示
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
  /** ユーザーがアップロードした画像URL（nullの場合はローカルアバターを表示） */
  imageUrl?: string | null;
  /** アバタースタイル（デフォルト: 'fun-emoji'） */
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
  // ローカルアバターのURL生成
  const localAvatarUrl = useMemo(() => {
    return '/images/local-avatars/default-avatar.webp';
  }, []);

  // 表示する画像URL（アップロード画像 or ローカルアバター）
  const displayUrl = imageUrl || localAvatarUrl;

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
 * 画像読み込み失敗時にローカルアバターにフォールバックするコンポーネント
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
  const localAvatarUrl = useMemo(() => {
    return '/images/local-avatars/default-avatar.webp';
  }, []);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // 画像読み込み失敗時、ローカルアバターにフォールバック
    e.currentTarget.src = localAvatarUrl;
    onError?.();
  };

  const displayUrl = imageUrl || localAvatarUrl;
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
