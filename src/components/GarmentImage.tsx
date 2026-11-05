import { Shirt } from 'lucide-react';
import type { Garment } from '../domain/types';
import { useObjectUrl } from '../hooks/useObjectUrl';
import { garmentTitle } from '../lib/wardrobeFilter';

export function GarmentImage({
  garment,
  full,
  className,
}: {
  garment: Garment | undefined;
  full?: boolean;
  className?: string;
}) {
  const url = useObjectUrl(garment ? (full ? garment.photo : garment.thumb) : undefined);
  if (!garment || !url) {
    return (
      <div className={`img-ph ${className ?? ''}`} aria-hidden="true">
        <Shirt size={28} strokeWidth={1.4} />
      </div>
    );
  }
  return <img src={url} alt={garmentTitle(garment)} className={className} loading="lazy" decoding="async" draggable={false} />;
}
