import React, { useEffect, useRef, useState } from 'react';
import { Download, X, ZoomIn, ZoomOut } from 'lucide-react';
import { ImageViewMode } from '../types';
import { useI18n } from '../i18n';

/**
 * Helpers to detect "image pages" inside reflowable books — chapters that are
 * essentially a single illustration (manga-style EPUBs put one image per
 * spine item) plus an optional short caption.
 */
export function extractImagePage(content: string): { src?: string; textChars: number } {
  if (!content) return { textChars: 0 };
  const m = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  const textOnly = content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { src: m ? m[1] : undefined, textChars: textOnly.length };
}

function fetchAsDataUrl(url: string): Promise<string | null> {
  return fetch(url)
    .then((r) => r.blob())
    .then(
      (b) =>
        new Promise<string | null>((resolve) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result as string);
          fr.onerror = () => resolve(null);
          fr.readAsDataURL(b);
        })
    )
    .catch(() => null);
}

function downloadDataUrl(dataUrl: string, name: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ------------------------------------------------------------------ */
/*  In-reading image page: fit-centred, or fullscreen with pan          */
/* ------------------------------------------------------------------ */
interface ImageViewPageProps {
  src: string;
  alt?: string;
  mode: ImageViewMode;
  onOpenPreview: (src: string) => void;
}

export const ImageViewPage: React.FC<ImageViewPageProps> = ({ src, alt, mode, onOpenPreview }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const dragRefImg = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const handleOpen = (ev: React.MouseEvent) => {
    const d = dragRefImg.current;
    if (d && d.moved) return;
    ev.stopPropagation();
    onOpenPreview(src);
  };

  const pd = (e: React.PointerEvent) => {
    dragRefImg.current = { x: e.clientX, y: e.clientY, moved: false };
  };
  const pm = (e: React.PointerEvent) => {
    const d = dragRefImg.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 8) d.moved = true;
  };
  const pu = () => {
    window.setTimeout(() => {
      dragRefImg.current = null;
    }, 120);
  };

  // Fullscreen mode: vertical panning with the LEFT analog stick.
  useEffect(() => {
    if (mode !== 'full') return;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const pan = panRef.current;
      if (!pan) return;
      try {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const gp of pads) {
          if (!gp) continue;
          let dy = 0;
          // Left analog stick vertical.
          const val = gp.axes[1] ?? 0;
          if (Math.abs(val) > 0.28) dy += val * 26;
          // D-pad up / down buttons.
          const up = gp.buttons[12]?.pressed || (gp.buttons[12]?.value ?? 0) > 0.5;
          const down = gp.buttons[13]?.pressed || (gp.buttons[13]?.value ?? 0) > 0.5;
          if (up) dy -= 16;
          if (down) dy += 16;
          if (dy !== 0) pan.scrollTop += dy;
          break;
        }
      } catch {
        /* ignore */
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  if (mode === 'full') {
    return (
      <div
        ref={rootRef}
        className="w-full h-full flex items-start justify-center bg-transparent select-none"
        onClick={handleOpen}
      >
        <div
          ref={panRef}
          className="w-full h-full overflow-hidden no-scrollbar"
          onPointerDown={pd}
          onPointerMove={pm}
          onPointerUp={pu}
          onPointerLeave={pu}
        >
          <img
            src={src}
            alt={alt || 'book image'}
            draggable={false}
            className="w-full h-auto select-none"
            style={{ display: ready ? 'block' : 'none' }}
            onLoad={() => setReady(true)}
          />
          {!ready && <div className="w-full h-full animate-pulse bg-black/10" />}
        </div>
      </div>
    );
  }

  // fit: centred, scaled to fit — never bigger than the screen
  return (
    <div
      className="w-full h-full flex items-center justify-center bg-transparent select-none"
      onClick={handleOpen}
    >
      <img
        src={src}
        alt={alt || 'book image'}
        draggable={false}
        className="max-w-full max-h-full object-contain rounded shadow-lg select-none"
        style={{ display: ready ? 'block' : 'none' }}
        onLoad={() => setReady(true)}
      />
      {!ready && <div className="w-24 h-8 animate-pulse bg-black/10 rounded-lg" />}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Original-image preview overlay: zoom / pan / save                   */
/* ------------------------------------------------------------------ */
interface ImagePreviewModalProps {
  src: string;
  name?: string;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ src, name, onClose }) => {
  const { t } = useI18n();
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; sx: number; sy: number } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [src]);

  const clamp = (s: number) => Math.max(1, Math.min(6, s));

  const handleSave = async () => {
    setSaved(false);
    const dataUrl = await fetchAsDataUrl(src);
    if (!dataUrl) return;
    const base = (name || 'image').replace(/\.[a-z0-9]+$/i, '');
    downloadDataUrl(dataUrl, `${base}.png`);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, sx: offset.x, sy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setOffset({
      x: d.sx + (e.clientX - d.x),
      y: d.sy + (e.clientY - d.y),
    });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/95 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-6 py-3 safe-px text-neutral-200 text-xs border-b border-neutral-800/70 gap-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((s) => clamp(s * 0.8))}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center gap-1"
            title="−"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono text-neutral-400 w-12 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => clamp(s * 1.25))}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center gap-1"
            title="+"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSave();
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold"
        >
          <Download className="w-4 h-4" />
          {saved ? t('reader.imageSaved') : t('reader.saveImage')}
        </button>
        <button onClick={onClose} className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700" aria-label={t('common.close')}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div
        ref={stageRef}
        className="flex-1 overflow-hidden relative touch-none"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onDoubleClick={() => setScale((s) => (s > 1 ? 1 : 2))}
      >
        <div
          className="absolute left-1/2 top-1/2"
          style={{ transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})` }}
        >
          <img src={src} alt={name || 'preview'} draggable={false} className="select-none max-w-none" />
        </div>
      </div>

      <div className="text-center text-[10px] text-neutral-500 pb-3 px-4" onClick={(e) => e.stopPropagation()}>
        {t('reader.previewHint')}
      </div>
    </div>
  );
};
