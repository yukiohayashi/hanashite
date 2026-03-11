interface GuestAvatarProps {
  size?: number;
  className?: string;
}

export default function GuestAvatar({ size = 20, className = '' }: GuestAvatarProps) {
  return (
    <img 
      src="/images/local-avatars/default-avatar.webp"
      alt="ゲストアバター"
      className={`rounded-full object-cover ${className}`}
      style={{ 
        width: `${size}px`, 
        height: `${size}px` 
      }}
    />
  );
}
