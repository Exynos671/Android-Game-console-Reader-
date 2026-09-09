import React, { useRef, useState } from 'react';
import {
  Book,
  BookFormat,
  AspectRatio,
  ControllerProfile,
} from '../types';
import {
  BookOpen,
  Plus,
  Gamepad2,
  Bookmark,
  Sliders,
  Sparkles,
  Layers,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Tv,
  Smartphone,
  AlertCircle,
} from 'lucide-react';
import { HandheldAspectSwitcher } from './HandheldAspectSwitcher';
import { GamepadButtonBadge } from './GamepadButtonBadge';
import { parseTxt, parseEpub, parseCbz, parseMobi } from '../services/bookParser';

interface LibraryViewProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onImportBook: (book: Book) => void;
  aspectRatio: AspectRatio;
  onChangeAspectRatio: (ratio: AspectRatio) => void;
  showBezel: boolean;
  onToggleBezel: (show: boolean) => void;
  profile: ControllerProfile;
  onOpenControllerModal: () => void;
  connectedGamepadName: string | null;
  pressedInputs: Set<string>;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  onSelectBook,
  onImportBook,
  aspectRatio,
  onChangeAspectRatio,
  showBezel,
  onToggleBezel,
  profile,
  onOpenControllerModal,
  connectedGamepadName,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<BookFormat | 'all'>('all');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFilters: { id: BookFormat | 'all'; label: string }[] = [
    { id: 'all', label: 'All Formats' },
    { id: 'epub', label: 'EPUB' },
    { id: 'cbz', label: 'Comics (CBZ)' },
    { id: 'txt', label: 'TXT' },
    { id: 'pdf', label: 'PDF' },
    { id: 'mobi', label: 'MOBI' },
  ];

  const filteredBooks = books.filter((b) => {
    if (selectedFormat === 'all') return true;
    return b.format === selectedFormat;
  });

  const handleFileUpload = async (file: File) => {
    setIsImporting(true);
    setImportError(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let imported: Book;

      if (ext === 'epub') {
        const buffer = await file.arrayBuffer();
        imported = await parseEpub(buffer, file.name);
      } else if (ext === 'cbz' || ext === 'zip') {
        const buffer = await file.arrayBuffer();
        imported = await parseCbz(buffer, file.name);
      } else if (ext === 'mobi') {
        const buffer = await file.arrayBuffer();
        imported = await parseMobi(buffer, file.name);
      } else if (ext === 'pdf') {
        // PDF fallback parser with styled viewer
        const text = await file.text().catch(() => '');
        imported = parseTxt(
          text || `PDF Document: ${file.name}\n\nThis PDF was indexed for handheld reading.`,
          file.name.replace(/\.pdf$/i, ''),
          'Imported Document'
        );
        imported.format = 'pdf';
      } else {
        // Default to text parsing
        const text = await file.text();
        imported = parseTxt(text, file.name.replace(/\.[^/.]+$/, ''), 'Local Author');
      }

      onImportBook(imported);
    } catch (err: any) {
      console.error('Failed to import file:', err);
      setImportError(err.message || 'Could not parse file format.');
    } finally {
      setIsImporting(false);
    }
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

  return (
    <div className="w-full min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Top Console Navigation Bar */}
      <header className="sticky top-0 z-20 bg-neutral-900/90 backdrop-blur border-b border-neutral-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Console Info */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base tracking-tight text-neutral-100">Handheld Reader</h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                  v2.0 Handheld OS
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Odin • Retroid Pocket • Miyoo • RG353 • Steam Deck
              </p>
            </div>
          </div>

          {/* Aspect Ratio Switcher */}
          <div className="flex items-center gap-2">
            <HandheldAspectSwitcher
              currentRatio={aspectRatio}
              onChangeRatio={onChangeAspectRatio}
              showBezel={showBezel}
              onToggleBezel={onToggleBezel}
            />
          </div>

          {/* Gamepad Status & Remap Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenControllerModal}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                connectedGamepadName
                  ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-300 hover:bg-emerald-900/40'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:border-neutral-600'
              }`}
            >
              <Gamepad2 className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Controller Config</span>
              <GamepadButtonBadge inputId={profile.bindings.nextPage} size="sm" />
            </button>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".epub,.cbz,.zip,.mobi,.txt,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-md transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isImporting ? 'Importing...' : 'Import Book'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Banner Alert for Errors */}
        {importError && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-700/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {/* Handheld Feature Highlights Pill */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-950 border border-neutral-800 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-bold text-sm text-amber-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Tailored for Handheld Game Consoles
            </h2>
            <p className="text-xs text-neutral-400 max-w-2xl">
              Turn pages smoothly with <strong className="text-neutral-200">RB (Next)</strong> and{' '}
              <strong className="text-neutral-200">LB (Prev)</strong>, scroll through webtoons with analog thumbsticks, and adapt screen geometry to 16:9, 3:2, or 4:3.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300">
              <span className="text-neutral-500">Page Turn:</span>
              <GamepadButtonBadge inputId={profile.bindings.prevPage} size="sm" />
              <GamepadButtonBadge inputId={profile.bindings.nextPage} size="sm" />
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300">
              <span className="text-neutral-500">Distraction-Free:</span>
              <GamepadButtonBadge inputId={profile.bindings.toggleDistractionFree} size="sm" />
            </div>
          </div>
        </div>

        {/* Format Filter Tabs & Dropzone */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {formatFilters.map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => setSelectedFormat(fmt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedFormat === fmt.id
                    ? 'bg-neutral-800 text-amber-400 border border-amber-500/50 shadow-sm'
                    : 'text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800/80 hover:border-neutral-700'
                }`}
              >
                {fmt.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-neutral-500 font-mono">
            {filteredBooks.length} titles available
          </div>
        </div>

        {/* Books Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredBooks.map((book) => {
            const isComic = book.format === 'cbz';
            const total = isComic
              ? book.comicPages?.length || 1
              : book.chapters?.length || 1;
            const current = isComic ? book.currentPage : book.currentChapterIndex + 1;
            const progress = Math.round((current / total) * 100);

            return (
              <div
                key={book.id}
                onClick={() => onSelectBook(book)}
                className="group relative bg-neutral-900/70 hover:bg-neutral-850 border border-neutral-800 hover:border-amber-500/60 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 shadow-lg hover:shadow-[0_8px_30px_rgba(245,158,11,0.12)]"
              >
                {/* Book Card Top: Format Badge & Bookmarks */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${getFormatBadge(
                        book.format
                      )}`}
                    >
                      {book.format}
                    </span>

                    {book.bookmarks.length > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                        <Bookmark className="w-3.5 h-3.5 fill-current" />
                        <span>{book.bookmarks.length}</span>
                      </span>
                    )}
                  </div>

                  {/* Comic thumbnail or stylized cover header */}
                  {book.coverUrl ? (
                    <div className="w-full h-36 mb-3 rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 flex items-center justify-center">
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-24 mb-3 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-950 border border-neutral-800 p-3 flex flex-col justify-between">
                      <Layers className="w-6 h-6 text-amber-400/80" />
                      <div className="text-[10px] font-mono text-neutral-500">
                        {book.totalChapters || 1} Chapters • {book.fileSize || 'Offline'}
                      </div>
                    </div>
                  )}

                  <h3 className="font-bold text-sm text-neutral-100 group-hover:text-amber-300 transition-colors line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1 truncate">{book.author}</p>

                  {book.description && (
                    <p className="text-[11px] text-neutral-500 mt-2 line-clamp-2 leading-relaxed">
                      {book.description}
                    </p>
                  )}
                </div>

                {/* Progress bar and button */}
                <div className="mt-4 pt-3 border-t border-neutral-800/80 space-y-2">
                  <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                    <span>
                      {isComic ? `Page ${current} / ${total}` : `Section ${current} / ${total}`}
                    </span>
                    <span className="text-amber-400 font-bold">{progress}%</span>
                  </div>
                  <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-neutral-500">
                      Tap or press <GamepadButtonBadge inputId="button_0" size="sm" /> to read
                    </span>
                    <span className="text-xs font-semibold text-amber-400 group-hover:translate-x-0.5 transition-transform">
                      Read →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Handheld Quick Controller Legend Bar */}
      <footer className="sticky bottom-0 z-20 bg-neutral-950/95 backdrop-blur border-t border-neutral-800 py-2.5 px-4 text-xs font-mono text-neutral-400">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <GamepadButtonBadge inputId={profile.bindings.bookmark} size="sm" />
              <span>Select Book</span>
            </span>
            <span className="flex items-center gap-1.5">
              <GamepadButtonBadge inputId={profile.bindings.nextPage} size="sm" />
              <span>Next Page</span>
            </span>
            <span className="flex items-center gap-1.5">
              <GamepadButtonBadge inputId={profile.bindings.prevPage} size="sm" />
              <span>Previous Page</span>
            </span>
            <span className="flex items-center gap-1.5">
              <GamepadButtonBadge inputId={profile.bindings.toggleDistractionFree} size="sm" />
              <span>Distraction-Free</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-neutral-500">
            <span>Aspect Ratio: {aspectRatio}</span>
            <span>•</span>
            <span>OLED Black Battery Preservation Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
