import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Default placeholder images
export const DEFAULT_AVATAR = '/icons/default-avatar.svg'
export const DEFAULT_DOCUMENT = '/icons/default-document.svg'
export const DEFAULT_IMAGE = '/icons/default-image.svg'

/**
 * Validates and returns a safe image source
 * Returns null if the image source is invalid or malformed
 */
export function getSafeImageSrc(src: string | null | undefined): string | null {
  if (!src || typeof src !== 'string') return null
  
  // Trim whitespace
  const trimmedSrc = src.trim()
  if (!trimmedSrc) return null
  
  // If it's a URL (http/https), validate and return
  if (trimmedSrc.startsWith('http://') || trimmedSrc.startsWith('https://')) {
    try {
      // Validate URL structure
      new URL(trimmedSrc)
      return trimmedSrc
    } catch {
      // Invalid URL
      return null
    }
  }
  
  // If it's a base64 data URL, validate it thoroughly
  if (trimmedSrc.startsWith('data:image/')) {
    // Check if it has the correct structure
    const commaIndex = trimmedSrc.indexOf(',')
    if (commaIndex === -1) return null
    
    const header = trimmedSrc.substring(0, commaIndex)
    const base64Part = trimmedSrc.substring(commaIndex + 1)
    
    // Validate header format - must contain 'base64'
    if (!header.toLowerCase().includes('base64')) return null
    
    // Check if base64 part exists and has minimum length for a valid image
    // A 1x1 pixel PNG is about 70 characters, so 50 is a safe minimum
    if (!base64Part || base64Part.length < 50) {
      return null
    }
    
    // Check for truncated base64 (common issue when DB column is too small)
    // Valid base64 length should be divisible by 4 (with padding)
    const cleanBase64 = base64Part.replace(/\s/g, '')
    
    // Basic base64 character validation
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
    if (!base64Regex.test(cleanBase64)) {
      return null
    }
    
    // Check if the base64 appears truncated (not properly padded)
    if (cleanBase64.length % 4 !== 0 && !cleanBase64.endsWith('=')) {
      // Likely truncated - invalid
      return null
    }
    
    return trimmedSrc
  }
  
  // If it's a relative path starting with /, return as-is
  if (trimmedSrc.startsWith('/')) {
    // Basic path validation
    if (trimmedSrc.includes('..') || trimmedSrc.includes('//')) {
      return null
    }
    return trimmedSrc
  }
  
  // Unknown format - return null
  return null
}

/**
 * Gets a safe image source with fallback
 * Always returns a valid image URL (never null)
 */
export function getSafeImageWithFallback(
  src: string | null | undefined, 
  fallback: string = DEFAULT_AVATAR
): string {
  const safeSrc = getSafeImageSrc(src)
  return safeSrc || fallback
}

/**
 * Checks if an image source is valid
 */
export function isValidImageSrc(src: string | null | undefined): boolean {
  return getSafeImageSrc(src) !== null
}

/**
 * Sanitizes image data from API responses
 * Converts null, undefined, empty strings, and invalid data to null
 */
export function sanitizeImageFromAPI(image: any): string | null {
  // Handle null, undefined, empty string
  if (!image || image === '' || image === 'null' || image === 'undefined') {
    return null
  }
  
  // If it's a Buffer or ArrayBuffer (shouldn't happen but just in case)
  if (image instanceof Buffer || image instanceof ArrayBuffer) {
    return null
  }
  
  // If it's an object (like Prisma Bytes), try to convert
  if (typeof image === 'object' && image !== null) {
    // Check if it's a Buffer-like object
    if (image.type === 'Buffer' && Array.isArray(image.data)) {
      try {
        const base64 = Buffer.from(image.data).toString('base64')
        return `data:image/png;base64,${base64}`
      } catch {
        return null
      }
    }
    return null
  }
  
  // Must be a string at this point
  if (typeof image !== 'string') {
    return null
  }
  
  // Validate the string
  return getSafeImageSrc(image)
}