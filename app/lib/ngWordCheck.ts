import { supabase } from './supabase';

interface NgWord {
  id: number;
  word: string;
  word_type: string;
  severity: string;
  category: string | null;
  is_active: number;
}

let cachedNgWords: NgWord[] | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分

async function getNgWords(): Promise<NgWord[]> {
  const now = Date.now();
  
  // キャッシュが有効な場合はキャッシュを返す
  if (cachedNgWords && (now - cacheTime) < CACHE_DURATION) {
    return cachedNgWords;
  }

  // NGワードを取得
  const { data } = await supabase
    .from('ng_words')
    .select('*')
    .eq('is_active', 1);

  cachedNgWords = data || [];
  cacheTime = now;
  
  return cachedNgWords;
}

export async function checkNgWord(text: string): Promise<{
  isNg: boolean;
  matchedWord?: string;
  severity?: string;
  category?: string;
}> {
  if (!text || !text.trim()) {
    return { isNg: false };
  }

  const ngWords = await getNgWords();
  const lowerText = text.toLowerCase();

  for (const ngWord of ngWords) {
    const lowerNgWord = ngWord.word.toLowerCase();
    
    // 完全一致チェック
    if (ngWord.word_type === 'exact') {
      if (lowerText === lowerNgWord) {
        return {
          isNg: true,
          matchedWord: ngWord.word,
          severity: ngWord.severity,
          category: ngWord.category || undefined,
        };
      }
    }
    // 部分一致チェック
    else if (ngWord.word_type === 'partial') {
      if (lowerText.includes(lowerNgWord)) {
        return {
          isNg: true,
          matchedWord: ngWord.word,
          severity: ngWord.severity,
          category: ngWord.category || undefined,
        };
      }
    }
  }

  return { isNg: false };
}

// キャッシュをクリアする関数（管理画面でNGワードを更新した時に使用）
export function clearNgWordCache() {
  cachedNgWords = null;
  cacheTime = 0;
}
