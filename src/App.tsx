import React, { useState, useEffect, useCallback } from 'react';
import {
  Book,
  ReaderSettings,
  ReaderAction,
  AspectRatio,
  ReaderTheme,
} from './types';
import { SAMPLE_BOOKS } from './data/sampleBooks';
import { useGamepad } from './hooks/useGamepad';
import { LibraryView } from './components/LibraryView';
import { ReaderView } from './components/ReaderView';
import { GamepadControllerModal } from './components/GamepadControllerModal';
import { QuickSettingsDrawer } from './components/QuickSettingsDrawer';
import { TableOfContentsModal } from './components/TableOfContentsModal';

const SETTINGS_STORAGE_KEY = 'handheld_reader_settings';
const BOOKS_STORAGE_KEY = 'handheld_reader_books';

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18,
  lineHeight: 1.7,
  fontFamily: 'serif',
  theme: 'oled',
  aspectRatio: 'native',
  readingMode: 'paginated',
  distractionFree: false,
  marginSize: 'balanced',
  pageTurnAnimation: 'instant',
  showHudTimeAndBattery: true,
  screenBezelPreview: false,
  brightness: 100,
  warmth: 0,
};

export default function App() {
  // Books list
  const [books, setBooks] = useState<Book[]>(() => {
    try {
      const saved = localStorage.getItem(BOOKS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with sample books to ensure built-in samples remain intact
        const existingIds = new Set(parsed.map((b: Book) => b.id));
        const missingSamples = SAMPLE_BOOKS.filter((s) => !existingIds.has(s.id));
        return [...parsed, ...missingSamples];
      }
    } catch (e) {
      console.error('Failed to load books from localStorage:', e);
    }
    return SAMPLE_BOOKS;
  });

  // Current active book ID
  const [activeBookId, setActiveBookId] = useState<string | null>(null);

  // Settings
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Modals state
  const [isControllerModalOpen, setIsControllerModalOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);

  // Continuous scroll delta passed down to active reader
  const [scrollDeltaY, setScrollDeltaY] = useState(0);

  // Save settings whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }, [settings]);

  // Save books state (reading progress, bookmarks)
  useEffect(() => {
    try {
      // Don't save huge blob urls in local storage if not needed
      const serialized = books.map((b) => ({
        ...b,
        // Keep raw text, chapters, comic pages structure
      }));
      localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(serialized));
    } catch (e) {
      console.warn('LocalStorage limit reached or serialization issue:', e);
    }
  }, [books]);

  const activeBook = books.find((b) => b.id === activeBookId);

  // Update a book's attributes (e.g. currentPage, bookmarks)
  const handleUpdateBook = useCallback((updated: Partial<Book>) => {
    if (!activeBookId) return;
    setBooks((prev) =>
      prev.map((b) => (b.id === activeBookId ? { ...b, ...updated, lastReadTimestamp: Date.now() } : b))
    );
  }, [activeBookId]);

  // Add imported book
  const handleImportBook = useCallback((newBook: Book) => {
    setBooks((prev) => [newBook, ...prev]);
    setActiveBookId(newBook.id);
  }, []);

  const updateSettings = useCallback((newPartial: Partial<ReaderSettings>) => {
    setSettings((prev) => ({ ...prev, ...newPartial }));
  }, []);

  // Cycle themes helper for gamepad controller shortcut
  const cycleTheme = useCallback(() => {
    const themeCycle: ReaderTheme[] = ['oled', 'dark', 'sepia', 'paper', 'retro'];
    setSettings((prev) => {
      const idx = themeCycle.indexOf(prev.theme);
      const nextTheme = themeCycle[(idx + 1) % themeCycle.length];
      return { ...prev, theme: nextTheme };
    });
  }, []);

  // Gamepad action dispatcher
  const handleGamepadAction = useCallback(
    (action: ReaderAction) => {
      // If modal is open, don't trigger background reader actions
      if (isControllerModalOpen) return;

      switch (action) {
        case 'nextPage':
          if (activeBook) {
            const isComic = activeBook.format === 'cbz';
            if (isComic) {
              const max = activeBook.comicPages?.length || 1;
              if (activeBook.currentPage < max) {
                handleUpdateBook({ currentPage: activeBook.currentPage + 1 });
              }
            } else {
              const max = activeBook.chapters?.length || 1;
              if (activeBook.currentChapterIndex < max - 1) {
                handleUpdateBook({
                  currentChapterIndex: activeBook.currentChapterIndex + 1,
                  currentPage: activeBook.currentChapterIndex + 2,
                });
              }
            }
          }
          break;

        case 'prevPage':
          if (activeBook) {
            const isComic = activeBook.format === 'cbz';
            if (isComic) {
              if (activeBook.currentPage > 1) {
                handleUpdateBook({ currentPage: activeBook.currentPage - 1 });
              }
            } else {
              if (activeBook.currentChapterIndex > 0) {
                handleUpdateBook({
                  currentChapterIndex: activeBook.currentChapterIndex - 1,
                  currentPage: activeBook.currentChapterIndex,
                });
              }
            }
          }
          break;

        case 'toggleDistractionFree':
          setSettings((prev) => ({ ...prev, distractionFree: !prev.distractionFree }));
          break;

        case 'toggleMenu':
          setIsSettingsDrawerOpen((prev) => !prev);
          break;

        case 'toggleToc':
          if (activeBook) {
            setIsTocOpen((prev) => !prev);
          }
          break;

        case 'zoomIn':
          setSettings((prev) => ({ ...prev, fontSize: Math.min(34, prev.fontSize + 2) }));
          break;

        case 'zoomOut':
          setSettings((prev) => ({ ...prev, fontSize: Math.max(12, prev.fontSize - 2) }));
          break;

        case 'toggleTheme':
          cycleTheme();
          break;

        case 'bookmark':
          if (activeBook) {
            const target = activeBook.format === 'cbz' ? activeBook.currentPage : activeBook.currentChapterIndex;
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
          } else if (isTocOpen) {
            setIsTocOpen(false);
          } else if (activeBookId) {
            setActiveBookId(null);
          }
          break;
      }
    },
    [activeBook, activeBookId, isControllerModalOpen, isSettingsDrawerOpen, isTocOpen, cycleTheme, handleUpdateBook]
  );

  // Hook into Gamepad polling
  const {
    profile,
    updateProfile,
    rebindAction,
    recordingAction,
    setRecordingAction,
    connectedGamepadName,
    pressedInputs,
    presetProfiles,
  } = useGamepad({
    onAction: handleGamepadAction,
    onScroll: (deltaY) => {
      setScrollDeltaY(deltaY);
      // Reset tick
      setTimeout(() => setScrollDeltaY(0), 16);
    },
    enabled: true,
  });

  return (
    <div className="w-full h-full min-h-screen bg-neutral-950 font-sans text-neutral-100 overflow-hidden">
      {activeBook ? (
        <ReaderView
          book={activeBook}
          settings={settings}
          profile={profile}
          onUpdateBook={handleUpdateBook}
          onOpenSettings={() => setIsSettingsDrawerOpen(true)}
          onOpenToc={() => setIsTocOpen(true)}
          onOpenControllerModal={() => setIsControllerModalOpen(true)}
          onToggleDistractionFree={() =>
            updateSettings({ distractionFree: !settings.distractionFree })
          }
          onBackToLibrary={() => setActiveBookId(null)}
          scrollDeltaY={scrollDeltaY}
        />
      ) : (
        <LibraryView
          books={books}
          onSelectBook={(b) => {
            setActiveBookId(b.id);
            // Default to distraction-free if desired or standard
          }}
          onImportBook={handleImportBook}
          aspectRatio={settings.aspectRatio}
          onChangeAspectRatio={(ratio: AspectRatio) => updateSettings({ aspectRatio: ratio })}
          showBezel={settings.screenBezelPreview}
          onToggleBezel={(show) => updateSettings({ screenBezelPreview: show })}
          profile={profile}
          onOpenControllerModal={() => setIsControllerModalOpen(true)}
          connectedGamepadName={connectedGamepadName}
          pressedInputs={pressedInputs}
        />
      )}

      {/* Gamepad Controller Mapping Modal */}
      <GamepadControllerModal
        isOpen={isControllerModalOpen}
        onClose={() => {
          setIsControllerModalOpen(false);
          setRecordingAction(null);
        }}
        profile={profile}
        onUpdateProfile={updateProfile}
        onRebindAction={rebindAction}
        recordingAction={recordingAction}
        onStartRecording={setRecordingAction}
        connectedGamepadName={connectedGamepadName}
        pressedInputs={pressedInputs}
        presetProfiles={presetProfiles}
      />

      {/* Quick Settings Drawer */}
      <QuickSettingsDrawer
        isOpen={isSettingsDrawerOpen}
        onClose={() => setIsSettingsDrawerOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        isComic={activeBook?.format === 'cbz'}
      />

      {/* Table of Contents Modal */}
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
              handleUpdateBook({
                currentChapterIndex: index,
                currentPage: index + 1,
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
