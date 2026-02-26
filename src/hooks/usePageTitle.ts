import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title}｜ハナシテ`;
    
    return () => {
      document.title = 'ハナシテ｜恋愛・結婚・人間関係の総合相談プラットフォーム';
    };
  }, [title]);
}
