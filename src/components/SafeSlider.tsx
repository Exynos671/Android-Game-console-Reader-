import React, { useRef, useState } from 'react';

interface SafeSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
}

/**
 * Touch-friendly slider with accidental-touch protection.
 *
 * The native `<input type="range">` jumps to wherever you tap, which made it
 * far too easy to nudge a value while merely scrolling the settings panel.
 * Here the thumb must either be grabbed directly, or the track must be pressed
 * and held briefly (or dragged deliberately) before it starts changing. A
 * vertical scroll gesture over the slider is ignored entirely.
 */
export const SafeSlider: React.FC<SafeSliderProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  className = '',
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);
  const timerRef = useRef<number | null>(null);

  const pct = Math.max(0, Math.min(1, (value - min) / Math.max(1e-6, max - min)));

  const clearPending = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
  };

  const applyFromX = (clientX: number) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    let next = min + frac * (max - min);
    if (step > 0) next = Math.round(next / step) * step;
    next = Math.max(min, Math.min(max, next));
    const rounded = Math.round(next * 1000) / 1000;
    if (rounded !== value) onChange(rounded);
  };

  const startDragging = (clientX: number) => {
    draggingRef.current = true;
    setDragging(true);
    applyFromX(clientX);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = rootRef.current?.getBoundingClientRect();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pendingRef.current = { x: e.clientX, y: e.clientY };

    // Starting on (or very near) the thumb grabs it immediately.
    if (rect) {
      const thumbX = rect.left + pct * rect.width;
      if (Math.abs(e.clientX - thumbX) <= 30) {
        clearPending();
        startDragging(e.clientX);
        return;
      }
    }
    // Otherwise wait a beat: a hold / deliberate drag starts, a scroll cancels.
    clearPending();
    pendingRef.current = { x: e.clientX, y: e.clientY };
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      const p = pendingRef.current;
      if (p) startDragging(p.x);
    }, 220);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) {
      applyFromX(e.clientX);
      return;
    }
    const p = pendingRef.current;
    if (!p) return;
    const moved = Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y);
    if (moved > 12) {
      // Looks like a scroll gesture — refuse to change the value.
      clearPending();
    }
  };

  const end = () => {
    clearPending();
    draggingRef.current = false;
    setDragging(false);
  };

  return (
    <div
      ref={rootRef}
      className={`relative w-full h-9 flex items-center select-none ${className}`}
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="relative w-full h-2.5 rounded-full bg-neutral-700/80 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-amber-400 transition-[width] duration-75"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <div
        className={`absolute top-1/2 h-6 w-6 rounded-full bg-white shadow-lg border-2 transition-transform ${
          dragging ? 'border-amber-400 scale-110' : 'border-neutral-300'
        }`}
        style={{ left: `calc(${pct * 100}% - 12px)`, transform: 'translateY(-50%)' }}
      />
    </div>
  );
};
