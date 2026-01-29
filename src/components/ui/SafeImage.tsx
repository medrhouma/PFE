"use client";

import React, { useState, useCallback, useEffect } from 'react';
import Image, { ImageProps } from 'next/image';
import { getSafeImageSrc, DEFAULT_AVATAR, DEFAULT_IMAGE } from '@/lib/utils';
import { User, Image as ImageIcon, File } from 'lucide-react';

export type ImageType = 'avatar' | 'document' | 'general';

interface SafeImageProps extends Omit<ImageProps, 'src' | 'onError'> {
  src: string | null | undefined;
  fallbackSrc?: string;
  type?: ImageType;
  showPlaceholder?: boolean;
  placeholderClassName?: string;
}

/**
 * SafeImage Component
 * Validates image sources and provides fallbacks for broken images
 * Prevents ERR_INVALID_URL errors in the console
 */
export function SafeImage({
  src,
  fallbackSrc,
  type = 'general',
  showPlaceholder = true,
  placeholderClassName = '',
  alt,
  className,
  ...props
}: SafeImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Validate the image source
  useEffect(() => {
    const safeSrc = getSafeImageSrc(src);
    setImageSrc(safeSrc);
    setHasError(!safeSrc);
    setIsLoading(false);
  }, [src]);

  const handleError = useCallback(() => {
    setHasError(true);
    if (fallbackSrc) {
      const safeFallback = getSafeImageSrc(fallbackSrc);
      if (safeFallback) {
        setImageSrc(safeFallback);
        setHasError(false);
      }
    }
  }, [fallbackSrc]);

  // Show placeholder if no valid image
  if (hasError || !imageSrc) {
    if (!showPlaceholder) return null;
    
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-700 ${className} ${placeholderClassName}`}
        style={{ width: props.width, height: props.height }}
      >
        {type === 'avatar' && <User className="w-1/2 h-1/2 text-gray-400" />}
        {type === 'document' && <File className="w-1/2 h-1/2 text-gray-400" />}
        {type === 'general' && <ImageIcon className="w-1/2 h-1/2 text-gray-400" />}
      </div>
    );
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      className={className}
      onError={handleError}
      {...props}
    />
  );
}

/**
 * SafeAvatar Component
 * Specialized for user avatars with circular styling
 */
interface SafeAvatarProps {
  src: string | null | undefined;
  alt?: string;
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackInitials?: string;
}

export function SafeAvatar({
  src,
  alt = 'Avatar',
  size = 'md',
  className = '',
  fallbackInitials,
}: SafeAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const safeSrc = getSafeImageSrc(src);

  // Size mapping
  const sizeMap = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  };
  
  const pixelSize = typeof size === 'number' ? size : sizeMap[size];
  const sizeClass = typeof size === 'number' ? '' : {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  }[size];

  // Show initials or icon if no valid image
  if (!safeSrc || hasError) {
    return (
      <div 
        className={`rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-medium ${sizeClass} ${className}`}
        style={typeof size === 'number' ? { width: pixelSize, height: pixelSize } : undefined}
      >
        {fallbackInitials ? (
          <span style={{ fontSize: pixelSize * 0.4 }}>
            {fallbackInitials.substring(0, 2).toUpperCase()}
          </span>
        ) : (
          <User style={{ width: pixelSize * 0.5, height: pixelSize * 0.5 }} />
        )}
      </div>
    );
  }

  return (
    <img
      src={safeSrc}
      alt={alt}
      className={`rounded-full object-cover ${sizeClass} ${className}`}
      style={typeof size === 'number' ? { width: pixelSize, height: pixelSize } : undefined}
      onError={() => setHasError(true)}
    />
  );
}

/**
 * SafeImageBackground Component
 * For background images with validation
 */
interface SafeImageBackgroundProps {
  src: string | null | undefined;
  children?: React.ReactNode;
  className?: string;
  fallbackClassName?: string;
}

export function SafeImageBackground({
  src,
  children,
  className = '',
  fallbackClassName = 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800',
}: SafeImageBackgroundProps) {
  const safeSrc = getSafeImageSrc(src);

  if (!safeSrc) {
    return (
      <div className={`${fallbackClassName} ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div 
      className={className}
      style={{ backgroundImage: `url(${safeSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {children}
    </div>
  );
}

export default SafeImage;
