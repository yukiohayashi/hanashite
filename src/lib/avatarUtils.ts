/**
 * アバター画像のURLを取得するユーティリティ関数
 */

/**
 * アバター画像のURLを取得
 * 優先順位: カスタム画像 > ローカルアバター（f20_XX） > デフォルトアバター（f20_01）
 */
export function getAvatarUrl(
  userId: string,
  customImage: string | null | undefined,
  useCustom: boolean | undefined,
  style: string | null | undefined,
  seed: string | null | undefined,
  size: number = 40
): string {
  // カスタム画像を使用する場合
  if (useCustom && customImage) {
    return customImage;
  }

  // ローカルアバター（f20_XX, f30_XX, m20_XX, cat_XX等）の場合
  if (seed && (seed.startsWith('f20_') || seed.startsWith('f30_') || seed.startsWith('f40_') || 
               seed.startsWith('m20_') || seed.startsWith('m30_') || seed.startsWith('m40_') ||
               seed.startsWith('cat_') || seed.startsWith('dog_') || seed.startsWith('rabbit_') ||
               seed.startsWith('bear_') || seed.startsWith('other_'))) {
    return `/images/local-avatars/${seed}.webp`;
  }

  // デフォルトアバター（f20_01）
  return `/images/local-avatars/f20_01.webp`;
}
