import React, { useState, useEffect } from 'react';

interface ImageViewProps {
  image: string;
  alt: string;
  className?: string;
}

const ImageView: React.FC<ImageViewProps> = ({ image, alt, className }) => {
  const [imageLoadError, setImageLoadError] = useState<string | null>(null);

  // Debug log the image data
  useEffect(() => {
    if (image) {
      console.log('ImageView received image data length:', image.length);
      console.log('ImageView received image data starts with:', image.substring(0, 100));

      // Validate that it's a data URL
      if (!image.startsWith('data:image/')) {
        console.error('Invalid image data URL format:', image.substring(0, 100));
      }
    }
  }, [image]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setImageLoadError('Failed to load image. Please try again.');
    console.error('Image loading error:', e);
    console.error('Image data that failed to load:', image?.substring(0, 200));

    // Additional debugging
    if (image) {
      console.error('Image data length:', image.length);
      console.error('Image data starts with:', image.substring(0, 100));
      console.error('Is valid data URL:', image.startsWith('data:image/'));
    }
  };

  const handleImageLoad = () => {
    setImageLoadError(null);
  };

  return (
    <div className="w-full">
      {/* Only show error message if there's an error */}
      {imageLoadError && (
        <div className="mb-2 text-red-400 text-sm font-medium">
          {imageLoadError}
        </div>
      )}

      <div className="relative border border-base-300 rounded-lg overflow-hidden bg-base-200 min-h-[200px] flex items-center justify-center">
        {image ? (
          <img
            src={image}
            alt={alt}
            className={className || 'w-full object-contain'}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="text-gray-500 p-4 text-center">
            No image provided
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageView;