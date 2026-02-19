interface GuestAvatarProps {
  size?: number;
  className?: string;
}

export default function GuestAvatar({ size = 20, className = '' }: GuestAvatarProps) {
  const scale = size / 20; // 基準サイズ20pxに対するスケール
  
  return (
    <div 
      className={`relative bg-gray-300 rounded-full overflow-hidden ${className}`}
      style={{ 
        width: `${size}px`, 
        height: `${size}px` 
      }}
    >
      {/* 頭部 */}
      <div 
        className="absolute left-1/2 bg-white rounded-full -translate-x-1/2"
        style={{
          top: `${4 * scale}px`,
          width: `${9 * scale}px`,
          height: `${9 * scale}px`
        }}
      />
      {/* 体部 */}
      <div 
        className="absolute left-1/2 bg-white -translate-x-1/2"
        style={{
          top: `${11 * scale}px`,
          width: `${13.5 * scale}px`,
          height: `${10 * scale}px`,
          borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%'
        }}
      />
    </div>
  );
}
