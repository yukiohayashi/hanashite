'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export default function GoogleAdFooter() {
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  return (
    <div className="my-4 mx-auto max-w-7xl px-2">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-6354581291730879"
        data-ad-slot="7110919758"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
