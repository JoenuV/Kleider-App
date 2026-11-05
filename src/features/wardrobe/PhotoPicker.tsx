import { Camera, Images, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useFeedback } from '../../components/feedback';
import { processImage, type ProcessedImage } from '../../lib/image';

/** Two big buttons: take a photo or pick one from the gallery. */
export function PhotoPicker({ onPicked }: { onPicked: (img: ProcessedImage) => void }) {
  const { toast } = useFeedback();
  const [busy, setBusy] = useState(false);

  const handle = async (file: File | undefined, input: HTMLInputElement) => {
    if (!file) return;
    setBusy(true);
    try {
      onPicked(await processImage(file));
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
      input.value = '';
    }
  };

  if (busy) {
    return (
      <div className="photo-picker busy">
        <Loader2 className="spin" size={28} />
        <span>Foto wird optimiert …</span>
      </div>
    );
  }

  return (
    <div className="photo-picker">
      <label className="pick-btn primary">
        <Camera size={28} strokeWidth={1.7} />
        <span>Kamera</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => handle(e.target.files?.[0], e.target)}
        />
      </label>
      <label className="pick-btn">
        <Images size={28} strokeWidth={1.7} />
        <span>Galerie</span>
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => handle(e.target.files?.[0], e.target)} />
      </label>
    </div>
  );
}
