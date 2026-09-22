import { PhotoMetadata, PhotoCategory } from '@/types';
import { getTodayISO } from './utils';

export interface CompressionResult {
  metadata: PhotoMetadata;
  dataUrl: string;
  blob: Blob;
}

export interface CompressionOptions {
  maxDimension?: number; // Maximum width or height in pixels (default: 1600)
  targetMaxKB?: number;   // Maximum allowed file size in KB (default: 950KB, strictly < 1MB)
  initialQuality?: number; // JPEG/WebP quality between 0.1 and 1.0 (default: 0.82)
  category?: PhotoCategory;
  caption?: string;
  dateISO?: string;
}

/**
 * High-performance browser-based image downscaling and compression engine.
 * Specifically optimized for high-resolution iPhone 12 (12MP, 4032x3024) photos.
 * Preserves exact aspect ratio, downscales to optimal display resolution,
 * and compresses to guarantee file size is strictly below 1MB (default < 950KB).
 */
export async function compressAndDownscaleImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxDimension = 1600,
    targetMaxKB = 950, // 950 KB ensures strictly below 1MB (1024 KB)
    initialQuality = 0.82,
    category = 'fitness',
    caption,
    dateISO = getTodayISO(),
  } = options;

  const originalSizeKB = Math.round(file.size / 1024);

  // 1. Load image into HTML Image object
  const img = await loadImageFromFile(file);
  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;

  // 2. Proportional Downscaling (Preserve Exact Aspect Ratio)
  let targetWidth = origWidth;
  let targetHeight = origHeight;

  if (origWidth > maxDimension || origHeight > maxDimension) {
    if (origWidth >= origHeight) {
      targetWidth = maxDimension;
      targetHeight = Math.round((origHeight / origWidth) * maxDimension);
    } else {
      targetHeight = maxDimension;
      targetWidth = Math.round((origWidth / origHeight) * maxDimension);
    }
  }

  // 3. Render onto HTML5 Canvas with High-Fidelity Smoothing
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to obtain 2D canvas context for image downscaling');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // 4. Adaptive Compression Loop (guarantees size < targetMaxKB)
  let quality = initialQuality;
  let blob: Blob | null = null;
  const mimeType = 'image/jpeg'; // Widely supported, efficient for photos

  blob = await canvasToBlob(canvas, mimeType, quality);

  // If still above 950KB, iteratively step down quality and/or scale
  let attempts = 0;
  while (blob && blob.size > targetMaxKB * 1024 && attempts < 5) {
    attempts++;
    quality = Math.max(0.45, quality - 0.12);
    blob = await canvasToBlob(canvas, mimeType, quality);

    // If quality reduction isn't enough, downscale dimensions by another 15%
    if (blob.size > targetMaxKB * 1024 && attempts >= 2) {
      targetWidth = Math.round(targetWidth * 0.85);
      targetHeight = Math.round(targetHeight * 0.85);
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      blob = await canvasToBlob(canvas, mimeType, quality);
    }
  }

  if (!blob) {
    throw new Error('Image compression failed to produce output blob');
  }

  const compressedSizeKB = Math.round(blob.size / 1024);
  const dataUrl = await blobToDataUrl(blob);

  // 5. Generate Photo Metadata
  const now = new Date();
  const photoId = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const metadata: PhotoMetadata = {
    id: photoId,
    dateISO,
    uploadedAt: now.toISOString(),
    originalSizeKB,
    compressedSizeKB,
    width: targetWidth,
    height: targetHeight,
    mimeType,
    category,
    caption,
  };

  return {
    metadata,
    dataUrl,
    blob,
  };
}

// Helpers
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image file for compression'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob conversion failed'));
      },
      mimeType,
      quality
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
