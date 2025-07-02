import React, { useRef, useState } from 'react';
import { Image, X, Loader } from 'lucide-react';

interface ImageUploadButtonProps {
  onImagesSelected: (files: File[]) => void;
  disabled?: boolean;
}

const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({
  onImagesSelected,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError('');
    setIsUploading(true);

    // Validate files
    const validFiles: File[] = [];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    Array.from(files).forEach(file => {
      if (file.size > maxSize) {
        setError('Image must be less than 5MB');
        return;
      }

      if (!validTypes.includes(file.type)) {
        setError('Only JPEG, PNG, GIF, and WebP images are allowed');
        return;
      }

      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      onImagesSelected(validFiles);
    }

    // Reset file input
    e.target.value = '';
    setIsUploading(false);
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={disabled || isUploading}
        className={`p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-full ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        title="Upload image"
      >
        {isUploading ? <Loader className="h-5 w-5 animate-spin" /> : <Image size={20} />}
      </button>
      
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        multiple
      />
      
      {error && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-red-50 text-red-700 text-xs p-2 rounded-lg whitespace-nowrap">
          {error}
          <button 
            onClick={() => setError('')}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            <X className="h-3 w-3 inline" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUploadButton;