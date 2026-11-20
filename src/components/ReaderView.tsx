import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Book, ReaderSettings, ControllerProfile, PageTurnAnimation } from '../types';
import {
  Maximize,
  Minimize,
  Sliders,
  List,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Gamepad2,
  Home,
  Battery,
  BatteryCharging,
  Clock,
} from 'lucide-react';
import { StealthHUD } from './StealthHUD';
import { GamepadButtonBadge } from './GamepadButtonBadge';
import { TextPagedContent, PageMarginSize } from './TextPagedContent';
import { ImageViewPage, ImagePreviewModal, extractImagePage } from './ImageViewPage';
import { normalizeChapterToHtml, escapeHtml } from '../utils/content';
import { useSystemStatus } from '../hooks/useSystemStatus';
import { useDevicePixelRatio } from '../hooks/useDevicePixelRatio';
import {
  snapPixelFontSize,
  snapPixelLineHeight,
  isPixelCrisp,
  canSharpenPixelText,
  canEmbossPixelText,
  canCanvasEmboss,
  lcdCellSize,
  lcdInkAlpha,
} from '../utils/pixelFont';
import { useI18n } from '../i18n';

export interface ReaderViewHandle {
  nextPage: () => void;
  prevPage: () => void;
  /** Smoothly scroll the reading canvas (continuous / webtoon modes). */
  scrollBy: (deltaY: number) => void;
  /** Toggle the reading chrome (top bar / bottom controls). Returns new state. */
  toggleMenu: () => boolean;
  /** True while the reading chrome/menu is open. */
  isMenuOpen: () => boolean;
  /** Close the reading chrome. */
  closeMenu: () => void;
}

export interface BackHint {
  text: string;
  id: number;
}

interface ReaderViewProps {
  book: Book;
  settings: ReaderSettings;
  profile: ControllerProfile;
  onUpdateBook: (updated: Partial<Book>) => void;
  onOpenSettings: () => void;
  onOpenToc: () => void;
  onOpenControllerModal: () => void;
  onToggleDistractionFree: () => void;
  onBackToLibrary: () => void;
  /** Non-blocking hint (e.g. "press B again to exit"), keyed by id. */
  backHint?: BackHint | null;
  scrollDeltaY?: number;
}

const MARGIN_CLASS: Record<PageMarginSize, string> = {
  compact: 'px-4 py-4 max-w-2xl',
  balanced: 'px-8 py-6 max-w-3xl',
  relaxed: 'px-12 py-8 max-w-4xl',
};

/** Rough default characters-per-screen-page before real measurements land. */
const DEFAULT_CPL = 620;

export const ReaderView = forwardRef<ReaderViewHandle, ReaderViewProps>(
  (
    {
      book,
      settings,
      profile,
      onUpdateBook,
      onOpenSettings,
      onOpenToc,
      onOpenControllerModal,
      onToggleDistractionFree,
      onBackToLibrary,
      backHint,
      scrollDeltaY = 0,
    },
    ref
  ) => {
    const { t, tf } = useI18n();
    const contentContainerRef = useRef<HTMLDivElement>(null);

    // Dot-matrix typography depends on the physical pixel density: the
    // reading size is snapped so one font pixel = whole device pixels.
    const dpr = useDevicePixelRatio();
    // A dot-matrix face is only used when it is picked explicitly in the
    // font-style picker. The GBA/GBP themes restyle the page (palette + LCD
    // mesh) but never override the reader's font choice.
    const isPixelFont =
      settings.fontFamily === 'pixel1' || settings.fontFamily === 'pixel2';

    // Reading chrome (top bar + bottom controls). Clean by default 鈥?page
    // turns never pop menus open; only Start / screen tap toggles it.
    const [hudVisible, setHudVisible] = useState(false);
    const hudVisibleRef = useRef(hudVisible);
    useEffect(() => {
      hudVisibleRef.current = hudVisible;
    }, [hudVisible]);

    // Original-image preview overlay (tap an image to open it).
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);

    // Comic zoom state
    const [comicZoom, setComicZoom] = useState(1);

    const isComic = book.format === 'cbz';
    const totalItems = isComic
      ? book.comicPages?.length || 1
      : book.chapters?.length || 1;

    const isPagedText = !isComic && settings.readingMode !== 'continuous';
    // Canvas dot-matrix mode: the DOM still lays the text out (line breaks,
    // justification, columns, page count), but every glyph is repainted from
    // a 1-bit atlas on each face's native grid with phase-locked row bands.
    // That removes the fractional-scale stroke-weight wobble without
    // changing pagination.
    // Continuous scroll has no page canvases, so it keeps the snapped DOM
    // renderer instead of showing an unsnapped pixel face.
    const pixelCanvas = isPixelFont && isPagedText && settings.pixelCanvas !== false;
    const isWebtoon = isComic && settings.readingMode === 'webtoon';
    const isSinglePageComic = isComic && !isWebtoon;

    /* ------------------------------------------------------------------ */
    /*  True page-by-page state for reflowable text                        */
    /* ------------------------------------------------------------------ */
    const [subPage, setSubPage] = useState<number>(() =>
      Math.max(0, book.readerPage ?? 0)
    );
    const [textPageCount, setTextPageCount] = useState(1);
    const initialDesired = (() => {
      const v = Math.max(0, book.readerPage ?? 0);
      return v > 0 ? v : null;
    })();
    const desiredPageRef = useRef<number | null>(initialDesired);

    const chapterKey = `${book.id}:${book.currentChapterIndex}`;
    const [activeChapterKey, setActiveChapterKey] = useState(chapterKey);
    if (chapterKey !== activeChapterKey) {
      setActiveChapterKey(chapterKey);
      const target = Math.max(0, book.readerPage ?? 0);
      setSubPage(target);
      desiredPageRef.current = target > 0 ? target : null;
      // The page count still belongs to the chapter we just left. Keep it at
      // one page until the new column layout reports its real count, so a
      // fast next-page press can never advance into phantom pages.
      setTextPageCount(1);
    }

    const pageCountCacheRef = useRef<Record<number, number>>({});
    const [measureRequest, setMeasureRequest] = useState<{
      chapter: number;
      width: number;
      height: number;
      nonce: number;
    } | null>(null);
    const [hiddenCount, setHiddenCount] = useState(0);
    const pendingNavKindRef = useRef<'prev-end' | null>(null);
    const lastTurnDirRef = useRef<1 | -1>(1);

    /* ------------------------------------------------------------------ */
    /*  Chrome / menu behaviour                                            */
    /* ------------------------------------------------------------------ */
    const chromeFirstRunRef = useRef(true);
    useEffect(() => {
      if (chromeFirstRunRef.current) {
        chromeFirstRunRef.current = false;
        return;
      }
      setHudVisible(!settings.distractionFree);
    }, [settings.distractionFree]);

    const [localHint, setLocalHint] = useState<BackHint | null>(null);
    useEffect(() => {
      if (settings.distractionFree) return;
      const t1 = window.setTimeout(() => {
        setLocalHint({ text: t('reader.hiddenMenuHint'), id: Date.now() });
      }, 900);
      const t2 = window.setTimeout(() => setLocalHint(null), 4600);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleMenu = useCallback(() => {
      setHudVisible((prev) => !prev);
      return !hudVisibleRef.current;
    }, []);

    const closeMenu = useCallback(() => {
      setHudVisible(false);
    }, []);

    const isMenuOpen = useCallback(() => hudVisibleRef.current, []);

    // Continuous smooth scroll from analog thumbsticks (never pops the menu).
    useEffect(() => {
      if (scrollDeltaY !== 0 && contentContainerRef.current) {
        contentContainerRef.current.scrollBy({
          top: scrollDeltaY,
          behavior: 'auto',
        });
      }
    }, [scrollDeltaY]);

    // Reset scroll when the chapter changes (continuous layout).
    useEffect(() => {
      if (contentContainerRef.current) {
        contentContainerRef.current.scrollTop = 0;
      }
    }, [book.id, book.currentChapterIndex, isPagedText]);

    /* ------------------------------------------------------------------ */
    /*  Paged text: measured page count reporting                          */
    /* ------------------------------------------------------------------ */
    const chapters = book.chapters || [];
    const currentChapter = chapters[book.currentChapterIndex];
    const prevChapter = chapters[Math.max(0, book.currentChapterIndex - 1)];

    // Whole-book page counts (per chapter), 0 = not measured yet.
    const [chapterPages, setChapterPages] = useState<number[]>(() => {
      const arr = new Array<number>(Math.max(1, chapters.length)).fill(0);
      const cached = book.measuredChapterPages;
      if (cached) {
        for (let i = 0; i < arr.length && i < cached.length; i++) {
          if (cached[i] > 0) arr[i] = cached[i];
        }
      }
      return arr;
    });

    const persistChapterPages = useCallback(
      (next: number[]) => {
        onUpdateBook({ measuredChapterPages: next });
      },
      [onUpdateBook]
    );

    const recordChapterPageCount = useCallback(
      (idx: number, count: number) => {
        if (count <= 0 || isComic || idx >= (book.chapters?.length || 1)) return;
        setChapterPages((prev) => {
          if (prev[idx] === count) return prev;
          const next = [...prev];
          next[idx] = count;
          persistChapterPages(next);
          return next;
        });
        pageCountCacheRef.current[idx] = count;
      },
      [isComic, book.chapters, persistChapterPages]
    );

    const handlePageCountChange = useCallback(
      (count: number) => {
        setTextPageCount(count);
        recordChapterPageCount(book.currentChapterIndex, count);
      },
      [book.currentChapterIndex, recordChapterPageCount]
    );

    useEffect(() => {
      if (!isPagedText || textPageCount <= 0) return;
      const desired = desiredPageRef.current;
      if (subPage <= textPageCount - 1) {
        if (desired !== null && textPageCount > desired) {
          desiredPageRef.current = null;
        }
        return;
      }
      if (desired !== null) {
        if (textPageCount <= desired) {
          const tmr = window.setTimeout(() => {
            desiredPageRef.current = null;
            setSubPage((p) => Math.min(p, Math.max(0, textPageCount - 1)));
          }, 1200);
          return () => window.clearTimeout(tmr);
        }
        desiredPageRef.current = null;
      }
      setSubPage(textPageCount - 1);
    }, [textPageCount, subPage, isPagedText]);

    // Persist the exact page inside the chapter so reopening resumes there.
    useEffect(() => {
      if (!isPagedText || isComic) return;
      onUpdateBook({ readerPage: subPage });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subPage, book.id, book.currentChapterIndex, isPagedText, onUpdateBook]);

    /* ------------------------------------------------------------------ */
    /*  Whole-book page counting (measure every chapter in the background) */
    /* ------------------------------------------------------------------ */
    const wholeBookMode = isPagedText && settings.progressMode === 'book';
    const [bookProbe, setBookProbe] = useState<{
      chapter: number;
      nonce: number;
      width: number;
      height: number;
    } | null>(null);
    const pendingProbeRef = useRef<number[]>([]);
    const chapterPagesRef = useRef(chapterPages);
    useEffect(() => {
      chapterPagesRef.current = chapterPages;
    }, [chapterPages]);
    // Characters-per-page estimate is frozen after the first real chapter
    // measurement so whole-book numbers never rescale mid-reading.
    const cplLockRef = useRef<number | null>(null);

    const probeNext = useCallback(() => {
      const canvas = contentContainerRef.current;
      const pending = pendingProbeRef.current;
      if (pending.length === 0) {
        setBookProbe(null);
        return;
      }
      const idx = pending.shift() as number;
      const box = contentBoxOf(canvas);
      setBookProbe({
        chapter: idx,
        nonce: Date.now() + idx,
        width: box.width,
        height: box.height,
      });
    }, []);

    const kickBookMeasure = useCallback(() => {
      if (!wholeBookMode || isComic || !chapters.length) return;
      const missing: number[] = [];
      chapterPagesRef.current.forEach((m, i) => {
        if (!(m > 0)) missing.push(i);
      });
      // Local page index: chapters are measured once and cached. To keep
      // opening a book instant we only pre-measure a handful at a time; the
      // rest are measured lazily as the user reads and stay cached forever.
      pendingProbeRef.current = missing.slice(0, 8);
      probeNext();
    }, [wholeBookMode, isComic, chapters.length, probeNext]);

    // Start a measurement pass shortly after the reader opens or when the
    // progress mode switches to "whole book".
    useEffect(() => {
      if (!wholeBookMode) return;
      const timer = window.setTimeout(() => kickBookMeasure(), 320);
      return () => window.clearTimeout(timer);
    }, [book.id, wholeBookMode, kickBookMeasure]);

    // Invalidate cached whole-book counts when typography changes the reflow.
    useEffect(() => {
      if (!wholeBookMode || isComic) return;
      const timer = window.setTimeout(() => {
        const zeros = new Array<number>(Math.max(1, chapters.length)).fill(0);
        chapterPagesRef.current = zeros;
        cplLockRef.current = null;
        setChapterPages(zeros);
        onUpdateBook({ measuredChapterPages: [] });
        // Re-run the background measurement with the new typography.
        kickBookMeasure();
      }, 260);
      return () => window.clearTimeout(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      settings.fontSize,
      settings.lineHeight,
      settings.marginSize,
      settings.fontFamily,
      dpr,
      isPixelFont,
    ]);

    const onBookProbeCount = useCallback(
      (chapter: number, count: number) => {
        if (bookProbe && bookProbe.chapter === chapter) {
          recordChapterPageCount(chapter, count);
          probeNext();
        }
      },
      [bookProbe, recordChapterPageCount, probeNext]
    );

    const bookProbeChapter = bookProbe ? chapters[bookProbe.chapter] : undefined;

    // Estimated whole-book page numbers (blend measured + estimated).
    const bookPageStats = useMemo(() => {
      if (isComic || !chapters.length) return null;
      let measuredChars = 0;
      let measuredPages = 0;
      const len = Math.max(1, chapters.length);
      const est: number[] = new Array(len).fill(0);
      for (let i = 0; i < len; i++) {
        const m = chapterPages[i];
        if (m > 0) {
          est[i] = m;
          measuredPages += m;
          measuredChars += chapters[i]?.content?.length || 0;
        }
      }
      // Freeze the chars-per-page ratio after the first real measurement so
      // the estimated totals do not rescale later (fixes mid-read jumps).
      let cpl = cplLockRef.current;
      if (cpl === null || cpl <= 0) {
        if (measuredPages > 0 && measuredChars > 0) {
          cpl = measuredChars / measuredPages;
        } else {
          // Sensible default before anything is measured: CJK text packs
          // far more characters per screen page than Latin.
          const sample = chapters.slice(0, 4).map((c) => c?.content || '').join('');
          const hasCjk = /[\u3400-\u9fff]/.test(sample);
          cpl = hasCjk ? 240 : 850;
        }
        cpl = Math.max(80, Math.min(2400, cpl));
        cplLockRef.current = cpl;
      }
      let total = 0;
      for (let i = 0; i < len; i++) {
        if (est[i] <= 0) {
          const chars = chapters[i]?.content?.length || 0;
          est[i] = Math.max(1, Math.round(chars / cpl));
        }
        total += est[i];
      }
      return { est, total };
    }, [isComic, chapters, chapterPages]);

    const wholeBookCurrent = useMemo(() => {
      if (!bookPageStats || !wholeBookMode) return null;
      // Only switch to whole-book numbers after a real page measurement,
      // otherwise rough defaults could show absurd page counts.
      if (!chapterPages.some((p) => p > 0)) return null;
      const currentCh = book.currentChapterIndex;
      const curPages =
        chapterPages[currentCh] > 0 ? chapterPages[currentCh] : Math.max(1, textPageCount);
      let prefix = 0;
      for (let i = 0; i < currentCh && i < bookPageStats.est.length; i++) {
        prefix += bookPageStats.est[i];
      }
      return Math.min(prefix + curPages, bookPageStats.total) > 0
        ? Math.max(1, Math.min(prefix + subPage + 1, bookPageStats.total))
        : null;
    }, [bookPageStats, wholeBookMode, book.currentChapterIndex, chapterPages, textPageCount, subPage]);

    /* ------------------------------------------------------------------ */
    /*  Chapter HTML (heading + normalized body + end-of-chapter footer)   */
    /* ------------------------------------------------------------------ */
    const isBookmarked = isComic
      ? book.bookmarks.includes(book.currentPage)
      : book.bookmarks.includes(book.currentChapterIndex);

    const buildTextHtml = useCallback(
      (chapter: NonNullable<Book['chapters']>[number], chapterIndex: number) => {
        const numbered = chapterIndex + 1;
        const isCur = chapterIndex === book.currentChapterIndex;
        const head = `<div class="mb-4 pb-3 border-b border-neutral-500/40">
          <div class="flex items-center justify-between text-[10px] uppercase tracking-wider opacity-60 font-mono mb-1.5">
            <span>${escapeHtml(tf('reader.sectionOf', { current: numbered, total: totalItems }))}</span>
            ${
              isCur && isBookmarked
                ? `<span class="text-amber-500 font-bold normal-case">${escapeHtml(t('reader.bookmarked'))}</span>`
                : ''
            }
          </div>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight">${escapeHtml(
            chapter.title || ''
          )}</h1>
        </div>`;
        const body = normalizeChapterToHtml(chapter.content || '');
        const nextChapterExists = !isComic && chapterIndex < totalItems - 1;
        const foot = `<div class="mt-6 pt-3 border-t border-neutral-500/40 flex items-center justify-between text-[11px] opacity-70">
          <span>${escapeHtml(book.title)}</span>
          <span>${
            nextChapterExists
              ? escapeHtml(t('reader.nextSection'))
              : escapeHtml(t('reader.endOfBook'))
          }</span>
        </div>`;
        return head + body + foot;
      },
      [book.currentChapterIndex, book.title, isBookmarked, isComic, totalItems, t, tf]
    );

    const pagedHtml = useMemo(() => {
      if (isComic || !currentChapter) return '';
      return buildTextHtml(currentChapter, book.currentChapterIndex);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [buildTextHtml, currentChapter, isBookmarked]);

    const continuousBodyHtml = useMemo(() => {
      if (isComic || !currentChapter) return '';
      return normalizeChapterToHtml(currentChapter.content || '');
    }, [currentChapter, isComic]);

    const hiddenHtml = useMemo(() => {
      if (measureRequest === null || !prevChapter) return '';
      return buildTextHtml(prevChapter, measureRequest.chapter);
    }, [measureRequest, prevChapter, buildTextHtml]);

    const probeHtml = useMemo(() => {
      if (!bookProbe || !bookProbeChapter) return '';
      return buildTextHtml(bookProbeChapter, bookProbe.chapter);
    }, [bookProbe, bookProbeChapter, buildTextHtml]);

    useEffect(() => {
      if (!measureRequest) return;
      if (hiddenCount > 0 && pendingNavKindRef.current === 'prev-end') {
        const count = hiddenCount;
        const targetChapter = measureRequest.chapter;
        pendingNavKindRef.current = null;
        setMeasureRequest(null);
        setHiddenCount(0);
        onUpdateBook({
          currentChapterIndex: targetChapter,
          currentPage: targetChapter + 1,
          readerPage: Math.max(0, count - 1),
        });
      }
    }, [measureRequest, hiddenCount, onUpdateBook]);

    /* ------------------------------------------------------------------ */
    /*  Page-turn actions (never pop the menu)                             */
    /* ------------------------------------------------------------------ */
    const goToNextPage = useCallback(() => {
      if (isComic) {
        if (isWebtoon) {
          const el = contentContainerRef.current;
          if (el && el.scrollTop + el.clientHeight < el.scrollHeight - 4) {
            el.scrollBy({
              top: Math.max(40, el.clientHeight * 0.92),
              behavior: 'smooth',
            });
          }
          return;
        }
        lastTurnDirRef.current = 1;
        const max = book.comicPages?.length || 1;
        if (book.currentPage < max) {
          onUpdateBook({ currentPage: book.currentPage + 1 });
        }
        return;
      }

      if (!isPagedText) {
        const nextChapter = book.currentChapterIndex + 1;
        if (nextChapter < (book.chapters?.length || 1)) {
          onUpdateBook({
            currentChapterIndex: nextChapter,
            currentPage: nextChapter + 1,
            readerPage: 0,
          });
        }
        return;
      }

      const count = Math.max(1, textPageCount);
      if (subPage < count - 1) {
        setSubPage(subPage + 1);
        return;
      }
      const nextChapter = book.currentChapterIndex + 1;
      if (nextChapter < (book.chapters?.length || 1)) {
        pendingNavKindRef.current = null;
        setMeasureRequest(null);
        onUpdateBook({
          currentChapterIndex: nextChapter,
          currentPage: nextChapter + 1,
          readerPage: 0,
        });
      }
    }, [
      isComic,
      isWebtoon,
      isPagedText,
      book.currentPage,
      book.currentChapterIndex,
      book.comicPages,
      book.chapters,
      textPageCount,
      subPage,
      onUpdateBook,
    ]);

    const goToPrevPage = useCallback(() => {
      if (isComic) {
        if (isWebtoon) {
          const el = contentContainerRef.current;
          if (el && el.scrollTop > 4) {
            el.scrollBy({
              top: -Math.max(40, el.clientHeight * 0.92),
              behavior: 'smooth',
            });
          }
          return;
        }
        lastTurnDirRef.current = -1;
        if (book.currentPage > 1) {
          onUpdateBook({ currentPage: book.currentPage - 1 });
        }
        return;
      }

      if (!isPagedText) {
        const prevChapterIdx = book.currentChapterIndex - 1;
        if (prevChapterIdx >= 0) {
          onUpdateBook({
            currentChapterIndex: prevChapterIdx,
            currentPage: prevChapterIdx + 1,
            readerPage: 0,
          });
        }
        return;
      }

      if (subPage > 0) {
        setSubPage(subPage - 1);
        return;
      }
      const prevIdx = book.currentChapterIndex - 1;
      if (prevIdx < 0) return;
      const cached = pageCountCacheRef.current[prevIdx];
      if (cached !== undefined && cached > 0) {
        onUpdateBook({
          currentChapterIndex: prevIdx,
          currentPage: prevIdx + 1,
          readerPage: cached - 1,
        });
        return;
      }
      const canvas = contentContainerRef.current;
      if (canvas) {
        const box = contentBoxOf(canvas);
        pendingNavKindRef.current = 'prev-end';
        setHiddenCount(0);
        setMeasureRequest({
          chapter: prevIdx,
          width: box.width,
          height: box.height,
          nonce: Date.now(),
        });
      }
    }, [
      isComic,
      isWebtoon,
      isPagedText,
      book.currentPage,
      book.currentChapterIndex,
      subPage,
      onUpdateBook,
    ]);

    const scrollBy = useCallback((deltaY: number) => {
      const el = contentContainerRef.current;
      if (!el) return;
      el.scrollBy({ top: deltaY, behavior: 'smooth' });
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        nextPage: () => goToNextPage(),
        prevPage: () => goToPrevPage(),
        scrollBy,
        toggleMenu,
        isMenuOpen,
        closeMenu,
      }),
      [goToNextPage, goToPrevPage, scrollBy, toggleMenu, isMenuOpen, closeMenu]
    );

    const handleToggleBookmark = () => {
      const target = isComic ? book.currentPage : book.currentChapterIndex;
      const exists = book.bookmarks.includes(target);
      const updated = exists
        ? book.bookmarks.filter((b) => b !== target)
        : [...book.bookmarks, target];
      onUpdateBook({ bookmarks: updated });
    };

    /* ------------------------------------------------------------------ */
    /*  Theme / font / margin styling                                      */
    /* ------------------------------------------------------------------ */
    const themeClass = useMemo(() => {
      switch (settings.theme) {
        case 'oled':
          return 'bg-black text-neutral-200';
        case 'dark':
          return 'bg-[#121316] text-neutral-200';
        case 'sepia':
          return 'bg-[#f7eedf] text-[#342618]';
        case 'paper':
          return 'bg-[#fcfbf9] text-[#1c1917]';
        case 'retro':
          return 'bg-[#142314] text-[#88c070] font-mono';
        case 'gba':
          // Classic lit GBA LCD: washed green screen + dark ink.
          return 'bg-[#9bbc0f] text-[#0f380f] hh-lcd-ghost-gba';
        case 'gbp':
          // Game Boy Pocket: reflective grey LCD with charcoal ink.
          return 'bg-[#b8bcb0] text-[#2b2f28] hh-lcd-ghost-gbp';
        default:
          return 'bg-black text-neutral-200';
      }
    }, [settings.theme]);

    // The CJK pixel face is outlined on a fixed 13-px design grid (the Latin
    // faces use 8px, so no single size is perfect for both). Without the
    // canvas layer an arbitrary font size (e.g. 18px at DPR 1, i.e. 1.386
    // device pixels per design pixel) splits every 1px stroke across two
    // raster rows with a different coverage split per stroke — that is what
    // reads as uneven stroke weight, so the size is snapped to the grid.
    // Canvas mode keeps the requested size: the overlay locks every band to
    // the same subpixel phase, so 18px is safe and the slider stays honest.
    const readingFontSize = useMemo(() => {
      if (!isPixelFont) return settings.fontSize;
      return pixelCanvas
        ? settings.fontSize
        : snapPixelFontSize(settings.fontSize, dpr);
    }, [isPixelFont, pixelCanvas, settings.fontSize, dpr]);
    const pixelCrisp = useMemo(
      () => !pixelCanvas && isPixelFont && canSharpenPixelText(dpr) && isPixelCrisp(readingFontSize, dpr),
      [pixelCanvas, isPixelFont, readingFontSize, dpr]
    );
    // The LCD emboss is a *separate* switch: even on a sharp panel a very
    // small font maps a design pixel onto only two device pixels, where the
    // one-device-pixel ghost lands halfway through the neighbouring cell and
    // thickens every stroke. It needs >= 300 ppi *and* >= 3 device pixels per
    // design pixel; otherwise only the dot-matrix background is kept.
    // The canvas paints hard 1-bit edges, so it never needs either modifier.
    const pixelEmboss = useMemo(
      () => !pixelCanvas && isPixelFont && canEmbossPixelText(readingFontSize, dpr),
      [pixelCanvas, isPixelFont, readingFontSize, dpr]
    );
    // Canvas mode can keep the LCD ghost on dense panels: the bands are
    // phase-locked, so the one-device-pixel offset no longer depends on the
    // font landing on a whole device-pixel grid.
    const pixelCanvasEmboss = useMemo(
      () => pixelCanvas && canCanvasEmboss(readingFontSize, dpr),
      [pixelCanvas, readingFontSize, dpr]
    );

    const fontClass = useMemo(() => {
      // The font-style picker is the single source of truth: themes never
      // swap the typeface, they only change colours / the LCD background.
      let base = 'font-serif';
      switch (settings.fontFamily) {
        case 'serif':
          base = 'font-serif';
          break;
        case 'sans':
          base = 'font-sans';
          break;
        case 'mono':
          base = 'font-mono';
          break;
        case 'display':
          base = 'font-display';
          break;
        case 'pixel1':
          base = 'font-pixel1';
          break;
        case 'pixel2':
          base = 'font-pixel2';
          break;
      }
      if (pixelCanvas) {
        // Keep the exact same family stack as the DOM renderer. The overlay
        // resolves each glyph with that stack's fallback order and rasterizes
        // it on its own face's native grid (Press Start / Silkscreen at 8px,
        // HanYi at 13px), so Latin keeps the selected pixel font while CJK
        // still falls back to HanYi.
        return `${base} hh-pixel-text`;
      }
      // `hh-pixel-text` turns off kerning / ligatures and keeps the glyphs
      // on the device pixel grid. `hh-pixel-snapped` additionally disables
      // antialiasing, but only on >= 300 ppi panels where the font scale is
      // a whole number of device pixels; elsewhere fractional strokes would
      // snap to alternately thin / thick 1–2px lines. `hh-pixel-embossed`
      // adds the LCD ghost only when a design pixel is dense enough (see
      // above).
      const modifiers = [
        pixelCrisp ? 'hh-pixel-snapped' : '',
        pixelEmboss ? 'hh-pixel-embossed' : '',
      ]
        .filter(Boolean)
        .join(' ');
      return isPixelFont
        ? `${base} hh-pixel-text${modifiers ? ` ${modifiers}` : ''}`
        : base;
    }, [settings.fontFamily, isPixelFont, pixelCanvas, pixelCrisp, pixelEmboss]);

    const readingLineHeight = useMemo(() => {
      if (!isPixelFont) return settings.lineHeight;
      // Store the snapped value back as a unitless multiplier so the CSS
      // `line-height` resolves to a whole number of device pixels.
      const px = snapPixelLineHeight(readingFontSize, settings.lineHeight, dpr);
      return px / readingFontSize;
    }, [isPixelFont, readingFontSize, settings.lineHeight, dpr]);
    // Chapter headings are set in rem by the generated HTML; give the LCD
    // themes a grid-aligned size instead so titles stay crisp too.
    const pixelHeadingSize = useMemo(() => {
      if (!isPixelFont) return 0;
      const target = Math.max(readingFontSize, settings.fontSize * 1.35);
      // Canvas mode can keep the proportional size; the overlay re-rasterizes
      // the title from the same atlas at whatever scale the heading needs.
      if (pixelCanvas) return target;
      return Math.max(readingFontSize, snapPixelFontSize(target, dpr));
    }, [isPixelFont, pixelCanvas, readingFontSize, settings.fontSize, dpr]);

    const marginClass = MARGIN_CLASS[settings.marginSize] || MARGIN_CLASS.balanced;

    const currentComicPage = book.comicPages?.[book.currentPage - 1];

    // Chapters whose body is essentially one illustration (manga-style EPUB)
    // are shown through the image viewer instead of the text paginator.
    // A chapter that is essentially one illustration (manga-style EPUB plate
    // page) is shown through the image viewer in every reading mode.
    const singleImageSrc = useMemo(() => {
      if (isComic || !currentChapter) return null;
      const probe = extractImagePage(currentChapter.content || '');
      return probe.src && probe.textChars < 200 ? probe.src : null;
    }, [isComic, currentChapter]);

    const shownImageSrc = isComic
      ? currentComicPage?.imageUrl || null
      : singleImageSrc;

    // Progress / counters used by the chrome & bottom status strip.
    const displayPage = isComic
      ? book.currentPage
      : isPagedText
        ? subPage + 1
        : book.currentChapterIndex + 1;
    const displayTotal = isComic
      ? totalItems
      : isPagedText
        ? Math.max(1, textPageCount)
        : totalItems;
    const progressPercent = isComic
      ? Math.round((book.currentPage / totalItems) * 100)
      : isPagedText
        ? Math.round(
            ((book.currentChapterIndex +
              Math.min(0.999, (subPage + 1) / Math.max(1, textPageCount))) /
              Math.max(1, totalItems)) *
              100
          )
        : Math.round(((book.currentChapterIndex + 1) / totalItems) * 100);

    const progressLabel = (() => {
      if (isComic) {
        return tf('reader.pageCurrentOfTotal', { page: displayPage, total: displayTotal });
      }
      if (!isPagedText) {
        return tf('reader.sectionCurrentOfTotal', { page: displayPage, total: displayTotal });
      }
      if (wholeBookMode && wholeBookCurrent !== null && bookPageStats) {
        return tf('reader.bookPageOf', {
          page: wholeBookCurrent,
          total: Math.max(1, bookPageStats.total),
        });
      }
      return tf('reader.pageCurrentOfTotal', { page: displayPage, total: displayTotal });
    })();

    /* ------------------------------------------------------------------ */
    /*  Canvas tap zones + swipe page turns (center toggles the menu)      */
    /* ------------------------------------------------------------------ */
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      if (shownImageSrc) {
        // On an image page a single tap previews the original (item #2);
        // page turns stay on the shoulder buttons / D-pad.
        if (previewSrc) return;
        setPreviewSrc(shownImageSrc);
        return;
      }
      if (clickX < width * 0.22) {
        goToPrevPage();
      } else if (clickX > width * 0.78) {
        goToNextPage();
      } else {
        // Center tap toggles the menu (Start behaves the same way).
        toggleMenu();
      }
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
      const t = e.touches[0];
      if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 1.25) return;
      if (dx < 0) {
        goToNextPage();
      } else {
        goToPrevPage();
      }
      e.preventDefault();
    };

    /* ------------------------------------------------------------------ */
    /*  Comic page-turn animation wrapper classes                          */
    /* ------------------------------------------------------------------ */
    const comicAnimClass = () => {
      if (settings.pageTurnAnimation === 'instant') return '';
      if (settings.pageTurnAnimation === 'fade') return 'hh-anim-fade';
      return lastTurnDirRef.current < 0
        ? 'hh-anim-slide-prev'
        : 'hh-anim-slide-next';
    };

    // The persistent, slim bottom status strip (progress / battery / time).
    const showStatusStrip =
      !settings.distractionFree &&
      settings.showHudTimeAndBattery &&
      !hudVisible;

    const stripFontPx =
      settings.bottomBarFontSize === 'xs'
        ? 13
        : settings.bottomBarFontSize === 'md'
          ? 18
          : 15;

    // Status strip text colour follows the page theme so it blends in.
    const stripColor =
      settings.theme === 'sepia'
        ? '#5b4636'
        : settings.theme === 'paper'
          ? '#44403c'
          : settings.theme === 'gba'
            ? '#0f380f'
            : settings.theme === 'gbp'
              ? '#2b2f28'
              : settings.theme === 'retro'
                ? '#88c070'
                : '#d4d4d8';

    // Minimum edge margin so content never hugs the physical screen border,
    // even on handhelds that report no safe-area insets.
    const edgeTop = 'max(env(safe-area-inset-top, 0px), 0.75rem)';
    const edgeBottom = 'max(env(safe-area-inset-bottom, 0px), 0.75rem)';

    const isPagedCanvas = isPagedText || isSinglePageComic;

    // Bottom reserve for the persistent status strip. Deliberately ignores
    // `hudVisible`: the canvas height must stay identical while the menu opens
    // and closes, otherwise the multi-column paginator recomputes and the
    // reader visibly reflows on every tap. The menu bars simply overlay the
    // page while they are open.
    const stripReservePx =
      !settings.distractionFree && settings.showHudTimeAndBattery
        ? stripFontPx + 40
        : 0;

    const canvasPadStyle: React.CSSProperties = isPagedCanvas
      ? {
          paddingTop: `calc(2.25rem + ${edgeTop})`,
          paddingBottom: `calc(${
            stripReservePx > 0 ? `${stripReservePx}px` : '1.5rem'
          } + ${edgeBottom})`,
        }
      : {
          paddingTop: edgeTop,
          paddingBottom: `calc(${stripReservePx}px + ${edgeBottom})`,
        };

    // Grid-aligned heading size for the dot-matrix themes (consumed by the
    // `.hh-pixel-text h1…h4` rules in index.css). `--hh-lcd-px` is one
    // physical device pixel, used for the LCD pixel shadow offset, and
    // `--hh-lcd-cell` is one font design pixel, used as the LCD cell pitch.
    const lcdStyle = {
      '--hh-lcd-px': `${1 / (dpr || 1)}px`,
      '--hh-lcd-cell': `${lcdCellSize(isPixelFont ? readingFontSize : 0, dpr)}px`,
      '--hh-lcd-ink-alpha': lcdInkAlpha(dpr).toFixed(3),
    } as React.CSSProperties;
    const canvasStyle = {
      ...canvasPadStyle,
      ...lcdStyle,
      ...(pixelHeadingSize ? { '--hh-pixel-heading': `${pixelHeadingSize}px` } : {}),
    } as React.CSSProperties;

    const animationKind = settings.pageTurnAnimation as PageTurnAnimation;

    // The visible hint chip combines App-level hints (double-press B to
    // leave) with the local discoverability hint.
    const activeHint = backHint || localHint;

    const isGba = settings.theme === 'gba';
    const isGbp = settings.theme === 'gbp';

    /* ================================================================== */
    /*  Render 鈥?full-bleed single page (no aspect-ratio letterboxing)     */
    /* ================================================================== */
    return (
      <div
        data-hh-sub={subPage}
        data-hh-count={textPageCount}
        data-hh-ch={book.currentChapterIndex}
        data-hh-paged={isPagedText ? 1 : 0}
        data-hh-rp={book.readerPage ?? -1}
        className="relative w-full h-full overflow-hidden bg-black select-none"
        style={lcdStyle}
      >
        {/* Full-screen display surface */}
        <div className="relative w-full h-full overflow-hidden">
          {/* Night Warmth & Brightness Filter Overlays */}
          <div
            className="absolute inset-0 pointer-events-none z-30 transition-opacity"
            style={{
              backgroundColor: '#f59e0b',
              opacity: settings.warmth / 100,
              mixBlendMode: 'multiply',
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none z-30 transition-opacity"
            style={{
              backgroundColor: '#000000',
              opacity: (100 - settings.brightness) / 100,
            }}
          />

          {/* GBA big-pixel LCD grain (theme) */}
          {isGba && <div className="hh-gba-pixels" />}

          {/* Game Boy Pocket fine grey dot-matrix grain (theme) */}
          {isGbp && <div className="hh-gbp-pixels" />}

          {/* Non-blocking hint (never covers the text area) */}
          {activeHint && (
            <div
              key={activeHint.id}
              className="absolute left-1/2 -translate-x-1/2 z-[55] pointer-events-none hh-hint-chip"
              style={{
                top: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
              }}
            >
              <div
                className="px-4 py-2 rounded-full text-sm font-semibold shadow-xl whitespace-nowrap border"
                style={{
                  backgroundColor: 'rgba(9, 9, 11, 0.96)',
                  color: '#fde68a',
                  borderColor: 'rgba(245, 158, 11, 0.6)',
                }}
              >
                {activeHint.text}
              </div>
            </div>
          )}

          {/* Top Reading Navigation Bar (menu) */}
          <div
            className={`absolute top-0 inset-x-0 z-40 transition-all duration-200 ${
              hudVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-full pointer-events-none'
            }`}
          >
            <div
              className="flex items-center justify-between px-6 sm:px-10 bg-neutral-950/90 backdrop-blur border-b border-neutral-800 text-neutral-100 text-xs safe-px"
              style={{
                paddingTop: `calc(0.75rem + ${edgeTop})`,
                paddingBottom: '0.75rem',
              }}
            >
              <div className="flex items-center gap-2 truncate">
                <button
                  onClick={onBackToLibrary}
                  className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center gap-1"
                  title={t('reader.libraryButtonTitle')}
                >
                  <Home className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('common.library')}</span>
                </button>

                <span className="font-bold truncate max-w-[140px] sm:max-w-xs">
                  {book.title}
                </span>
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase"
                  title={t('reader.formatBadgeTitle')}
                >
                  {book.format}
                </span>
              </div>

              {/* Center Gamepad hint pills */}
              <div className="hidden md:flex items-center gap-2 font-mono text-[11px] text-neutral-400">
                <span className="flex items-center gap-1">
                  <GamepadButtonBadge inputId={profile.bindings.prevPage} size="sm" />
                  <span>{t('common.prev')}</span>
                </span>
                <span className="flex items-center gap-1">
                  <GamepadButtonBadge inputId={profile.bindings.nextPage} size="sm" />
                  <span>{t('common.next')}</span>
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onOpenToc}
                  className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white"
                  title={t('reader.tocButtonTitle')}
                >
                  <List className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleToggleBookmark}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    isBookmarked
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                      : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white'
                  }`}
                  title={t('reader.bookmarkButtonTitle')}
                >
                  <Bookmark
                    className="w-3.5 h-3.5"
                    fill={isBookmarked ? 'currentColor' : 'none'}
                  />
                </button>

                <button
                  onClick={onOpenControllerModal}
                  className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  title={t('reader.controllerButtonTitle')}
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline font-mono text-[11px]">
                    {t('reader.binds')}
                  </span>
                </button>

                <button
                  onClick={onOpenSettings}
                  className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white"
                  title={t('reader.settingsButtonTitle')}
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={onToggleDistractionFree}
                  className="p-1.5 rounded-lg bg-amber-500 text-neutral-950 font-bold hover:bg-amber-400 flex items-center gap-1"
                  title={t('ctrl.action_toggleDistractionFree')}
                >
                  {settings.distractionFree ? (
                    <Minimize className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline text-[11px]">
                    {settings.distractionFree
                      ? t('reader.exitFullscreen')
                      : t('reader.distractionFreeLabel')}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Reading Canvas Area (full-bleed) */}
          <div
            ref={contentContainerRef}
            className={`w-full h-full relative flex flex-col items-center read-canvas ${
              isPagedCanvas ? 'overflow-hidden' : 'overflow-y-auto no-scrollbar'
            } ${themeClass}`}
            style={canvasStyle}
            onClick={handleCanvasClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* COMIC / MANGA FORMAT ENGINE */}
            {isComic ? (
              isWebtoon ? (
                <div className="w-full max-w-2xl flex flex-col items-center gap-2 py-4">
                  {book.comicPages?.map((page) => (
                    <div key={page.pageNumber} className="w-full relative shadow-md">
                      <img
                        src={page.imageUrl}
                        alt={page.title || `${t('common.page')} ${page.pageNumber}`}
                        className="w-full h-auto object-contain rounded select-none"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  key={
                    settings.pageTurnAnimation !== 'instant'
                      ? `comic-${book.currentPage}-${comicAnimClass()}`
                      : `comic-${book.currentPage}`
                  }
                  className={`relative w-full h-full ${comicAnimClass()}`}
                >
                  {currentComicPage && (
                    <ImageViewPage
                      src={currentComicPage.imageUrl}
                      alt={`${t('common.page')} ${book.currentPage}`}
                      mode={settings.imageViewMode}
                      onOpenPreview={(s) => setPreviewSrc(s)}
                    />
                  )}
                </div>
              )
            ) : isPagedText ? (
              singleImageSrc ? (
                <ImageViewPage
                  key={`img-${book.id}-${book.currentChapterIndex}`}
                  src={singleImageSrc}
                  alt={`${t('common.page')} ${book.currentPage}`}
                  mode={settings.imageViewMode}
                  onOpenPreview={(s) => setPreviewSrc(s)}
                />
              ) : (
                <TextPagedContent
                  key={`${book.id}-${book.currentChapterIndex}`}
                  page={subPage}
                  html={pagedHtml}
                  fontSize={readingFontSize}
                  lineHeight={readingLineHeight}
                  fontFamilyClass={fontClass}
                  pixelPerfect={isPixelFont}
                  marginSize={settings.marginSize}
                  animation={animationKind}
                  speedMs={settings.pageTurnSpeedMs}
                  pixelCanvas={pixelCanvas}
                  pixelLcdGhost={pixelCanvasEmboss}
                  canvasRepaintKey={`${settings.theme}|${fontClass}|${readingFontSize}|${readingLineHeight}|${dpr}`}
                  onPageCountChange={handlePageCountChange}
                />
              )
            ) : singleImageSrc ? (
              /* CONTINUOUS mode single-illustration chapter: honour the
                 chosen image display mode (fit-centred or full width). */
              <ImageViewPage
                key={`contimg-${book.id}-${book.currentChapterIndex}`}
                src={singleImageSrc}
                alt={`${t('common.page')} ${book.currentPage}`}
                mode={settings.imageViewMode}
                onOpenPreview={(s) => setPreviewSrc(s)}
              />
            ) : (
              /* CONTINUOUS / LEGACY VERTICAL CHAPTER VIEW */
              <div
                className={`w-full mx-auto ${marginClass} ${fontClass} leading-relaxed transition-all hh-cont-img-${settings.imageViewMode}`}
                style={{
                  fontSize: `${readingFontSize}px`,
                  lineHeight: readingLineHeight,
                }}
              >
                {currentChapter && (
                  <div className="mb-6 pb-4 border-b border-neutral-700/30">
                    <div className="flex items-center justify-between text-xs opacity-60 font-mono mb-1">
                      <span>{tf('reader.sectionOf', { current: book.currentChapterIndex + 1, total: totalItems })}</span>
                      {isBookmarked && (
                        <span className="text-amber-400 font-bold">{t('reader.bookmarked')}</span>
                      )}
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                      {currentChapter.title}
                    </h1>
                  </div>
                )}

                {currentChapter && (
                  <div
                    className="max-w-none space-y-4 text-justify select-text"
                    dangerouslySetInnerHTML={{ __html: continuousBodyHtml }}
                  />
                )}

                <div className="mt-12 pt-6 border-t border-neutral-700/30 flex items-center justify-between text-xs opacity-60">
                  <span>{book.title}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span>{t('reader.nextSection')}</span>
                    <GamepadButtonBadge inputId={profile.bindings.nextPage} size="sm" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Hidden measuring layer: previous chapter (backward navigation) */}
          {measureRequest !== null && !isComic && prevChapter && (
            <div
              aria-hidden="true"
              style={{
                position: 'fixed',
                left: '-24000px',
                top: 0,
                width: measureRequest.width,
                height: measureRequest.height,
                visibility: 'hidden',
                pointerEvents: 'none',
                zIndex: -10,
              }}
            >
              <TextPagedContent
                key={`hidden-${measureRequest.nonce}`}
                page={0}
                html={hiddenHtml}
                fontSize={readingFontSize}
                lineHeight={readingLineHeight}
                fontFamilyClass={fontClass}
                pixelPerfect={isPixelFont}
                marginSize={settings.marginSize}
                animation="instant"
                onPageCountChange={(c) => {
                  if (c > 0) setHiddenCount(c);
                }}
              />
            </div>
          )}

          {/* Hidden measuring layer: whole-book page count pass */}
          {bookProbe && bookProbeChapter && !isComic && (
            <div
              aria-hidden="true"
              style={{
                position: 'fixed',
                left: '-24000px',
                top: 0,
                width: bookProbe.width,
                height: bookProbe.height,
                visibility: 'hidden',
                pointerEvents: 'none',
                zIndex: -11,
              }}
            >
              <TextPagedContent
                key={`bookprobe-${bookProbe.nonce}`}
                page={0}
                html={probeHtml}
                fontSize={readingFontSize}
                lineHeight={readingLineHeight}
                fontFamilyClass={fontClass}
                pixelPerfect={isPixelFont}
                marginSize={settings.marginSize}
                animation="instant"
                onPageCountChange={(c) => {
                  if (c > 0) onBookProbeCount(bookProbe.chapter, c);
                }}
              />
            </div>
          )}

          {/* ============ Bottom area ============ */}
          {/* 1) Full bottom control bar - only when the menu/chrome is open.
                Two rows so the page buttons and the progress bar never overlap. */}
          {hudVisible && !settings.distractionFree && (
            <div className="absolute bottom-0 inset-x-0 z-40 bg-neutral-950/90 backdrop-blur border-t border-neutral-800 px-6 sm:px-10 safe-px">
              <div
                className="flex flex-col gap-2 text-sm text-neutral-300"
                style={{
                  paddingTop: '0.65rem',
                  paddingBottom: `calc(0.65rem + ${edgeBottom})`,
                }}
              >
                {/* Row 1: progress label + bar + percent */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs text-neutral-400 whitespace-nowrap shrink-0">
                    {progressLabel}
                  </span>
                  <div className="flex-1 min-w-[40px] bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full transition-all duration-200"
                      style={{ width: `${Math.min(100, progressPercent)}%` }}
                    />
                  </div>
                  <span className="font-mono text-sm text-amber-400 font-bold whitespace-nowrap shrink-0">
                    {Math.min(100, progressPercent)}%
                  </span>
                </div>

                {/* Row 2: prev / next page buttons */}
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={goToPrevPage}
                    disabled={
                      isComic
                        ? isWebtoon
                          ? false
                          : book.currentPage <= 1
                        : isPagedText
                          ? subPage <= 0 && book.currentChapterIndex <= 0
                          : book.currentChapterIndex <= 0
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none whitespace-nowrap"
                    title={t('reader.prevDisabledAtStart')}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <GamepadButtonBadge inputId={profile.bindings.prevPage} size="sm" />
                    <span className="hidden sm:inline">{t('common.prev')}</span>
                  </button>

                  <button
                    onClick={goToNextPage}
                    disabled={
                      isComic
                        ? isWebtoon
                          ? false
                          : book.currentPage >= totalItems
                        : isPagedText
                          ? subPage >= Math.max(1, textPageCount) - 1 &&
                            book.currentChapterIndex >= totalItems - 1
                          : book.currentChapterIndex >= totalItems - 1
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none whitespace-nowrap"
                    title={t('reader.nextDisabledAtEnd')}
                  >
                    <span className="hidden sm:inline">{t('common.next')}</span>
                    <GamepadButtonBadge inputId={profile.bindings.nextPage} size="sm" />
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2) Slim persistent status strip: progress / battery / time.
                Transparent so it melts into the page, with a colour taken from
                the active reading theme. */}
          {showStatusStrip && (
            <div className="absolute bottom-0 inset-x-0 z-40 pointer-events-none select-none">
              <div
                className="flex items-center justify-between px-8 sm:px-12 font-mono safe-px"
                style={{
                  fontSize: `${stripFontPx}px`,
                  lineHeight: 1.15,
                  paddingTop: 8,
                  paddingBottom: `calc(8px + ${edgeBottom})`,
                  color: stripColor,
                  opacity: 0.82,
                }}
              >
                <span className="flex items-center gap-1.5">
                  <span style={{ opacity: 0.6 }}>◷</span>
                  {progressLabel}
                </span>
                <span
                  className="flex-1 mx-3 h-px"
                  style={{ backgroundColor: 'currentColor', opacity: 0.25 }}
                >
                  <span
                    className="block h-px transition-all duration-200"
                    style={{
                      width: `${Math.min(100, progressPercent)}%`,
                      backgroundColor: 'currentColor',
                    }}
                  />
                </span>
                <StatusClock />
                <StatusBattery />
              </div>
            </div>
          )}

          {/* Distraction-Free Stealth HUD (menu when in distraction-free) */}
          <StealthHUD
            visible={settings.distractionFree && hudVisible}
            bookTitle={book.title}
            currentProgress={{
              current: displayPage,
              total: displayTotal,
              percentage: Math.min(100, progressPercent),
              chapterTitle: currentChapter?.title,
            }}
            isBookmarked={isBookmarked}
            profile={profile}
            onToggleDistractionFree={onToggleDistractionFree}
            onOpenMenu={onOpenSettings}
            onToggleBookmark={handleToggleBookmark}
            onNextPage={goToNextPage}
            onPrevPage={goToPrevPage}
          />

          {/* Original-image preview (tap on an image page) */}
          {previewSrc && (
            <ImagePreviewModal
              src={previewSrc}
              name={isComic ? book.title : undefined}
              onClose={() => setPreviewSrc(null)}
            />
          )}
        </div>
      </div>
    );
  }
);
ReaderView.displayName = 'ReaderView';

/** Inner (padding-free) content box of the reading canvas. Hidden measuring
 * layers must render at exactly this size so measured page counts match the
 * visible reader. */
function contentBoxOf(canvas: HTMLElement | null): { width: number; height: number } {
  if (!canvas) return { width: 400, height: 600 };
  const cs = window.getComputedStyle(canvas);
  const pt = parseFloat(cs.paddingTop) || 0;
  const pb = parseFloat(cs.paddingBottom) || 0;
  const pl = parseFloat(cs.paddingLeft) || 0;
  const pr = parseFloat(cs.paddingRight) || 0;
  return {
    width: Math.max(320, Math.round(canvas.clientWidth - pl - pr)),
    height: Math.max(320, Math.round(canvas.clientHeight - pt - pb)),
  };
}

/* --------------------------------------------------------------------- */
/*  Tiny time / battery indicators for the slim status strip             */
/* --------------------------------------------------------------------- */
function StatusClock() {
  const { timeStr } = useSystemStatus();
  return (
    <span className="flex items-center gap-1">
      <Clock className="w-4 h-4" style={{ opacity: 0.6 }} />
      <span>{timeStr || '--:--'}</span>
    </span>
  );
}

function StatusBattery() {
  const { batteryLevel, isCharging } = useSystemStatus();
  if (batteryLevel === null) return null;
  return (
    <span className="flex items-center gap-1">
      {isCharging ? (
        <BatteryCharging className="w-4 h-4" style={{ opacity: 0.85 }} />
      ) : (
        <Battery className="w-4 h-4" style={{ opacity: 0.85 }} />
      )}
      <span>{batteryLevel}%</span>
    </span>
  );
}
