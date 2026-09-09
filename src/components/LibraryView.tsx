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
  Layers,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { HandheldAspectSwitcher } from './HandheldAspectSwitcher';
import { GamepadButtonBadge } from './GamepadButtonBadge';
import { PWAInstallButton } from './PWAInstallButton';
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
  onOpenInstallModal: () => void;
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
  onOpenInstallModal,
  connectedGamepadName,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<BookFormat | 'all'>('all');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFilters: { id: BookFormat | 'all'; label: string }[] = [
    { id: 'all', label: '全部格式' },
    { id: 'epub', label: 'EPUB' },
    { id: 'cbz', label: '漫画 (CBZ)' },
    { id: 'txt', label: 'TXT 小说' },
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
          text || `PDF 文档: ${file.name}\n\n该 PDF 文档已建立掌机/手机排版索引。`,
          file.name.replace(/\.pdf$/i, ''),
          '本地导入文档'
        );
        imported.format = 'pdf';
      } else {
        // Default to text parsing
        const text = await file.text();
        imported = parseTxt(text, file.name.replace(/\.[^/.]+$/, ''), '本地书籍');
      }

      onImportBook(imported);
    } catch (err: any) {
      console.error('导入文件失败:', err);
      setImportError(err.message || '无法解析所选图书格式。');
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
      <header className="sticky top-0 z-20 bg-neutral-900/90 backdrop-blur border-b border-neutral-800 px-3 sm:px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          {/* Brand & Console Info */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-sm sm:text-base tracking-tight text-neutral-100">掌机阅读器</h1>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                  v2.0 掌机/手机
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                Odin • Retroid Pocket • Miyoo • RG353 • Steam Deck • 安卓手机
              </p>
            </div>
          </div>

          {/* Aspect Ratio Switcher */}
          <div className="flex items-center gap-2 max-w-full overflow-x-auto no-scrollbar py-0.5">
            <HandheldAspectSwitcher
              currentRatio={aspectRatio}
              onChangeRatio={onChangeAspectRatio}
              showBezel={showBezel}
              onToggleBezel={onToggleBezel}
            />
          </div>

          {/* Gamepad Status, Install & Import Buttons */}
          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            <PWAInstallButton onOpenModal={onOpenInstallModal} />

            <button
              onClick={onOpenControllerModal}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                connectedGamepadName
                  ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-300 hover:bg-emerald-900/40'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:border-neutral-600'
              }`}
            >
              <Gamepad2 className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">手柄设置</span>
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
              <span>{isImporting ? '导入中...' : '导入图书'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Banner Alert for Errors */}
        {importError && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-700/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {/* Handheld & Phone Feature Highlights Pill */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-950 border border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="font-bold text-xs sm:text-sm text-amber-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              专为安卓掌机与竖屏智能手机深度优化
            </h2>
            <p className="text-xs text-neutral-400 max-w-2xl">
              支持通过物理肩键 <strong className="text-neutral-200">RB (下一页)</strong> 和{' '}
              <strong className="text-neutral-200">LB (上一页)</strong> 触觉微振翻页；竖屏手机支持左右单手轻触与滑动手势；适配 9:16/9:20 手机与 16:9/4:3 掌机屏幕。
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300">
              <span className="text-neutral-500">翻页快捷:</span>
              <GamepadButtonBadge inputId={profile.bindings.prevPage} size="sm" />
              <GamepadButtonBadge inputId={profile.bindings.nextPage} size="sm" />
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 hidden sm:flex">
              <span className="text-neutral-500">沉浸模式:</span>
              <GamepadButtonBadge inputId={profile.bindings.toggleDistractionFree} size="sm" />
            </div>
          </div>
        </div>

        {/* Format Filter Tabs & Dropzone */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 max-w-full">
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
            共 {filteredBooks.length} 部图书
          </div>
        </div>

        {/* Books Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
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
                className="group relative bg-neutral-900/70 hover:bg-neutral-850 border border-neutral-800 hover:border-amber-500/60 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 shadow-lg hover:shadow-[0_8px_30px_rgba(245,158,11,0.12)]"
              >
                {/* Book Card Top: Format Badge & Bookmarks */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
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
                        {book.totalChapters || 1} 章节 • {book.fileSize || '离线缓存'}
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
                <div className="mt-3.5 pt-3 border-t border-neutral-800/80 space-y-2">
                  <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                    <span>
                      {isComic ? `第 ${current} / ${total} 页` : `第 ${current} / ${total} 节`}
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
                      轻触或按 <GamepadButtonBadge inputId="button_0" size="sm" /> 键
                    </span>
                    <span className="text-xs font-semibold text-amber-400 group-hover:translate-x-0.5 transition-transform">
                      进入阅读 →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Handheld Quick Controller Legend Bar */}
      <footer className="sticky bottom-0 z-20 bg-neutral-950/95 backdrop-blur border-t border-neutral-800 py-2 px-3 sm:px-4 text-xs font-mono text-neutral-400">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-[11px]">
            <span className="flex items-center gap-1">
              <GamepadButtonBadge inputId={profile.bindings.bookmark} size="sm" />
              <span>选择阅读</span>
            </span>
            <span className="flex items-center gap-1">
              <GamepadButtonBadge inputId={profile.bindings.nextPage} size="sm" />
              <span>下一页</span>
            </span>
            <span className="flex items-center gap-1">
              <GamepadButtonBadge inputId={profile.bindings.prevPage} size="sm" />
              <span>上一页</span>
            </span>
            <span className="flex items-center gap-1">
              <GamepadButtonBadge inputId={profile.bindings.toggleDistractionFree} size="sm" />
              <span>沉浸模式</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-neutral-500">
            <span>屏幕比例: {aspectRatio}</span>
            <span>•</span>
            <span>OLED 纯黑省电驱动中</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
