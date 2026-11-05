import type { ReactNode } from 'react';
import { CATEGORY_LABEL } from '../domain/constants';
import type { Category, Garment } from '../domain/types';
import { GarmentImage } from './GarmentImage';
import './collage.css';

const LEFT: readonly Category[] = ['headwear', 'jacket', 'midlayer', 'top'];
const RIGHT: readonly Category[] = ['pants', 'shoes', 'accessory'];

const FLEX: Record<Category, number> = {
  headwear: 0.65,
  jacket: 1.25,
  midlayer: 1,
  top: 1.05,
  pants: 1.7,
  shoes: 0.85,
  accessory: 0.6,
};

export interface CollageProps {
  items: Partial<Record<Category, Garment | undefined>>;
  size?: 'lg' | 'sm';
  /** Extra controls rendered on top of each tile (lock/swap). */
  overlay?: (category: Category, garment: Garment) => ReactNode;
  onTileClick?: (category: Category, garment: Garment) => void;
  highlight?: (category: Category) => boolean;
}

/** Outfit as a calm flat-lay board: upper body left, legs & feet right. */
export function Collage({ items, size = 'lg', overlay, onTileClick, highlight }: CollageProps) {
  const left = LEFT.filter((c) => items[c]);
  const right = RIGHT.filter((c) => items[c]);
  const col = (cats: Category[]) => (
    <div className="collage-col">
      {cats.map((c) => {
        const g = items[c]!;
        const Tag = onTileClick ? 'button' : 'div';
        return (
          <Tag
            key={c}
            className={`collage-tile${highlight?.(c) ? ' hl' : ''}`}
            style={{ flexGrow: FLEX[c] }}
            {...(onTileClick ? { type: 'button' as const, onClick: () => onTileClick(c, g), 'aria-label': CATEGORY_LABEL[c] } : {})}
          >
            <GarmentImage garment={g} />
            {overlay?.(c, g)}
          </Tag>
        );
      })}
    </div>
  );
  return (
    <div className={`collage ${size}`}>
      {col(left)}
      {col(right)}
    </div>
  );
}
