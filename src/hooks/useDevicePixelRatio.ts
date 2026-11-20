import { useEffect, useState } from 'react';

/**
 * Tracks `window.devicePixelRatio`, including changes caused by browser
 * zoom or moving the window to a display with a different density.
 *
 * The pixel-font themes need this because a dot-matrix face only looks
 * "point to point" when one design pixel lands on a whole number of
 * *device* pixels.
 */
export function useDevicePixelRatio(): number {
  const [dpr, setDpr] = useState<number>(() =>
    typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let media: MediaQueryList | null = null;

    const read = () => {
      const next = window.devicePixelRatio || 1;
      setDpr((prev) => (prev === next ? prev : next));
    };

    const onResolutionChange = () => {
      read();
      watch();
    };

    const watch = () => {
      media?.removeEventListener('change', onResolutionChange);
      media = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      media.addEventListener('change', onResolutionChange);
    };

    watch();
    window.addEventListener('resize', read);
    return () => {
      media?.removeEventListener('change', onResolutionChange);
      window.removeEventListener('resize', read);
    };
  }, []);

  return dpr;
}
