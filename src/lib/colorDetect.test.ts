import { describe, expect, it } from 'vitest';
import { detectColors, nearestColor } from './colorDetect';

function image(w: number, h: number, bg: [number, number, number], fg: [number, number, number]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const inside = x > w * 0.25 && x < w * 0.75 && y > h * 0.2 && y < h * 0.8;
      const c = inside ? fg : bg;
      const i = (y * w + x) * 4;
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = 255;
    }
  return data;
}

describe('colour detection', () => {
  it('maps pixels to the nearest palette colour', () => {
    expect(nearestColor(250, 250, 250)).toBe('weiss');
    expect(nearestColor(10, 10, 10)).toBe('schwarz');
    expect(nearestColor(200, 40, 40)).toBe('rot');
  });

  it('ignores the background and finds the garment colour', () => {
    const data = image(40, 50, [245, 245, 242], [30, 45, 80]);
    expect(detectColors(data, 40, 50)[0]).toBe('navy');
  });
});
