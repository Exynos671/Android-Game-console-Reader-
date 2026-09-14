import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { PageTurnAnimation } from '../types';

export type PageTurnAnimationKind = PageTurnAnimation;
export type PageMarginSize = 'compact' | 'balanced' | 'relaxed';

export interface TextPagedContentProps {
  /** 0-based index of the page that should currently be visible. */
  page: number;
  /** Complete HTML for the fragment (chapter heading + body + footer). */
  html: string;
  fontSize: number;
  lineHeight: number;
  fontFamilyClass: string;
  marginSize: PageMarginSize;
  animation: PageTurnAnimationKind;
  /** Duration of the slide / fade animation in ms. */
  speedMs?: number;
  /** Reports how many pages the current reflow produced. */
  onPageCountChange?: (count: number) => void;
}

const MARGINS: Record<PageMarginSize, { x: number; y: number }> = {
  compact: { x: 18, y: 16 },
  balanced: { x: 30, y: 22 },
  relaxed: { x: 44, y: 30 },
};

/**
 * True paginated reader for reflowable text.
 *
 * The chapter HTML is laid out with CSS multi-columns where every column has
 * exactly the width of one page; a single-page "viewport" (inset by the page
 * margins and strictly clipped) is placed over it, so neighbouring columns
 * can never peek out at the screen edges.
 */
export const TextPagedContent: React.FC<TextPagedContentProps> = ({
  page,
  html,
  fontSize,
  lineHeight,
  fontFamilyClass,
  marginSize,
  animation,
  speedMs = 500,
  onPageCountChange,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLSpanElement>(null);

  const [pageCount, setPageCount] = useState(1);
  const stepRef = useRef(0);
  const pageRef = useRef(page);
  const htmlRef = useRef(html);
  const measureRafRef = useRef<number | null>(null);

  const margins = MARGINS[marginSize];

  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  useEffect(() => {
    htmlRef.current = html;
  }, [html]);

  /** Returns true when a measurement completed successfully. */
  const measure = useCallback((): boolean => {
    const root = rootRef.current;
    const sheet = sheetRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sheet || !sentinel) return false;

    const rawW = root.clientWidth;
    const rawH = root.clientHeight;
    if (rawW < 40 || rawH < 40) return false;

    const contentW = Math.max(40, Math.floor(rawW - margins.x * 2));
    const contentH = Math.max(40, Math.floor(rawH - margins.y * 2));
    if (!contentW || !contentH) return false;

    const prevTransition = sheet.style.transition;
    sheet.style.transition = 'none';

    const WIDE = Math.max(contentW * 96, 6000);
    sheet.style.width = `${WIDE}px`;
    sheet.style.columnWidth = `${contentW}px`;
    sheet.style.height = `${contentH}px`;
    // Exposed so CSS can cap images to a single page height.
    sheet.style.setProperty('--hh-page-h', `${contentH}px`);

    const sheetRect = sheet.getBoundingClientRect();
    const sRect = sentinel.getBoundingClientRect();
    const x = sRect.left - sheetRect.left;
    const y = sRect.top - sheetRect.top;

    const colIndex = Math.max(0, Math.floor((x + 0.5) / contentW));
    const inColumn = y > 3;
    const used = colIndex + (inColumn ? 1 : 0);
    const count = Math.max(1, used);

    sheet.style.width = `${count * contentW}px`;

    const targetPage = Math.min(Math.max(0, pageRef.current), count - 1);
    sheet.style.transform = `translate3d(${-targetPage * contentW}px, 0, 0)`;

    requestAnimationFrame(() => {
      sheet.style.transition = prevTransition;
    });

    stepRef.current = contentW;
    measuredOnceRef.current = true;
    setPageCount((prev) => (prev !== count ? count : prev));
    return true;
  }, [html, fontSize, lineHeight, fontFamilyClass, margins.x, margins.y]);

  const runMeasurement = useCallback(() => {
    let attempts = 0;
    const tryOnce = () => {
      if (measure()) return;
      attempts += 1;
      if (attempts < 60) {
        measureRafRef.current = requestAnimationFrame(tryOnce);
      }
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        tryOnce();
      });
    });
  }, [measure]);

  useLayoutEffect(() => {
    runMeasurement();
    let cancelled = false;
    const remeasureLater = () => {
      if (cancelled) return;
      measure();
    };
    let fontsTimer: number | undefined;
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(remeasureLater).catch(() => {});
    }
    fontsTimer = window.setTimeout(remeasureLater, 400);
    return () => {
      cancelled = true;
      if (fontsTimer) window.clearTimeout(fontsTimer);
      if (measureRafRef.current) cancelAnimationFrame(measureRafRef.current);
    };
  }, [measure, runMeasurement]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (measureRafRef.current) cancelAnimationFrame(measureRafRef.current);
      measureRafRef.current = requestAnimationFrame(() => measure());
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (measureRafRef.current) cancelAnimationFrame(measureRafRef.current);
    };
  }, [measure]);

  const measuredOnceRef = useRef(false);
  useEffect(() => {
    if (!measuredOnceRef.current) return;
    onPageCountChange?.(pageCount);
  }, [pageCount, onPageCountChange]);

  // Drive the page-turn animation when `page` changes.
  const lastPageRef = useRef(page);
  const lastHtmlRef = useRef(html);

  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    const contentChanged = lastHtmlRef.current !== html;
    const pageChanged = lastPageRef.current !== page;

    if (!contentChanged && !pageChanged) return;

    if (contentChanged) {
      lastHtmlRef.current = html;
      if (animation !== 'instant' && typeof sheet.animate === 'function') {
        try {
          sheet.animate([{ opacity: 0.15 }, { opacity: 1 }], {
            duration: Math.max(120, Math.min(700, speedMs)),
            easing: 'ease-out',
          });
        } catch {
          /* older webview */
        }
      }
    }

    const step = stepRef.current;
    if (pageChanged && step > 0) {
      lastPageRef.current = page;
      const target = `translate3d(${-page * step}px, 0, 0)`;
      const duration = Math.max(120, Math.min(1200, speedMs));
      if (animation === 'slide') {
        sheet.style.transition = `transform ${duration}ms cubic-bezier(0.22, 0.75, 0.24, 1)`;
        sheet.style.transform = target;
      } else if (animation === 'fade') {
        sheet.style.transition = 'none';
        sheet.style.transform = target;
        if (typeof sheet.animate === 'function') {
          try {
            sheet.animate([{ opacity: 0 }, { opacity: 1 }], {
              duration: Math.max(120, Math.min(700, speedMs)),
              easing: 'ease-out',
            });
          } catch {
            /* older webview */
          }
        }
      } else {
        sheet.style.transition = 'none';
        sheet.style.transform = target;
      }
    }
  }, [page, html, animation, speedMs]);

  const sheetAnimationClass = animation === 'slide' ? 'sheet-anim-slide' : 'sheet-anim-instant';

  return (
    <div ref={rootRef} className="w-full h-full relative overflow-hidden">
      {/* Single-page viewport: inset by the page margins and strictly
          clipped, so adjacent columns can never show at the screen edges. */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: margins.x,
          top: margins.y,
          right: margins.x,
          bottom: margins.y,
        }}
      >
        <div
          ref={sheetRef}
          className={`hh-paged-sheet ${sheetAnimationClass} ${fontFamilyClass} w-full h-full select-text`}
          style={{
            fontSize: `${fontSize}px`,
            lineHeight,
          }}
        >
          <div dangerouslySetInnerHTML={{ __html: html }} />
          <span
            ref={sentinelRef}
            aria-hidden="true"
            style={{ display: 'inline-block', width: 1, height: 1 }}
          />
        </div>
      </div>
    </div>
  );
};
