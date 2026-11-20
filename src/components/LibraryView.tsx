import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { App as NativeApp } from '@capacitor/app';
import {
  Book,
  BookCategory,
  ControllerProfile,
  UiTheme,
  BookFormat,
} from '../types';
import {
  BookOpen,
  Plus,
  Gamepad2,
  Bookmark,
  Languages,
  HelpCircle,
  AlertCircle,
  Moon,
  Sun,
  SlidersHorizontal,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { GamepadButtonBadge } from './GamepadButtonBadge';
import { parseTxt, parseEpub, parseCbz, parseMobi } from '../services/bookParser';
import { saveBookFile } from '../services/bookStore';
import { BookActionsModal, ShelfManagerModal } from './ShelfModals';
import { useControllerNav } from '../hooks/useControllerNav';
import { useI18n } from '../i18n';

interface LibraryViewProps {
  books: Book[];
  removedBooks: Book[];
  categories: BookCategory[];
  uiTheme: UiTheme;
  profile: ControllerProfile;
  connectedGamepadName: string | null;
  pressedInputs: Set<string>;
  onSelectBook: (book: Book) => void;
  onImportBooks: (books: Book[]) => void;
  onOpenControllerModal: () => void;
  onOpenTutorial: () => void;
  onToggleUiTheme: () => void;
  onCreateCategory: (name: string) => void;
  onRenameCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
  onAssignCategory: (bookId: string, categoryId: string) => void;
  onRemoveBook: (bookId: string) => void;
  onRestoreBook: (bookId: string) => void;
  onDeleteBookFile: (bookId: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  removedBooks,
  categories,
  uiTheme,
  profile,
  connectedGamepadName,
  pressedInputs,
  onSelectBook,
  onImportBooks,
  onOpenControllerModal,
  onOpenTutorial,
  onToggleUiTheme,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
  onAssignCategory,
  onRemoveBook,
  onRestoreBook,
  onDeleteBookFile,
}) => {
  const { t, tf, lang, setLang } = useI18n();
  const [filter, setFilter] = useState<{ kind: 'all' } | { kind: 'cat'; id: string }>({
    kind: 'all',
  });
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuBook, setMenuBook] = useState<Book | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);

  // Fullscreen single-book carousel state.
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);

  // Triple-press B exit hint.
  const backCountRef = useRef(0);
  const backTimerRef = useRef<number | null>(null);
  const [exitHint, setExitHint] = useState<{ count: number; visible: boolean } | null>(null);

  const modalOpen = menuBook !== null || managerOpen;

  const filteredBooks = books.filter((b) => {
    if (filter.kind === 'all') return true;
    return (b.categoryId || '') === filter.id;
  });

  useEffect(() => {
    setIndex((i) => (filteredBooks.length ? Math.min(i, filteredBooks.length - 1) : 0));
  }, [filteredBooks.length]);

  const currentBook = filteredBooks[index];

  const switchBook = (delta: number) => {
    const n = filteredBooks.length;
    if (n <= 1) return;
    setDir(delta >= 0 ? 1 : -1);
    setIndex((i) => (i + delta + n) % n);
  };

  const navRef = useRef<{ setFocusedId: (id: string | null) => void } | null>(null);

  const nav = useControllerNav({
    containerRef: rootRef,
    active: !modalOpen,
    gamepadPressed: pressedInputs,
    isGamepadConnected: Boolean(connectedGamepadName),
    onMove: (dx, _dy, id) => {
      if (dx !== 0 && id.startsWith('book:')) {
        switchBook(dx);
        return true;
      }
      return false;
    },
    onActivate: (id) => {
      if (id.startsWith('book:')) {
        const book = books.find((b) => b.id === id.slice(5));
        if (book) onSelectBook(book);
      } else if (id.startsWith('f:all')) {
        setFilter({ kind: 'all' });
      } else if (id.startsWith('f:c:')) {
        setFilter({ kind: 'cat', id: id.slice(4) });
      } else if (id === 'act:manage') {
        setManagerOpen(true);
      } else if (id === 'act:lang') {
        setLang(lang === 'zh' ? 'en' : 'zh');
      } else if (id === 'act:ui') {
        onToggleUiTheme();
      } else if (id === 'act:import') {
        fileInputRef.current?.click();
      } else if (id === 'act:tutorial') {
        onOpenTutorial();
      } else if (id === 'act:controller') {
        onOpenControllerModal();
      }
    },
    onSecondary: (id) => {
      if (id.startsWith('book:')) {
        const book = books.find((b) => b.id === id.slice(5));
        if (book) setMenuBook(book);
      }
    },
    // Start opens the focused book's manage menu (or the shelf manager).
    onMenu: (id) => {
      if (id.startsWith('book:')) {
        const book = books.find((b) => b.id === id.slice(5));
        if (book) setMenuBook(book);
        return;
      }
      if (id === 'act:manage' || id.startsWith('f:')) {
        setManagerOpen(true);
        return;
      }
      if (id.startsWith('act:import')) {
        fileInputRef.current?.click();
      } else if (id.startsWith('act:lang')) {
        setLang(lang === 'zh' ? 'en' : 'zh');
      } else if (id.startsWith('act:ui')) {
        onToggleUiTheme();
      } else if (id.startsWith('act:tutorial')) {
        onOpenTutorial();
      } else if (id.startsWith('act:controller')) {
        onOpenControllerModal();
      }
    },
    // B on the shelf: triple press exits the app.
    onBack: () => {
      backCountRef.current += 1;
      const count = backCountRef.current;
      if (backTimerRef.current) window.clearTimeout(backTimerRef.current);
      if (count >= 3) {
        backCountRef.current = 0;
        setExitHint(null);
        try {
          NativeApp.exitApp();
        } catch {
          window.close();
        }
        return;
      }
      setExitHint({ count, visible: true });
      backTimerRef.current = window.setTimeout(() => {
        backCountRef.current = 0;
        setExitHint((prev) => (prev ? { ...prev, visible: false } : null));
        window.setTimeout(() => setExitHint(null), 320);
      }, 600);
    },
    getInitialId: () => (filteredBooks.length ? `book:${filteredBooks[0].id}` : 'f:all'),
  });
  navRef.current = nav;

  // Keep the controller highlight on the carousel book when it changes.
  useEffect(() => {
    const b = filteredBooks[index];
    if (b) navRef.current?.setFocusedId(`book:${b.id}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    return () => {
      if (backTimerRef.current) window.clearTimeout(backTimerRef.current);
    };
  }, []);

  const translateImportError = (raw: string): string => {
    const msg = (raw || '').toLowerCase();
    if (msg.includes('container.xml') || msg.includes('opf')) {
      return t('lib.importErrorEpub');
    }
    if (msg.includes('no supported image') || msg.includes('image files')) {
      return t('lib.importErrorNoImages');
    }
    return t('lib.importFailed');
  };

  const handleFiles = async (files: File[]) => {
    if (!files.length) return;
    setIsImporting(true);
    setImportError(null);
    const imported: Book[] = [];
    for (const file of files) {
      try {
        const ext = file.name.split('.').pop()?.toLowerCase();
        let book: Book;
        if (ext === 'epub') {
          book = await parseEpub(await file.arrayBuffer(), file.name);
        } else if (ext === 'cbz' || ext === 'zip') {
          book = await parseCbz(await file.arrayBuffer(), file.name);
        } else if (ext === 'mobi') {
          book = await parseMobi(await file.arrayBuffer(), file.name);
        } else if (ext === 'pdf') {
          const text = await file.text().catch(() => '');
          book = parseTxt(
            text || `PDF Document: ${file.name}\n\nThis PDF was indexed for handheld reading.`,
            file.name.replace(/\.pdf$/i, ''),
            'Imported Document'
          );
          book.format = 'pdf';
        } else {
          book = parseTxt(await file.text(), file.name.replace(/\.[^/.]+$/, ''), 'Local Author');
        }
        imported.push(book);
        // Keep the original file bytes so covers / images survive restarts.
        try {
          await saveBookFile(book.id, file);
        } catch (e) {
          console.warn('Failed to persist imported file:', e);
        }
      } catch (err: any) {
        console.error('Failed to import file:', err);
        setImportError(translateImportError(err?.message || ''));
      }
    }
    if (imported.length) onImportBooks(imported);
    setIsImporting(false);
  };

  const getFormatBadge = (format: BookFormat) => {
    switch (format) {
      case 'epub':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'cbz':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'pdf':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'mobi':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'txt':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
  };

  const renderBook = (book: Book, isComic: boolean, total: number, current: number, progress: number) => {
    const category = categories.find((c) => c.id === book.categoryId);
    return (
      <motion.div
        key={book.id}
        initial={{ opacity: 0, x: dir * 120 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div
          data-nav-id={`book:${book.id}`}
          onClick={() => onSelectBook(book)}
          className="h-auto max-h-full w-full bg-neutral-900/70 hover:bg-neutral-800/60 border border-neutral-800 hover:border-amber-500/60 rounded-2xl p-2.5 sm:p-4 landscape:h-full flex gap-3 sm:gap-4 overflow-hidden cursor-pointer transition-colors hh-focusable"
        >
          {/* Cover: height-driven on wide screens, but width-capped on
              phones. A full-height cover is much wider than the card at
              phone aspect ratios and used to leave the details column with
              zero width. */}
          <div className="self-center w-[34%] max-w-[190px] sm:max-w-[260px] aspect-[2/3] shrink-0 rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 flex items-center justify-center p-1.5 sm:p-2 landscape:self-auto landscape:h-full landscape:w-auto landscape:max-w-none">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 sm:gap-3">
                <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-amber-400/80" />
                <span className="text-[10px] sm:text-xs font-mono text-neutral-500 text-center px-1 whitespace-nowrap">
                  {book.fileSize || t('lib.offline')}
                </span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-extrabold text-lg sm:text-2xl text-neutral-50 leading-tight line-clamp-2">
                  {book.title}
                </h2>
                <p className="text-sm text-neutral-400 mt-1 truncate">{book.author}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuBook(book);
                }}
                className="p-1.5 sm:p-2 rounded-lg text-neutral-400 hover:text-amber-300 hover:bg-neutral-800 transition-colors shrink-0"
                title={t('lib.bookMenu')}
              >
                <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 mt-1.5 sm:mt-2 flex-wrap">
              <span
                className={`text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${getFormatBadge(
                  book.format
                )}`}
              >
                {book.format}
              </span>
              {category && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {category.name}
                </span>
              )}
              {book.bookmarks.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-amber-400 font-mono">
                  <Bookmark className="w-4 h-4 fill-current" />
                  <span>{book.bookmarks.length}</span>
                </span>
              )}
            </div>

            {book.description && (
              <p className="hidden sm:block text-sm text-neutral-300 mt-3 leading-relaxed overflow-y-auto no-scrollbar sm:flex-1 pr-1">
                {book.description}
              </p>
            )}

            <div className="mt-auto pt-2 sm:pt-3 space-y-1.5 sm:space-y-2 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs font-mono text-neutral-400">
                <span>
                  {isComic
                    ? tf('lib.pageCurrentOf', { current, total })
                    : tf('lib.sectionCurrentOf', { current, total })}
                </span>
                <span className="text-amber-400 font-bold">
                  {tf('lib.progressPercent', { percent: progress })}
                </span>
              </div>
              <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] sm:text-xs text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <span className="font-mono">{t('lib.openHint')}</span>
                  <span className="hidden sm:inline-flex">
                    <GamepadButtonBadge inputId={profile.bindings.nextPage} size="sm" />
                  </span>
                </span>
                <span className="font-semibold text-amber-400">
                  {t('lib.read')} →
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div
      ref={rootRef}
      className="w-full h-full bg-neutral-950 text-neutral-100 flex flex-col overflow-hidden"
    >
      {/* ================= Top bar ================= */}
      <header
        data-nav-zone="header"
        className="z-20 bg-neutral-900/90 backdrop-blur border-b border-neutral-800 safe-px-tight shrink-0"
        style={{
          paddingTop: 'calc(0.75rem + max(env(safe-area-inset-top, 0px), 0.5rem))',
          paddingBottom: '0.75rem',
        }}
      >
        {/* On phones the title gets its own full-width row and the action
            buttons share the row below: five buttons plus the app name
            cannot fit in three equal columns (the nowrap title used to
            spill over the help button, and the two button groups could
            even overlap on 320px screens). From `md` up the original
            [actions | title | actions] single row is restored, with equal
            flexible side columns so a long app name and the import label
            cannot push the buttons off-screen. */}
        <div className="max-w-7xl mx-auto flex flex-col gap-2 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="order-1 flex flex-col items-center min-w-0 md:order-none md:col-start-2 md:row-start-1">
            <div className="flex w-full items-center justify-center gap-2 min-w-0">
              <div className="shrink-0 p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <h1 className="font-extrabold tracking-tight text-neutral-50 text-lg truncate">
                {lang === 'zh' ? t('common.appName') : t('common.appNameEn')}
              </h1>
              <span className="shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                {t('lib.versionBadge')}
              </span>
            </div>
            {connectedGamepadName && (
              <span className="flex items-center gap-1 mt-0.5 text-[10px] text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t('ctrl.connected')}
              </span>
            )}
          </div>

          <div className="order-2 flex flex-wrap items-center justify-between gap-2 md:order-none md:contents">
            <div className="flex items-center gap-1.5 md:col-start-1 md:row-start-1 md:justify-self-start">
              <button
                data-nav-id="act:lang"
                onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                className="p-2 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-200 hover:border-amber-500/50 hh-focusable transition-colors"
                title={t('settings.language')}
              >
                <Languages className="w-5 h-5 text-amber-400" />
              </button>
              <button
                data-nav-id="act:ui"
                onClick={onToggleUiTheme}
                className="p-2 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-200 hover:border-amber-500/50 hh-focusable transition-colors"
                title={uiTheme === 'night' ? t('settings.dayMode') : t('settings.nightMode')}
              >
                {uiTheme === 'night' ? (
                  <Sun className="w-5 h-5 text-amber-400" />
                ) : (
                  <Moon className="w-5 h-5 text-amber-400" />
                )}
              </button>
            </div>

            <div className="ms-auto flex items-center gap-1.5 md:col-start-3 md:row-start-1 md:justify-self-end">
              <button
                data-nav-id="act:tutorial"
                onClick={onOpenTutorial}
                className="p-2 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-amber-300 hover:border-amber-500/40 hh-focusable transition-colors"
                title={t('lib.tutorial')}
              >
                <HelpCircle className="w-5 h-5 text-sky-400" />
              </button>
              <button
                data-nav-id="act:controller"
                onClick={onOpenControllerModal}
                className={`p-2 rounded-xl border hh-focusable transition-all ${
                  connectedGamepadName
                    ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-300'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:border-neutral-600'
                }`}
                title={t('lib.controllerConfig')}
              >
                <Gamepad2 className="w-5 h-5 text-amber-400" />
              </button>
              <button
                data-nav-id="act:import"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm whitespace-nowrap shadow-md hh-focusable transition-colors disabled:opacity-50"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden lg:inline">
                  {isImporting ? t('lib.importing') : t('lib.importBook')}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".epub,.cbz,.zip,.mobi,.txt,.pdf"
                className="hidden"
                onChange={(e) => {
                  const files: File[] = e.target.files
                    ? Array.from(e.target.files as ArrayLike<File>)
                    : [];
                  e.target.value = '';
                  if (files.length) handleFiles(files);
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ================= Shelf ================= */}
      <main
        data-nav-zone="shelf"
        className="flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 sm:px-7 py-3 flex flex-col gap-3"
      >
        {/* Category chips row */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            data-nav-id="f:all"
            onClick={() => setFilter({ kind: 'all' })}
            className={`px-3.5 py-1.5 rounded-xl border text-sm font-semibold transition-all hh-focusable ${
              filter.kind === 'all'
                ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow'
                : 'bg-neutral-900/80 text-neutral-300 border-neutral-800/80 hover:border-neutral-600'
            }`}
          >
            {t('lib.allBooks')}
            <span className="ml-1.5 opacity-70 font-mono">{books.length}</span>
          </button>

          {categories.map((c) => (
            <button
              key={c.id}
              data-nav-id={`f:c:${c.id}`}
              onClick={() => setFilter({ kind: 'cat', id: c.id })}
              className={`px-3.5 py-1.5 rounded-xl border text-sm font-semibold transition-all hh-focusable ${
                filter.kind === 'cat' && filter.id === c.id
                  ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow'
                  : 'bg-neutral-900/80 text-neutral-300 border-neutral-800/80 hover:border-neutral-600'
              }`}
            >
              {c.name}
            </button>
          ))}

          <span className="flex-1" />

          <button
            data-nav-id="act:manage"
            onClick={() => setManagerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-neutral-700 bg-neutral-900 text-sm font-semibold text-neutral-300 hover:text-amber-300 hover:border-amber-500/40 hh-focusable transition-colors"
          >
            <SlidersHorizontal className="w-5 h-5 text-amber-400" />
            {t('lib.manageShelf')}
          </button>
        </div>

        {/* Import error banner */}
        {importError && (
          <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-700/60 text-rose-300 text-sm flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {/* Fullscreen single-book carousel */}
        {filteredBooks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-800 text-center text-sm text-neutral-500 p-8">
            <BookOpen className="w-10 h-10 text-neutral-700" />
            <p>{t('lib.noBooks')}</p>
            <p className="text-xs text-neutral-600 max-w-md">{t('lib.importBooksHint')}</p>
            {filter.kind !== 'all' && (
              <button
                onClick={() => setFilter({ kind: 'all' })}
                className="text-sm text-amber-400 underline-offset-2 underline"
              >
                {t('lib.backToAll')}
              </button>
            )}
          </div>
        ) : (
          <div className="relative flex-1 min-h-0">
            {currentBook &&
              (() => {
                const isComic = currentBook.format === 'cbz';
                const total = isComic
                  ? currentBook.comicPages?.length || 1
                  : currentBook.chapters?.length || 1;
                const current = isComic
                  ? currentBook.currentPage
                  : currentBook.currentChapterIndex + 1;
                const progress = Math.round((current / total) * 100);
                return renderBook(currentBook, isComic, total, current, progress);
              })()}

            {/* Touch arrows */}
            {filteredBooks.length > 1 && (
              <>
                <button
                  onClick={() => switchBook(-1)}
                  className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 hover:bg-black/70 text-neutral-200 transition-colors"
                  aria-label="Previous book"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => switchBook(1)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 hover:bg-black/70 text-neutral-200 transition-colors"
                  aria-label="Next book"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        )}

        {/* Footer hints */}
        <div className="shrink-0 text-xs text-neutral-500 font-mono flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
          {filteredBooks.length > 1 && (
            <span className="text-amber-400/80">
              {tf('lib.bookIndexOf', { current: index + 1, total: filteredBooks.length })}
            </span>
          )}
          <span>{t('lib.switchHint')}</span>
          <span>{t('lib.menuKeyHint')}</span>
        </div>
      </main>

      {/* Triple-B exit hint */}
      {exitHint && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 bottom-5 z-[70] px-4 py-2 rounded-xl text-sm font-semibold shadow-xl transition-opacity duration-300 ${
            exitHint.visible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundColor: 'rgba(9, 9, 11, 0.96)',
            color: '#fde68a',
            border: '1px solid rgba(245, 158, 11, 0.6)',
          }}
        >
          {tf('lib.exitHint', { count: Math.max(1, 3 - exitHint.count) })}
        </div>
      )}

      {/* ================= Modals ================= */}
      <BookActionsModal
        open={menuBook !== null}
        book={menuBook}
        categories={categories}
        gamepadPressed={modalOpen ? pressedInputs : undefined}
        isGamepadConnected={Boolean(connectedGamepadName)}
        onClose={() => setMenuBook(null)}
        onAssign={(catId) => {
          if (menuBook) onAssignCategory(menuBook.id, catId);
          setMenuBook(null);
        }}
        onRemoveFromShelf={() => {
          if (menuBook) onRemoveBook(menuBook.id);
          setMenuBook(null);
        }}
        onDeleteFile={() => {
          if (menuBook) onDeleteBookFile(menuBook.id);
          setMenuBook(null);
        }}
      />

      <ShelfManagerModal
        open={managerOpen}
        categories={categories}
        removedBooks={removedBooks}
        gamepadPressed={modalOpen ? pressedInputs : undefined}
        isGamepadConnected={Boolean(connectedGamepadName)}
        onClose={() => setManagerOpen(false)}
        onCreate={(name) => onCreateCategory(name)}
        onRename={(id, name) => onRenameCategory(id, name)}
        onDeleteCategory={(id) => onDeleteCategory(id)}
        onRestore={(id) => onRestoreBook(id)}
        onDeletePermanently={(id) => onDeleteBookFile(id)}
        onSelectBook={onSelectBook}
      />
    </div>
  );
};
