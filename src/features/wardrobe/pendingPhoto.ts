import type { ProcessedImage } from '../../lib/image';

// Hands a freshly processed photo from the "add" sheet to the editor route.
let pending: ProcessedImage | null = null;

export function setPendingPhoto(p: ProcessedImage | null) {
  pending = p;
}

export function takePendingPhoto(): ProcessedImage | null {
  const p = pending;
  pending = null;
  return p;
}
