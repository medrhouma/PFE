"use client"

import { useState } from 'react'
import { getSafeImageSrc, getInitials, getAvatarClasses } from '@/lib/image-utils'

interface AvatarProps {
  src?: string | null
  alt: string
  name?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({ src, alt, name, size = 'md', className = '' }: AvatarProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  const safeSrc = getSafeImageSrc(src)
  const showFallback = hasError || !safeSrc || safeSrc.includes('default-avatar')
  const initials = getInitials(name || alt)
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  }
  
  const baseClasses = `${sizeClasses[size]} rounded-full flex-shrink-0 ${className}`
  
  if (showFallback) {
    return (
      <div 
        className={`${baseClasses} bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-medium`}
        title={alt}
      >
        {initials}
      </div>
    )
  }
  
  return (
    <div className={`${baseClasses} relative overflow-hidden bg-gray-200 dark:bg-gray-700`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      )}
      <img
        src={safeSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true)
          setIsLoading(false)
        }}
      />
    </div>
  )
}

export default Avatar
