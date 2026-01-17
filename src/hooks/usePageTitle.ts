import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title}｜アンケ`;
    
    return () => {
      document.title = 'アンケ｜ニュース × アンケート × コミュニティ。みんなの意見が見える新しいSNS';
    };
  }, [title]);
}
