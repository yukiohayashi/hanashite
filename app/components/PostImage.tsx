'use client';

import { useState } from 'react';

interface PostImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export default function PostImage({ src, alt, className = '', loading = 'lazy' }: PostImageProps) {
  const [imgSrc, setImgSrc] = useState(src || 'https://anke.jp/wp-content/themes/anke/images/anke_eye.webp');
  const defaultImage = 'https://anke.jp/wp-content/themes/anke/images/anke_eye.webp';

  const handleError = () => {
    setImgSrc(defaultImage);
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      loading={loading}
      onError={handleError}
    />
  );
}
