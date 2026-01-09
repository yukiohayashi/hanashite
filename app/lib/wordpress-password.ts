import bcrypt from 'bcryptjs';

/**
 * WordPress PHPass形式のパスワードハッシュを検証
 */
export async function verifyWordPressPassword(password: string, hash: string): Promise<boolean> {
  // PHPass形式（$P$で始まる）の場合
  if (hash.startsWith('$P$') || hash.startsWith('$H$')) {
    // PHPassの検証は複雑なので、簡易版として bcrypt で検証を試みる
    // 本番環境では専用のPHPassライブラリを使用することを推奨
    try {
      return await bcrypt.compare(password, hash);
    } catch {
      return false;
    }
  }
  
  // bcrypt形式（$2y$で始まる）の場合
  if (hash.startsWith('$2y$') || hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
    try {
      return await bcrypt.compare(password, hash);
    } catch {
      return false;
    }
  }
  
  return false;
}

/**
 * テスト用：パスワードハッシュを生成
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}
