'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export default function GoogleAdPost() {
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
    <div className="my-4">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-6354581291730879"
        data-ad-slot="4655497753"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
