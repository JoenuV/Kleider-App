import { useEffect, useState } from 'react';

// Object URLs are cached per Blob so grids don't recreate them on every render.
const cache = new WeakMap<Blob, { url: string; refs: number }>();

function acquire(blob: Blob): string {
  const hit = cache.get(blob);
  if (hit) {
    hit.refs++;
    return hit.url;
  }
  const url = URL.createObjectURL(blob);
  cache.set(blob, { url, refs: 1 });
  return url;
}

function release(blob: Blob) {
  const hit = cache.get(blob);
  if (!hit) return;
  hit.refs--;
  if (hit.refs <= 0) {
    // Delay so that a quick re-mount (e.g. list re-order) can reuse it.
    setTimeout(() => {
      const again = cache.get(blob);
      if (again && again.refs <= 0) {
        URL.revokeObjectURL(again.url);
        cache.delete(blob);
      }
    }, 3000);
  }
}

export function useObjectUrl(blob: Blob | null | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(() => (blob ? cache.get(blob)?.url : undefined));
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    setUrl(acquire(blob));
    return () => release(blob);
  }, [blob]);
  return url;
}
