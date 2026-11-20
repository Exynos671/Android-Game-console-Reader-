import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Book,
  BookCategory,
  ReaderSettings,
  ReaderAction,
  ReaderTheme,
  ControllerProfile,
  BindSlot,
} from './types';
import { SAMPLE_BOOKS } from './data/sampleBooks';
import { useGamepad } from './hooks/useGamepad';
import { useI18n } from './i18n';
import { LibraryView } from './components/LibraryView';
import { ReaderView, ReaderViewHandle, BackHint } from './components/ReaderView';
import { GamepadControllerModal } from './components/GamepadControllerModal';
import { QuickSettingsDrawer } from './components/QuickSettingsDrawer';
import { TableOfContentsModal } from './components/TableOfContentsModal';
import { TutorialModal } from './components/TutorialModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { applyImmersiveMode } from './services/immersive';
import { getBookFile, deleteBookFile as dropBookFile } from './services/bookStore';
import { parseEpub, parseCbz, parseTxt, TXT_PARSER_REVISION } from './services/bookParser';
import { resolvePanelType } from './services/displayInfo';

const SETTINGS_STORAGE_KEY = 'handheld_reader_settings';
const BOOKS_STORAGE_KEY = 'handheld_reader_books';
const REMOVED_BOOKS_KEY = 'handheld_reader_removed_books';
const CATEGORIES_KEY = 'handheld_reader_categories';
const TUTORIAL_DONE_KEY = 'handheld_reader_tutorial_done';

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18,
  lineHeight: 1.7,
  fontFamily: 'serif',
  pixelCanvas: true,
  theme: 'oled',
  readingMode: 'paginated',
  distractionFree: false,
  marginSize: 'balanced',
  pageTurnAnimation: 'slide',
  pageTurnSpeedMs: 500,
  imageViewMode: 'fit',
  progressMode: 'book',
  showHudTimeAndBattery: true,
  bottomBarFontSize: 'md',
  backDoublePressMs: 800,
  immersiveMode: true,
  uiTheme: 'night',
  uiScale: 'large',
  screenPanel: 'auto',
  brightness: 100,
  warmth: 0,
};

/** Global chrome scale (root font-size) for each UI size option. */
const UI_SCALE_PX: Record<ReaderSettings['uiScale'], number> = {
  small: 16,
  medium: 18,
  large: 20,
  xlarge: 23,
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved) as T;
  } catch (e) {
    console.error('Failed to load', key, e);
  }
  return fallback;
}

/** Sample ids shipped with the current build (v3.1 ships only Time Machine). */
const CURRENT_SAMPLE_IDS = new Set(SAMPLE_BOOKS.map((b) => b.id));

/** Built-in samples that no longer ship are pruned from stored lists. */
function isStaleSample(b: Book): boolean {
  return b.id.startsWith('sample_') && !CURRENT_SAMPLE_IDS.has(b.id);
}

function withBinding(
  profile: ControllerProfile,
  action: ReaderAction,
  slot: 'primary' | 'secondary',
  inputId: string
): ControllerProfile {
  const next: ControllerProfile = { ...profile };
  if (slot === 'secondary') {
    next.secondaryBindings = { ...(profile.secondaryBindings || {}), [action]: inputId };
  } else {
    next.bindings = { ...profile.bindings, [action]: inputId };
  }
  return next;
}

/** Remove every use of `inputId` (other actions) from both binding maps. */
function clearInputBinding(profile: ControllerProfile, inputId: string): ControllerProfile {
  const bindings: Record<string, string> = { ...profile.bindings };
  for (const k of Object.keys(bindings)) {
    if (bindings[k] === inputId) delete bindings[k];
  }
  const sb = { ...(profile.secondaryBindings || {}) };
  let sbChanged = false;
  for (const k of Object.keys(sb)) {
    if (sb[k] === inputId) {
      delete sb[k];
      sbChanged = true;
    }
  }
  return {
    ...profile,
    bindings: bindings as ControllerProfile['bindings'],
    secondaryBindings: sbChanged ? sb : profile.secondaryBindings,
  };
}

/** Another action that already uses `inputId` (ignoring `ignoreAction`). */
function findDuplicateAction(
  profile: ControllerProfile,
  ignoreAction: ReaderAction,
  inputId: string
): ReaderAction | null {
  const check = (map: Record<string, string> | undefined): ReaderAction | null => {
    if (!map) return null;
    for (const [a, id] of Object.entries(map)) {
      if (a !== ignoreAction && id === inputId) return a as ReaderAction;
    }
    return null;
  };
  return check(profile.bindings) || check(profile.secondaryBindings);
}

export default function App() {
  const { lang, t } = useI18n();

  const [books, setBooks] = useState<Book[]>(() => {
    const saved = loadJson<Book[]>(BOOKS_STORAGE_KEY, SAMPLE_BOOKS)
      .filter((b) => !isStaleSample(b));
    const existingIds = new Set(saved.map((b) => b.id));
    const missingSamples = SAMPLE_BOOKS.filter((s) => !existingIds.has(s.id));
    return [...saved, ...missingSamples];
  });
  const [removedBooks, setRemovedBooks] = useState<Book[]>(() =>
    loadJson<Book[]>(REMOVED_BOOKS_KEY, []).filter((b) => !isStaleSample(b))
  );
  const [categories, setCategories] = useState<BookCategory[]>(() =>
    loadJson<BookCategory[]>(CATEGORIES_KEY, [])
  );
  const [activeBookId, setActiveBookId] = useState<string | null>(null);

  const [settings, setSettings] = useState<ReaderSettings>(() => {
    const merged = {
      ...DEFAULT_SETTINGS,
      ...loadJson<Partial<ReaderSettings>>(SETTINGS_STORAGE_KEY, {}),
    };
    // Page-curl animation was removed in v3.2 — coerce old choices to slide.
    if ((merged as { pageTurnAnimation?: string }).pageTurnAnimation === 'curl') {
      merged.pageTurnAnimation = 'slide';
    }
    return merged;
  });

  const [isControllerModalOpen, setIsControllerModalOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const readerRef = useRef<ReaderViewHandle>(null);
  const [scrollDeltaY, setScrollDeltaY] = useState(0);

  // ---- persistence ------------------------------------------------------
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }, [settings]);
  useEffect(() => {
    try {
      localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(books));
    } catch (e) {
      console.warn('LocalStorage limit reached or serialization issue:', e);
    }
  }, [books]);
  useEffect(() => {
    try {
      localStorage.setItem(REMOVED_BOOKS_KEY, JSON.stringify(removedBooks));
    } catch (e) {
      console.warn('Failed to persist removed books:', e);
    }
  }, [removedBooks]);
  useEffect(() => {
    try {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    } catch (e) {
      console.warn('Failed to persist categories:', e);
    }
  }, [categories]);

  // Document title per language / book.
  useEffect(() => {
    const brand = lang === 'zh' ? '掌上阅读器 Handheld Reader' : 'Handheld Reader';
    document.title = activeBookId
      ? `${books.find((b) => b.id === activeBookId)?.title || ''} · ${brand}`
      : brand;
  }, [lang, activeBookId, books]);

  // Immersive fullscreen (Android bars) follows the setting.
  useEffect(() => {
    applyImmersiveMode(settings.immersiveMode).catch(() => {});
  }, [settings.immersiveMode]);
  useEffect(() => {
    if (!settings.immersiveMode) return;
    let timer: number | null = null;
    const reapply = (delay = 200) => {
      if (document.hidden) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        applyImmersiveMode(true).catch(() => {});
      }, delay);
    };
    const onFocus = () => reapply(150);
    const onVisible = () => reapply(200);
    const onResize = () => reapply(150);
    const onPointer = () => reapply(450);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('resize', onResize);
    window.addEventListener('pointerup', onPointer, { passive: true });
    // Android sometimes silently restores the bars (keyboard, screenshots,
    // other apps). A low-frequency re-apply keeps immersive mode stable.
    const interval = window.setInterval(() => {
      if (!document.hidden) applyImmersiveMode(true).catch(() => {});
    }, 4000);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointerup', onPointer);
    };
  }, [settings.immersiveMode]);

  // Global UI scale: scale the whole chrome (rem-based utilities) so text and
  // controls stay legible on small handheld screens. The reading canvas uses
  // explicit px font sizes and is unaffected.
  useEffect(() => {
    const px = UI_SCALE_PX[settings.uiScale] || 18;
    document.documentElement.style.fontSize = `${px}px`;
  }, [settings.uiScale]);

  // Tell the WebView which colour scheme we render ourselves. This prevents
  // Android's forced-dark from inverting the chrome (which made night mode
  // render with unreadable black-on-black text on some devices).
  useEffect(() => {
    document.documentElement.style.colorScheme = settings.uiTheme === 'day' ? 'light' : 'dark';
  }, [settings.uiTheme]);

  // Physical panel type (best effort) used to guard the OLED pure-black theme.
  const resolvedPanel = resolvePanelType(settings.screenPanel);
  const [oledWarning, setOledWarning] = useState(false);

  // First run: tutorial.
  useEffect(() => {
    try {
      if (localStorage.getItem(TUTORIAL_DONE_KEY) === '1') return;
      const timer = window.setTimeout(() => setIsTutorialOpen(true), 350);
      return () => window.clearTimeout(timer);
    } catch {
      return;
    }
  }, []);

  const markTutorialDone = useCallback(() => {
    try {
      localStorage.setItem(TUTORIAL_DONE_KEY, '1');
    } catch {
      /* ignore */
    }
    setIsTutorialOpen(false);
  }, []);

  const openTutorial = useCallback(() => {
    setIsSettingsDrawerOpen(false);
    setIsTutorialOpen(true);
  }, []);

  const activeBook = books.find((b) => b.id === activeBookId);

  const handleUpdateBook = useCallback(
    (updated: Partial<Book>) => {
      if (!activeBookId) return;
      setBooks((prev) =>
        prev.map((b) =>
          b.id === activeBookId ? { ...b, ...updated, lastReadTimestamp: Date.now() } : b
        )
      );
    },
    [activeBookId]
  );

  const handleImportBooks = useCallback((list: Book[]) => {
    if (!list.length) return;
    setBooks((prev) => [...list, ...prev]);
    // A single import opens the book straight away; a batch just fills the shelf.
    if (list.length === 1) setActiveBookId(list[0].id);
  }, []);

  const canUseOled = resolvedPanel === 'oled';

  // Never leave the reader on the pure-black OLED theme on a non-OLED panel:
  // it makes the screen appear completely dark/black on LCD handhelds.
  useEffect(() => {
    if (canUseOled) return;
    setSettings((prev) => (prev.theme === 'oled' ? { ...prev, theme: 'dark' } : prev));
  }, [canUseOled]);

  const updateSettings = useCallback(
    (newPartial: Partial<ReaderSettings>) => {
      if (newPartial.theme === 'oled' && !canUseOled) {
        setOledWarning(true);
        const { theme: _blocked, ...rest } = newPartial;
        setSettings((prev) => ({ ...prev, ...rest }));
        return;
      }
      setSettings((prev) => ({ ...prev, ...newPartial }));
    },
    [canUseOled]
  );

  const cycleTheme = useCallback(() => {
    const themeCycle: ReaderTheme[] = ['oled', 'dark', 'sepia', 'paper', 'retro', 'gba', 'gbp'];
    setSettings((prev) => {
      const idx = themeCycle.indexOf(prev.theme);
      let next = themeCycle[(idx + 1) % themeCycle.length];
      if (next === 'oled' && !canUseOled) next = 'dark';
      return { ...prev, theme: next };
    });
  }, [canUseOled]);

  /* ---------------- category & deletion ops ---------------- */
  const handleCreateCategory = useCallback((name: string) => {
    setCategories((prev) => [
      ...prev,
      { id: `cat_${Date.now()}`, name, createdAt: Date.now() },
    ]);
  }, []);

  const handleRenameCategory = useCallback((id: string, name: string) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  }, []);

  const handleDeleteCategory = useCallback(
    (id: string) => {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setBooks((prev) => prev.map((b) => (b.categoryId === id ? { ...b, categoryId: '' } : b)));
    },
    []
  );

  const handleAssignCategory = useCallback((bookId: string, categoryId: string) => {
    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, categoryId } : b))
    );
  }, []);

  const releaseBookBlobs = useCallback((b: Book) => {
    try {
      const urls: string[] = [];
      if (b.coverUrl && b.coverUrl.startsWith('blob:')) urls.push(b.coverUrl);
      b.comicPages?.forEach((p) => {
        if (p.imageUrl.startsWith('blob:')) urls.push(p.imageUrl);
      });
      urls.forEach((u) => URL.revokeObjectURL(u));
    } catch {
      /* ignore */
    }
  }, []);

  /** Remove from shelf but keep the book data for later restore. */
  const handleRemoveBook = useCallback((bookId: string) => {
    setBooks((prev) => {
      const target = prev.find((b) => b.id === bookId);
      if (target) {
        setRemovedBooks((r) => [target, ...r]);
      }
      return prev.filter((b) => b.id !== bookId);
    });
    setActiveBookId((cur) => (cur === bookId ? null : cur));
  }, []);

  const handleRestoreBook = useCallback((bookId: string) => {
    setRemovedBooks((prev) => {
      const target = prev.find((b) => b.id === bookId);
      if (target) {
        setBooks((list) => [target, ...list.filter((b) => b.id !== bookId)]);
      }
      return prev.filter((b) => b.id !== bookId);
    });
  }, []);

  /** Delete the local file data entirely (both shelf + removed). */
  const handleDeleteBookFile = useCallback(
    (bookId: string) => {
      setBooks((prev) => {
        const target = prev.find((b) => b.id === bookId);
        if (target) releaseBookBlobs(target);
        return prev.filter((b) => b.id !== bookId);
      });
      setRemovedBooks((prev) => {
        const target = prev.find((b) => b.id === bookId);
        if (target) releaseBookBlobs(target);
        return prev.filter((b) => b.id !== bookId);
      });
      setActiveBookId((cur) => (cur === bookId ? null : cur));
      dropBookFile(bookId).catch(() => {});
    },
    [releaseBookBlobs]
  );

  const handleToggleUiTheme = useCallback(() => {
    setSettings((prev) => ({ ...prev, uiTheme: prev.uiTheme === 'night' ? 'day' : 'night' }));
  }, []);

  // Rebuild object URLs (covers / comic pages / chapter images) for imported
  // EPUB & CBZ books from their persisted source files, and re-parse TXT books
  // produced by an older parser so paragraph / chapter fixes reach books that
  // are already on the shelf.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const targets = [...books, ...removedBooks].filter(
        (b) =>
          b.format === 'epub' ||
          b.format === 'cbz' ||
          (b.format === 'txt' && b.parserRevision !== TXT_PARSER_REVISION)
      );
      for (const b of targets) {
        if (cancelled) return;
        try {
          const blob = await getBookFile(b.id);
          if (!blob) continue;
          let parsed: Book;
          if (b.format === 'cbz') {
            parsed = await parseCbz(await blob.arrayBuffer(), b.title);
          } else if (b.format === 'epub') {
            parsed = await parseEpub(await blob.arrayBuffer(), b.title);
          } else {
            parsed = parseTxt(await blob.text(), b.title, b.author);
          }

          // A parser upgrade can change the chapter list of a TXT book. Map
          // the old reading position onto the new structure instead of
          // jumping to an unrelated chapter.
          const oldChapterCount = Math.max(1, b.chapters?.length || 1);
          const newChapterCount = Math.max(1, parsed.chapters?.length || 1);
          const structureChanged = b.format === 'txt' && oldChapterCount !== newChapterCount;
          const oldPageCount = Math.max(1, b.measuredChapterPages?.[b.currentChapterIndex] || 1);
          const progress =
            (b.currentChapterIndex + Math.min(0.999, (b.readerPage ?? 0) / oldPageCount)) /
            oldChapterCount;
          const chapterIndex = structureChanged
            ? Math.min(newChapterCount - 1, Math.max(0, Math.floor(progress * newChapterCount)))
            : b.currentChapterIndex;

          const merged: Book = {
            ...b,
            ...parsed,
            id: b.id,
            format: b.format,
            currentChapterIndex: chapterIndex,
            currentPage: structureChanged ? chapterIndex + 1 : b.currentPage,
            readerPage: structureChanged ? 0 : b.readerPage,
            bookmarks: b.bookmarks,
            categoryId: b.categoryId,
            measuredChapterPages: structureChanged ? [] : b.measuredChapterPages,
            lastReadTimestamp: b.lastReadTimestamp,
          };
          setBooks((prev) => prev.map((x) => (x.id === b.id ? merged : x)));
          setRemovedBooks((prev) => prev.map((x) => (x.id === b.id ? merged : x)));
        } catch (e) {
          console.warn('Failed to rehydrate book file:', b.id, e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- B double-press exit ---------------- */
  const lastBackPressRef = useRef(0);
  const backHintTimerRef = useRef<number | null>(null);
  const [backHint, setBackHint] = useState<BackHint | null>(null);

  const clearBackHint = useCallback(() => {
    if (backHintTimerRef.current) {
      window.clearTimeout(backHintTimerRef.current);
      backHintTimerRef.current = null;
    }
    setBackHint(null);
    lastBackPressRef.current = 0;
  }, []);

  const requestExitBook = useCallback(() => {
    const now = Date.now();
    const interval = Math.max(250, settings.backDoublePressMs || 800);
    if (now - lastBackPressRef.current <= interval) {
      clearBackHint();
      setActiveBookId(null);
      return;
    }
    lastBackPressRef.current = now;
    const hint: BackHint = { text: t('back.pressAgain'), id: now };
    setBackHint(hint);
    if (backHintTimerRef.current) window.clearTimeout(backHintTimerRef.current);
    backHintTimerRef.current = window.setTimeout(() => {
      setBackHint((prev) => (prev && prev.id === hint.id ? null : prev));
      lastBackPressRef.current = 0;
      backHintTimerRef.current = null;
    }, Math.max(1400, interval + 700));
  }, [settings.backDoublePressMs, clearBackHint, t]);

  // Gamepad / keyboard action dispatcher
  const handleGamepadAction = useCallback(
    (action: ReaderAction) => {
      if (isControllerModalOpen) return;
      switch (action) {
        case 'nextPage':
          if (activeBook && readerRef.current) readerRef.current.nextPage();
          break;
        case 'prevPage':
          if (activeBook && readerRef.current) readerRef.current.prevPage();
          break;
        case 'toggleDistractionFree':
          setSettings((prev) => ({ ...prev, distractionFree: !prev.distractionFree }));
          break;
        case 'toggleMenu':
          // Start behaviour: closed -> open the in-reading menu; menu open
          // -> jump straight into the settings screen; settings open -> close.
          if (isSettingsDrawerOpen) {
            setIsSettingsDrawerOpen(false);
          } else if (isTocOpen) {
            setIsTocOpen(false);
          } else if (activeBook && readerRef.current) {
            if (readerRef.current.isMenuOpen()) {
              readerRef.current.closeMenu();
              setIsSettingsDrawerOpen(true);
            } else {
              readerRef.current.toggleMenu();
            }
          }
          break;
        case 'toggleToc':
          if (activeBook) {
            if (isTocOpen) setIsTocOpen(false);
            else {
              readerRef.current?.closeMenu();
              setIsTocOpen(true);
            }
          }
          break;
        case 'zoomIn':
          setSettings((prev) => ({ ...prev, fontSize: Math.min(34, prev.fontSize + 2) }));
          break;
        case 'zoomOut':
          setSettings((prev) => ({ ...prev, fontSize: Math.max(12, prev.fontSize - 2) }));
          break;
        case 'scrollDown':
          readerRef.current?.scrollBy(120);
          break;
        case 'scrollUp':
          readerRef.current?.scrollBy(-120);
          break;
        case 'toggleTheme':
          cycleTheme();
          break;
        case 'bookmark':
          if (activeBook) {
            const target =
              activeBook.format === 'cbz' ? activeBook.currentPage : activeBook.currentChapterIndex;
            const exists = activeBook.bookmarks.includes(target);
            const updated = exists
              ? activeBook.bookmarks.filter((b) => b !== target)
              : [...activeBook.bookmarks, target];
            handleUpdateBook({ bookmarks: updated });
          }
          break;
        case 'backToLibrary':
          if (isSettingsDrawerOpen) {
            setIsSettingsDrawerOpen(false);
            lastBackPressRef.current = 0;
          } else if (isTocOpen) {
            setIsTocOpen(false);
            lastBackPressRef.current = 0;
          } else if (activeBook && readerRef.current) {
            if (readerRef.current.isMenuOpen()) {
              readerRef.current.closeMenu();
              lastBackPressRef.current = 0;
            } else {
              requestExitBook();
            }
          }
          break;
      }
    },
    [
      activeBook,
      isControllerModalOpen,
      isSettingsDrawerOpen,
      isTocOpen,
      cycleTheme,
      handleUpdateBook,
      requestExitBook,
    ]
  );

  // Dual-binding conflict handling (recording page).
  const [conflict, setConflict] = useState<{
    target: { action: ReaderAction; slot: 'primary' | 'secondary' };
    input: string;
    other: ReaderAction;
  } | null>(null);

  const profileProbeRef = useRef<ControllerProfile | null>(null);
  const doRebindRef = useRef<(action: ReaderAction, slot: 'primary' | 'secondary', inputId: string) => void>(
    () => {}
  );

  const handleRecordingPress = useCallback(
    (target: { action: ReaderAction; slot: 'primary' | 'secondary' }, inputId: string) => {
      const prof = profileProbeRef.current;
      if (!prof) return;
      const other = findDuplicateAction(prof, target.action, inputId);
      if (other) {
        setConflict({ target, input: inputId, other });
      } else {
        doRebindRef.current(target.action, target.slot, inputId);
      }
    },
    []
  );

  const handleConflictConfirm = useCallback(() => {
    setConflict((cur) => {
      if (!cur) return cur;
      const prof = profileProbeRef.current;
      if (!prof) return cur;
      const cleared = clearInputBinding(prof, cur.input);
      const next = withBinding(cleared, cur.target.action, cur.target.slot, cur.input);
      updateProfileRef.current(next);
      return null;
    });
  }, []);

  const handleConflictCancel = useCallback(() => setConflict(null), []);

  const updateProfileRef = useRef<(p: ControllerProfile) => void>(() => {});

  const {
    profile,
    updateProfile,
    rebindAction,
    recordingTarget,
    setRecordingTarget,
    connectedGamepadName,
    pressedInputs,
    presetProfiles,
  } = useGamepad({
    onAction: handleGamepadAction,
    onRecordingPress: handleRecordingPress,
    onScroll: (deltaY) => {
      setScrollDeltaY(deltaY);
      setTimeout(() => setScrollDeltaY(0), 16);
    },
    onLongPressB: () => {
      // Long-press B leaves the button-settings / reading-settings screens.
      setIsControllerModalOpen(false);
      setIsSettingsDrawerOpen(false);
    },
    enabled: true,
  });

  // Keep latest profile / committers reachable from the recording callback.
  profileProbeRef.current = profile;
  updateProfileRef.current = updateProfile;
  doRebindRef.current = (action, slot, inputId) => {
    updateProfile(withBinding(profile, action, slot, inputId));
  };

  const isDay = settings.uiTheme === 'day';

  return (
    <div
      className={`w-full h-full font-sans overflow-hidden ${
        isDay ? 'ui-day ' : 'ui-night '
      }${isDay ? 'bg-neutral-200 text-neutral-900' : 'bg-neutral-950 text-neutral-100'}`}
    >
      {activeBook ? (
        <motion.div
          key="reader"
          className="w-full h-full"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          <ReaderView
            ref={readerRef}
            book={activeBook}
            settings={settings}
            profile={profile}
            backHint={backHint}
            onUpdateBook={handleUpdateBook}
            onOpenSettings={() => setIsSettingsDrawerOpen(true)}
            onOpenToc={() => setIsTocOpen(true)}
            onOpenControllerModal={() => setIsControllerModalOpen(true)}
            onToggleDistractionFree={() =>
              updateSettings({ distractionFree: !settings.distractionFree })
            }
            onBackToLibrary={() => {
              clearBackHint();
              setActiveBookId(null);
            }}
            scrollDeltaY={scrollDeltaY}
          />
        </motion.div>
      ) : (
        <LibraryView
          books={books}
          removedBooks={removedBooks}
          categories={categories}
          uiTheme={settings.uiTheme}
          profile={profile}
          connectedGamepadName={connectedGamepadName}
          pressedInputs={pressedInputs}
          onSelectBook={(b) => {
            clearBackHint();
            setActiveBookId(b.id);
          }}
          onImportBooks={handleImportBooks}
          onOpenControllerModal={() => setIsControllerModalOpen(true)}
          onOpenTutorial={openTutorial}
          onToggleUiTheme={handleToggleUiTheme}
          onCreateCategory={handleCreateCategory}
          onRenameCategory={handleRenameCategory}
          onDeleteCategory={handleDeleteCategory}
          onAssignCategory={handleAssignCategory}
          onRemoveBook={handleRemoveBook}
          onRestoreBook={handleRestoreBook}
          onDeleteBookFile={handleDeleteBookFile}
        />
      )}

      <GamepadControllerModal
        isOpen={isControllerModalOpen}
        onClose={() => {
          setIsControllerModalOpen(false);
          setRecordingTarget(null);
        }}
        profile={profile}
        onUpdateProfile={updateProfile}
        recordingTarget={recordingTarget}
        onStartRecording={setRecordingTarget}
        connectedGamepadName={connectedGamepadName}
        pressedInputs={pressedInputs}
        presetProfiles={presetProfiles}
      />

      <QuickSettingsDrawer
        isOpen={isSettingsDrawerOpen}
        onClose={() => setIsSettingsDrawerOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        isComic={activeBook?.format === 'cbz'}
        onOpenTutorial={openTutorial}
      />

      <TutorialModal isOpen={isTutorialOpen} onClose={markTutorialDone} profile={profile} />

      {/* Dual-binding conflict prompt */}
      {conflict && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-900 border border-amber-500/50 rounded-3xl shadow-2xl p-6 text-neutral-100 space-y-4">
            <h4 className="font-bold text-base flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {t('ctrl.duplicateTitle')}
            </h4>
            <p className="text-xs text-neutral-300 leading-relaxed">{t('ctrl.duplicateHint')}</p>
            <p className="text-xs text-neutral-400 font-mono">
              {conflict.input} → {conflict.target.action}（
              {(() => {
                const k = `ctrl.action_${conflict.other}` as never;
                const v = t(k as never);
                return v === k ? conflict.other : v;
              })()}
              ）
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleConflictCancel}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConflictConfirm}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Non-OLED panel guard: the pure-black OLED theme goes completely dark
          on LCD handhelds, so it is blocked unless the panel is OLED. */}
      {oledWarning && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-6 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-900 border border-amber-500/50 rounded-3xl shadow-2xl p-6 text-neutral-100 space-y-4">
            <h4 className="font-bold text-base flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {t('settings.oledBlockedTitle')}
            </h4>
            <p className="text-sm text-neutral-300 leading-relaxed">
              {t('settings.oledBlockedDesc')}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setSettings((prev) => ({ ...prev, screenPanel: 'oled' }));
                  setOledWarning(false);
                }}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300"
              >
                {t('settings.oledOverride')}
              </button>
              <button
                onClick={() => setOledWarning(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <OfflineIndicator />

      {activeBook && (
        <TableOfContentsModal
          isOpen={isTocOpen}
          onClose={() => setIsTocOpen(false)}
          title={activeBook.title}
          chapters={activeBook.chapters}
          comicPages={activeBook.comicPages}
          currentIndex={
            activeBook.format === 'cbz'
              ? activeBook.currentPage - 1
              : activeBook.currentChapterIndex
          }
          onSelectChapter={(index) => {
            if (activeBook.format === 'cbz') {
              handleUpdateBook({ currentPage: index + 1 });
            } else {
              // The in-chapter page belongs to the chapter we are leaving;
              // carrying it over would open the new chapter on a phantom
              // page (and swallow the next page-turn). Re-selecting the
              // current chapter keeps its position.
              const chapterChanged = index !== activeBook.currentChapterIndex;
              handleUpdateBook({
                currentChapterIndex: index,
                currentPage: index + 1,
                ...(chapterChanged ? { readerPage: 0 } : {}),
              });
            }
          }}
          bookmarks={activeBook.bookmarks}
          onToggleBookmark={(index) => {
            const exists = activeBook.bookmarks.includes(index);
            const updated = exists
              ? activeBook.bookmarks.filter((b) => b !== index)
              : [...activeBook.bookmarks, index];
            handleUpdateBook({ bookmarks: updated });
          }}
        />
      )}
    </div>
  );
}
