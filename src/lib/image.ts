import type { ColorKey } from '../domain/types';
import { detectColors } from './colorDetect';

export const PHOTO_MAX = 1280;
export const THUMB_MAX = 480;

export interface ProcessedImage {
  photo: Blob;
  thumb: Blob;
  colors: ColorKey[];
}

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fall back to <img> (e.g. HEIC on some browsers fails here) */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error('Dieses Bildformat kann nicht gelesen werden. Versuche ein JPEG oder PNG.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function sizeOf(src: ImageBitmap | HTMLImageElement) {
  return 'naturalWidth' in src ? { w: src.naturalWidth, h: src.naturalHeight } : { w: src.width, h: src.height };
}

function supportsWebp(): boolean {
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  return c.toDataURL('image/webp').startsWith('data:image/webp');
}

let webp: boolean | null = null;

function render(src: ImageBitmap | HTMLImageElement, max: number) {
  const { w, h } = sizeOf(src);
  const scale = Math.min(1, max / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas wird nicht unterstützt.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, cw, ch);
  return { canvas, ctx };
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  if (webp === null) webp = supportsWebp();
  const type = webp ? 'image/webp' : 'image/jpeg';
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Bild konnte nicht komprimiert werden.'))), type, quality),
  );
}

/** Resizes and compresses a photo and guesses its colours – all locally. */
export async function processImage(file: Blob): Promise<ProcessedImage> {
  const src = await loadBitmap(file);
  const big = render(src, PHOTO_MAX);
  const small = render(src, THUMB_MAX);
  const sample = render(src, 64);
  const px = sample.ctx.getImageData(0, 0, sample.canvas.width, sample.canvas.height);
  const colors = detectColors(px.data, px.width, px.height);
  if ('close' in src) src.close();
  const [photo, thumb] = await Promise.all([toBlob(big.canvas, 0.82), toBlob(small.canvas, 0.78)]);
  return { photo, thumb, colors };
}
