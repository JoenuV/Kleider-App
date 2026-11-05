import type { Sliders } from '../../domain/types';

export const SLIDER_DEFS: { key: keyof Sliders; left: string; right: string; label: string }[] = [
  { key: 'experimental', left: 'Schlicht', right: 'Experimentell', label: 'Schlicht bis experimentell' },
  { key: 'look', left: 'Praktisch', right: 'Look', label: 'Praktisch bis Look' },
  { key: 'dressy', left: 'Bequem', right: 'Schick', label: 'Bequem bis schick' },
  { key: 'colorBold', left: 'Farblich ruhig', right: 'Farblich mutig', label: 'Farblich ruhig bis mutig' },
];
