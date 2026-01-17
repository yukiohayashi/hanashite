'use client';

import { useState } from 'react';

interface PostImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export default function PostImage({ src, alt, className = '', loading = 'lazy' }: PostImageProps) {
  const defaultImage = '/images/noimage.webp';
  const [imgSrc, setImgSrc] = useState(src || defaultImage);

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
