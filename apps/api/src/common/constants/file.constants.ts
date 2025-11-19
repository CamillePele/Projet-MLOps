/**
 * File-related constants
 */

export const SUPPORTED_IMAGE_EXTENSIONS = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.webp',
    '.tiff',
] as const;

export const SUPPORTED_ARCHIVE_EXTENSIONS = [
    '.zip',
    '.tar',
    '.gz',
    '.rar',
] as const;

export const IMAGE_MIME_TYPES: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp',
    '.tiff': 'image/tiff',
};

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const UPLOAD_PATHS = {
    BASE: 'uploads',
    IMAGES: 'uploads/images',
    TEMP: 'uploads/temp',
} as const;
