import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Upload directories
export const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
export const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars');
export const DOCUMENT_DIR = path.join(UPLOAD_DIR, 'documents');

/**
 * Ensures upload directories exist
 */
export function ensureUploadDirs(): void {
  const dirs = [UPLOAD_DIR, AVATAR_DIR, DOCUMENT_DIR];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Generates a unique filename for an upload
 */
export function generateFilename(originalName: string, prefix: string = 'file'): string {
  const ext = path.extname(originalName).toLowerCase() || '.png';
  const timestamp = Date.now();
  const randomId = crypto.randomBytes(8).toString('hex');
  return `${prefix}_${timestamp}_${randomId}${ext}`;
}

/**
 * Saves a base64 image to disk and returns the URL path
 * Returns null if the image is invalid
 */
export async function saveBase64Image(
  base64Data: string,
  subDir: 'avatars' | 'documents' = 'avatars',
  prefix: string = 'img'
): Promise<string | null> {
  try {
    // Validate base64 format
    if (!base64Data || !base64Data.startsWith('data:image/')) {
      return null;
    }

    // Extract mime type and data
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return null;
    }

    const [, mimeType, data] = matches;
    const ext = mimeType === 'jpeg' ? 'jpg' : mimeType;
    
    // Ensure directories exist
    ensureUploadDirs();
    
    // Generate filename
    const filename = generateFilename(`file.${ext}`, prefix);
    const targetDir = subDir === 'avatars' ? AVATAR_DIR : DOCUMENT_DIR;
    const filePath = path.join(targetDir, filename);
    
    // Save file
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(filePath, buffer);
    
    // Return URL path
    return `/uploads/${subDir}/${filename}`;
  } catch (error) {
    console.error('Error saving base64 image:', error);
    return null;
  }
}

/**
 * Saves a File/Blob to disk and returns the URL path
 */
export async function saveFile(
  file: File,
  subDir: 'avatars' | 'documents' = 'documents',
  prefix: string = 'file'
): Promise<string | null> {
  try {
    // Ensure directories exist
    ensureUploadDirs();
    
    // Generate filename
    const filename = generateFilename(file.name, prefix);
    const targetDir = subDir === 'avatars' ? AVATAR_DIR : DOCUMENT_DIR;
    const filePath = path.join(targetDir, filename);
    
    // Convert to buffer and save
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);
    
    // Return URL path
    return `/uploads/${subDir}/${filename}`;
  } catch (error) {
    console.error('Error saving file:', error);
    return null;
  }
}

/**
 * Deletes an uploaded file by its URL path
 */
export function deleteUploadedFile(urlPath: string): boolean {
  try {
    if (!urlPath || !urlPath.startsWith('/uploads/')) {
      return false;
    }
    
    const filePath = path.join(process.cwd(), 'public', urlPath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * Converts an image URL or base64 to a consistent format
 * Prefers file URLs over base64 for better performance
 */
export function normalizeImageSource(
  src: string | null | undefined
): string | null {
  if (!src) return null;
  
  // Already a URL path
  if (src.startsWith('/') || src.startsWith('http')) {
    return src;
  }
  
  // Base64 - could optionally convert to file here
  if (src.startsWith('data:image/')) {
    return src;
  }
  
  return null;
}
