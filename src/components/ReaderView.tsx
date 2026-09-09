import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Book,
  ReaderSettings,
  ControllerProfile,
  ReaderAction,
  AspectRatio,
} from '../types';
import {
  Maximize,
  Minimize,
  Sliders,
  List,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Gamepad2,
  Tv,
  HelpCircle,
  Home,
} from 'lucide-react';
import { StealthHUD } from './StealthHUD';
import { GamepadButtonBadge } from './GamepadButtonBadge';

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
  onActionTriggered?: (action: ReaderAction) => void;
  scrollDeltaY?: number;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  book,
  settings,
  profile,
  onUpdateBook,
  onOpenSettings,
  onOpenToc,
  onOpenControllerModal,
  onToggleDistractionFree,
  onBackToLibrary,
  scrollDeltaY = 0,
}) => {
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const [hudVisible, setHudVisible] = useState(!settings.distractionFree);
  const hudTimeoutRef = useRef<number | null>(null);

  // Comic Zoom state
  const [comicZoom, setComicZoom] = useState(1);

  const isComic = book.format === 'cbz';
  const totalItems = isComic
    ? book.comicPages?.length || 1
    : book.chapters?.length || 1;

  const currentItemIndex = isComic
    ? book.currentPage - 1
    : book.currentChapterIndex;

  // Auto-hide HUD in distraction-free mode
  const triggerHudPeek = () => {
    setHudVisible(true);
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    if (settings.distractionFree) {
      hudTimeoutRef.current = window.setTimeout(() => {
        setHudVisible(false);
      }, 3500);
    }
  };

  useEffect(() => {
    if (settings.distractionFree) {
      setHudVisible(false);
    } else {
      setHudVisible(true);
    }
  }, [settings.distractionFree]);

  // Handle continuous smooth scroll from analog thumbsticks
  useEffect(() => {
    if (scrollDeltaY !== 0 && contentContainerRef.current) {
      contentContainerRef.current.scrollBy({
        top: scrollDeltaY,
        behavior: 'auto',
      });
      triggerHudPeek();
    }
  }, [scrollDeltaY]);

  // Page turns
  const goToNextPage = () => {
    if (isComic) {
      const isRtl = settings.readingMode === 'manga_rtl';
      const nextPage = book.currentPage + 1;
      if (nextPage <= (book.comicPages?.length || 1)) {
        onUpdateBook({ currentPage: nextPage });
      }
    } else {
      const nextChapter = book.currentChapterIndex + 1;
      if (nextChapter < (book.chapters?.length || 1)) {
        onUpdateBook({
          currentChapterIndex: nextChapter,
          currentPage: nextChapter + 1,
        });
        if (contentContainerRef.current) {
          contentContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    }
    triggerHudPeek();
  };

  const goToPrevPage = () => {
    if (isComic) {
      const prevPage = book.currentPage - 1;
      if (prevPage >= 1) {
        onUpdateBook({ currentPage: prevPage });
      }
    } else {
      const prevChapter = book.currentChapterIndex - 1;
      if (prevChapter >= 0) {
        onUpdateBook({
          currentChapterIndex: prevChapter,
          currentPage: prevChapter + 1,
        });
        if (contentContainerRef.current) {
          contentContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    }
    triggerHudPeek();
  };

  const handleToggleBookmark = () => {
    const target = isComic ? book.currentPage : book.currentChapterIndex;
    const exists = book.bookmarks.includes(target);
    const updated = exists
      ? book.bookmarks.filter((b) => b !== target)
      : [...book.bookmarks, target];
    onUpdateBook({ bookmarks: updated });
  };

  const isBookmarked = isComic
    ? book.bookmarks.includes(book.currentPage)
    : book.bookmarks.includes(book.currentChapterIndex);

  // Compute theme styles
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
      default:
        return 'bg-black text-neutral-200';
    }
  }, [settings.theme]);

  // Compute font family class
  const fontClass = useMemo(() => {
    switch (settings.fontFamily) {
      case 'serif':
        return 'font-serif';
      case 'sans':
        return 'font-sans';
      case 'mono':
        return 'font-mono';
      case 'display':
        return 'font-display';
      default:
        return 'font-serif';
    }
  }, [settings.fontFamily]);

  // Compute margins
  const marginClass = useMemo(() => {
    switch (settings.marginSize) {
      case 'compact':
        return 'px-4 py-4 max-w-2xl';
      case 'balanced':
        return 'px-8 py-6 max-w-3xl';
      case 'relaxed':
        return 'px-12 py-8 max-w-4xl';
      default:
        return 'px-6 py-6 max-w-3xl';
    }
  }, [settings.marginSize]);

  // Aspect ratio styling
  const getAspectContainerClass = (ratio: AspectRatio) => {
    switch (ratio) {
      case '16:9':
        return 'aspect-video max-h-full max-w-full w-auto';
      case '3:2':
        return 'aspect-[3/2] max-h-full max-w-full w-auto';
      case '4:3':
        return 'aspect-[4/3] max-h-full max-w-full w-auto';
      case '1:1':
        return 'aspect-square max-h-full max-w-full w-auto';
      case 'native':
      default:
        return 'w-full h-full';
    }
  };

  const currentChapter = book.chapters?.[book.currentChapterIndex];
  const currentComicPage = book.comicPages?.[book.currentPage - 1];

  const currentProgressPercent = Math.round(
    ((isComic ? book.currentPage : book.currentChapterIndex + 1) / totalItems) * 100
  );

  return (
    <div
      className={`relative w-full h-screen overflow-hidden flex flex-col items-center justify-center select-none ${
        settings.screenBezelPreview ? 'bg-neutral-950 p-2 sm:p-6' : 'bg-black'
      }`}
    >
      {/* Handheld Console Bezel Frame Simulation (if enabled) */}
      <div
        className={`relative flex flex-col items-center justify-center w-full h-full max-h-full ${
          settings.screenBezelPreview
            ? 'p-6 sm:p-10 rounded-[40px] bg-gradient-to-b from-neutral-800 to-neutral-900 border-4 border-neutral-700 shadow-[0_25px_60px_rgba(0,0,0,0.8)]'
            : ''
        }`}
      >
        {/* Decorative Handheld Console Bumpers & Speaker Grille */}
        {settings.screenBezelPreview && (
          <>
            <div className="absolute top-2 left-10 flex items-center gap-1">
              <span className="px-3 py-0.5 rounded-t-lg bg-neutral-700 text-[10px] font-mono font-bold text-neutral-400 border-t border-x border-neutral-600">
                LB / L1
              </span>
              <span className="px-2 py-0.5 rounded-t bg-neutral-800 text-[9px] font-mono text-neutral-500">
                LT
              </span>
            </div>
            <div className="absolute top-2 right-10 flex items-center gap-1">
              <span className="px-2 py-0.5 rounded-t bg-neutral-800 text-[9px] font-mono text-neutral-500">
                RT
              </span>
              <span className="px-3 py-0.5 rounded-t-lg bg-neutral-700 text-[10px] font-mono font-bold text-neutral-400 border-t border-x border-neutral-600">
                RB / R1
              </span>
            </div>
            {/* Left D-pad tactile simulation */}
            <div className="hidden lg:flex absolute left-3 top-1/2 -translate-y-1/2 flex-col items-center opacity-60 pointer-events-none">
              <div className="w-6 h-6 rounded-full bg-neutral-950 border border-neutral-700 shadow-inner flex items-center justify-center text-[8px] font-bold text-neutral-500">
                +
              </div>
            </div>
            {/* Right Face buttons tactile simulation */}
            <div className="hidden lg:flex absolute right-3 top-1/2 -translate-y-1/2 flex-col items-center gap-1 opacity-60 pointer-events-none">
              <div className="w-5 h-5 rounded-full bg-neutral-950 border border-neutral-700 text-[9px] font-bold flex items-center justify-center text-amber-400">
                Y
              </div>
              <div className="flex gap-1">
                <div className="w-5 h-5 rounded-full bg-neutral-950 border border-neutral-700 text-[9px] font-bold flex items-center justify-center text-sky-400">
                  X
                </div>
                <div className="w-5 h-5 rounded-full bg-neutral-950 border border-neutral-700 text-[9px] font-bold flex items-center justify-center text-rose-400">
                  B
                </div>
              </div>
              <div className="w-5 h-5 rounded-full bg-neutral-950 border border-neutral-700 text-[9px] font-bold flex items-center justify-center text-emerald-400">
                A
              </div>
            </div>
          </>
        )}

        {/* Screen Display Box with Aspect Ratio constraint */}
        <div
          className={`relative overflow-hidden flex flex-col shadow-2xl transition-all duration-300 ${
            settings.screenBezelPreview ? 'rounded-2xl ring-2 ring-neutral-950' : ''
          } ${getAspectContainerClass(settings.aspectRatio)}`}
        >
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

          {/* Top Reading Navigation Bar (Visible when not distraction-free or on HUD peek) */}
          <div
            className={`absolute top-0 inset-x-0 z-30 transition-all duration-200 ${
              hudVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-full pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-950/90 backdrop-blur border-b border-neutral-800 text-neutral-100 text-xs">
              <div className="flex items-center gap-2 truncate">
                <button
                  onClick={onBackToLibrary}
                  className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center gap-1"
                  title="Back to Library (B / Esc)"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Library</span>
                </button>

                <span className="font-bold truncate max-w-[140px] sm:max-w-xs">{book.title}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase">
                  {book.format}
                </span>
              </div>

              {/* Center Gamepad hint pills */}
              <div className="hidden md:flex items-center gap-2 font-mono text-[11px] text-neutral-400">
                <span className="flex items-center gap-1">
                  <GamepadButtonBadge inputId={profile.bindings.prevPage} size="sm" />
                  <span>Prev</span>
                </span>
                <span className="flex items-center gap-1">
                  <GamepadButtonBadge inputId={profile.bindings.nextPage} size="sm" />
                  <span>Next</span>
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onOpenToc}
                  className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white"
                  title="Table of Contents (T / Select)"
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
                  title="Bookmark Current Section"
                >
                  <Bookmark className="w-3.5 h-3.5" fill={isBookmarked ? 'currentColor' : 'none'} />
                </button>

                <button
                  onClick={onOpenControllerModal}
                  className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  title="Gamepad Button Mapping"
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline font-mono text-[11px]">Binds</span>
                </button>

                <button
                  onClick={onOpenSettings}
                  className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white"
                  title="Font & Theme Settings (M / Start)"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={onToggleDistractionFree}
                  className="p-1.5 rounded-lg bg-amber-500 text-neutral-950 font-bold hover:bg-amber-400 flex items-center gap-1"
                  title="Distraction-Free Mode (Y / Space)"
                >
                  <Maximize className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Distraction-Free</span>
                </button>
              </div>
            </div>
          </div>

          {/* Reading Canvas Area */}
          <div
            ref={contentContainerRef}
            className={`w-full h-full overflow-y-auto no-scrollbar relative flex flex-col items-center ${themeClass} ${
              hudVisible && !settings.distractionFree ? 'pt-12 pb-14' : 'pt-0 pb-0'
            }`}
            onClick={(e) => {
              // Tap zones: left 25% = prev, right 25% = next, center 50% = toggle HUD
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const width = rect.width;

              if (clickX < width * 0.22) {
                goToPrevPage();
              } else if (clickX > width * 0.78) {
                goToNextPage();
              } else {
                triggerHudPeek();
              }
            }}
          >
            {/* COMIC / MANGA FORMAT ENGINE */}
            {isComic ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-2">
                {settings.readingMode === 'webtoon' ? (
                  // Continuous vertical comic strip
                  <div className="w-full max-w-2xl flex flex-col items-center gap-2 py-4">
                    {book.comicPages?.map((page) => (
                      <div key={page.pageNumber} className="w-full relative shadow-md">
                        <img
                          src={page.imageUrl}
                          alt={page.title || `Page ${page.pageNumber}`}
                          className="w-full h-auto object-contain rounded select-none"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  // Single Page or Manga RTL mode
                  <div className="relative w-full h-full flex items-center justify-center">
                    {currentComicPage && (
                      <img
                        src={currentComicPage.imageUrl}
                        alt={`Page ${book.currentPage}`}
                        className="max-h-full max-w-full object-contain rounded shadow-lg transition-transform duration-200"
                        style={{ transform: `scale(${comicZoom})` }}
                      />
                    )}
                  </div>
                )}
              </div>
            ) : (
              // EPUB / MOBI / TXT / PDF TEXT ENGINE
              <div
                className={`w-full mx-auto ${marginClass} ${fontClass} leading-relaxed transition-all`}
                style={{
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: settings.lineHeight,
                }}
              >
                {/* Chapter Heading */}
                {currentChapter && (
                  <div className="mb-6 pb-4 border-b border-neutral-700/30">
                    <div className="flex items-center justify-between text-xs opacity-60 font-mono mb-1">
                      <span>SECTION {book.currentChapterIndex + 1} OF {totalItems}</span>
                      {isBookmarked && <span className="text-amber-400 font-bold">★ BOOKMARKED</span>}
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                      {currentChapter.title}
                    </h1>
                  </div>
                )}

                {/* Chapter HTML / Plaintext Content */}
                {currentChapter && (
                  <div
                    className="prose dark:prose-invert max-w-none space-y-4 text-justify select-text"
                    dangerouslySetInnerHTML={{ __html: currentChapter.content }}
                  />
                )}

                {/* End of Chapter prompt */}
                <div className="mt-12 pt-6 border-t border-neutral-700/30 flex items-center justify-between text-xs opacity-60">
                  <span>{book.title}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span>Next:</span>
                    <GamepadButtonBadge inputId={profile.bindings.nextPage} size="sm" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Floating Minimal Bar (when not distraction-free) */}
          {hudVisible && !settings.distractionFree && (
            <div className="absolute bottom-0 inset-x-0 z-30 bg-neutral-950/90 backdrop-blur border-t border-neutral-800 px-4 py-2 flex items-center justify-between text-xs text-neutral-300">
              <button
                onClick={goToPrevPage}
                disabled={currentItemIndex <= 0}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
                <GamepadButtonBadge inputId={profile.bindings.prevPage} size="sm" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              <div className="flex items-center gap-3">
                <span className="font-mono text-neutral-400">
                  {isComic
                    ? `Page ${book.currentPage} / ${totalItems}`
                    : `Section ${book.currentChapterIndex + 1} / ${totalItems}`}
                </span>
                <div className="w-24 sm:w-36 bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-200"
                    style={{ width: `${currentProgressPercent}%` }}
                  />
                </div>
                <span className="font-mono text-[11px] text-amber-400 font-bold">
                  {currentProgressPercent}%
                </span>
              </div>

              <button
                onClick={goToNextPage}
                disabled={currentItemIndex >= totalItems - 1}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none"
              >
                <span className="hidden sm:inline">Next</span>
                <GamepadButtonBadge inputId={profile.bindings.nextPage} size="sm" />
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Distraction-Free Stealth HUD (Appears when triggered in distraction-free mode) */}
          <StealthHUD
            visible={settings.distractionFree && hudVisible}
            bookTitle={book.title}
            currentProgress={{
              current: isComic ? book.currentPage : book.currentChapterIndex + 1,
              total: totalItems,
              percentage: currentProgressPercent,
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
        </div>
      </div>
    </div>
  );
};
