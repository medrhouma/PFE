/**
 * Image Utilities
 * Safe handling of images including base64 validation
 */

// Valid image MIME types
const VALID_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp'
]

// Maximum reasonable size for base64 images (5MB decoded)
const MAX_BASE64_SIZE = 5 * 1024 * 1024

/**
 * Check if a string is a valid base64 encoded image
 */
export function isValidBase64Image(str: string | null | undefined): boolean {
  if (!str || typeof str !== 'string') return false
  
  // Check for data URL format
  const dataUrlMatch = str.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
  if (!dataUrlMatch) return false
  
  const [, mimeType, base64Data] = dataUrlMatch
  
  // Validate MIME type
  if (!VALID_IMAGE_TYPES.includes(mimeType)) return false
  
  // Basic base64 validation
  try {
    // Check if the base64 string is valid
    const isValidBase64 = /^[A-Za-z0-9+/]+=*$/.test(base64Data)
    if (!isValidBase64) return false
    
    // Check approximate size (base64 is ~33% larger than decoded)
    const approximateSize = (base64Data.length * 3) / 4
    if (approximateSize > MAX_BASE64_SIZE) return false
    
    return true
  } catch {
    return false
  }
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(str: string | null | undefined): boolean {
  if (!str || typeof str !== 'string') return false
  
  try {
    const url = new URL(str)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    // Could be a relative path
    return str.startsWith('/') && !str.includes('..')
  }
}

/**
 * Get a safe image source with fallback
 */
export function getSafeImageSrc(
  src: string | null | undefined,
  fallback: string = '/icons/default-avatar.png'
): string {
  if (!src) return fallback
  
  // Check if it's a valid URL
  if (isValidUrl(src)) return src
  
  // Check if it's a valid base64 image
  if (isValidBase64Image(src)) return src
  
  // If it starts with 'data:' but isn't valid, return fallback
  if (src.startsWith('data:')) return fallback
  
  // Assume it's a relative path
  if (src.startsWith('/')) return src
  
  return fallback
}

/**
 * Extract MIME type from base64 data URL
 */
export function getMimeType(base64: string): string | null {
  const match = base64.match(/^data:(image\/[a-zA-Z+]+);base64,/)
  return match ? match[1] : null
}

/**
 * Convert base64 to Blob
 */
export function base64ToBlob(base64: string): Blob | null {
  try {
    const match = base64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
    if (!match) return null
    
    const [, mimeType, data] = match
    const byteCharacters = atob(data)
    const byteNumbers = new Array(byteCharacters.length)
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  } catch {
    return null
  }
}

/**
 * Resize and compress image
 */
export async function compressImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        
        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }
        
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert to base64
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(dataUrl)
      }
      
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Avatar component props helper
 */
export interface AvatarProps {
  src: string | null | undefined
  alt: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fallbackInitials?: string
}

export function getAvatarClasses(size: AvatarProps['size'] = 'md'): string {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  }
  
  return `${sizeClasses[size]} rounded-full object-cover`
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}
