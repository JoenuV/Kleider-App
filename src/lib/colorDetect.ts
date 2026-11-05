import { COLORS, COLOR_KEYS } from '../domain/constants';
import type { ColorKey } from '../domain/types';

// Runs fully on the device – the photo never leaves the browser.

type Lab = [number, number, number];

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function rgbToLab(r: number, g: number, b: number): Lab {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const PALETTE: { key: ColorKey; lab: Lab }[] = COLOR_KEYS.map((key) => {
  const [r, g, b] = hexToRgb(COLORS[key].hex);
  return { key, lab: rgbToLab(r, g, b) };
});

function dist(a: Lab, b: Lab): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

export function nearestColor(r: number, g: number, b: number): ColorKey {
  const lab = rgbToLab(r, g, b);
  let best = PALETTE[0]!;
  let bestD = Infinity;
  for (const p of PALETTE) {
    const d = dist(lab, p.lab);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best.key;
}

/**
 * Guesses the main colours of a garment from RGBA pixels.
 * The border of the image is treated as background and ignored.
 */
export function detectColors(data: Uint8ClampedArray, width: number, height: number, max = 2): ColorKey[] {
  const border = new Map<ColorKey, number>();
  const center = new Map<ColorKey, number>();
  const bw = Math.max(1, Math.round(width * 0.08));
  const bh = Math.max(1, Math.round(height * 0.08));
  let borderTotal = 0;
  let centerTotal = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if ((data[i + 3] ?? 255) < 128) continue;
      const key = nearestColor(data[i]!, data[i + 1]!, data[i + 2]!);
      const isBorder = x < bw || y < bh || x >= width - bw || y >= height - bh;
      const inCenter = x > width * 0.2 && x < width * 0.8 && y > height * 0.15 && y < height * 0.85;
      if (isBorder) {
        border.set(key, (border.get(key) ?? 0) + 1);
        borderTotal++;
      } else if (inCenter) {
        center.set(key, (center.get(key) ?? 0) + 1);
        centerTotal++;
      }
    }
  }
  if (!centerTotal) return [];
  const scored = [...center.entries()]
    .map(([key, n]) => {
      const share = n / centerTotal;
      const bgShare = borderTotal ? (border.get(key) ?? 0) / borderTotal : 0;
      // Colours that dominate the border are probably the background.
      return { key, score: share * (bgShare > 0.4 ? 0.25 : 1) };
    })
    .sort((a, b) => b.score - a.score);
  const result: ColorKey[] = [];
  for (const s of scored) {
    if (result.length >= max) break;
    if (result.length === 0 || s.score > 0.18) result.push(s.key);
  }
  return result;
}
