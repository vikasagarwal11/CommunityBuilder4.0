import { useState } from 'react';
import { User } from 'lucide-react';

interface UserAvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const UserAvatar = ({ src, alt = 'User', size = 'md', className = '' }: UserAvatarProps) => {
  const [imageError, setImageError] = useState(false);
  
  // Size mapping
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24'
  };
  
  // Icon size mapping
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };
  
  const baseClasses = `rounded-full overflow-hidden bg-neutral-200 flex-shrink-0 ${sizeClasses[size]} ${className}`;
  
  if (!src || imageError) {
    return (
      <div className={baseClasses}>
        <div className="h-full w-full flex items-center justify-center">
          <User className={`text-neutral-400 ${iconSizes[size]}`} />
        </div>
      </div>
    );
  }
  
  return (
    <div className={baseClasses}>
      <img 
        src={src} 
        alt={alt} 
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setImageError(true)}
      />
    </div>
  );
};

export default UserAvatar;