'use client';

import { useEffect, useRef } from 'react';

interface AdSenseProps {
  adSlot: string;
  adFormat?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
  fullWidthResponsive?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export default function AdSense({
  adSlot,
  adFormat = 'auto',
  fullWidthResponsive = true,
  style,
  className = '',
}: AdSenseProps) {
  const isAdPushed = useRef(false);

  useEffect(() => {
    if (isAdPushed.current) return;
    
    try {
      if (typeof window !== 'undefined') {
        const w = window as Window & { adsbygoogle?: unknown[] };
        (w.adsbygoogle = w.adsbygoogle || []).push({});
        isAdPushed.current = true;
      }
    } catch (err) {
      // エラーは無視（既に広告が読み込まれている場合のエラーを抑制）
      if (err instanceof Error && !err.message.includes('already have ads')) {
        console.error('AdSense error:', err);
      }
    }
  }, []);

  return (
    <div className={`adsense-container ${className}`} style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', ...style }}
        data-ad-client="ca-pub-6354581291730879"
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
      />
    </div>
  );
}
