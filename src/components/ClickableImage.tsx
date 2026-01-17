'use client';

import { useState } from 'react';

interface ClickableImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export default function ClickableImage({ src, alt, className = '', loading = 'lazy' }: ClickableImageProps) {
  const [showModal, setShowModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
      <div 
        className="relative group cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
      >
        <img
          src={src}
          alt={alt}
          className={`${className} transition-all duration-300`}
          loading={loading}
        />
        {/* ホバー時のオーバーレイとズームアイコン */}
        {isHovered && (
          <div 
            className="absolute inset-0 transition-all duration-300 flex items-center justify-center rounded"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
          >
            <div className="transition-all duration-300 opacity-100 scale-100">
              <svg 
                className="w-8 h-8 text-white drop-shadow-lg" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" 
                />
              </svg>
            </div>
          </div>
        )}
      </div>
      
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={handleCloseModal}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full rounded"
          />
        </div>
      )}
    </>
  );
}
