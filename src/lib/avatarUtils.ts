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

  // ローカルアバター（f20_XX形式）の場合
  if (seed && seed.startsWith('f20_')) {
    return `/images/local-avatars/${seed}.png`;
  }

  // デフォルトアバター（f20_01）
  return `/images/local-avatars/f20_01.png`;
}
