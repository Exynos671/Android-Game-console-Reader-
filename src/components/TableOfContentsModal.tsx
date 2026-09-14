import React from 'react';
import { Book, Bookmark } from 'lucide-react';
import { Chapter, ComicPage } from '../types';
import { useI18n } from '../i18n';

interface TableOfContentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  chapters?: Chapter[];
  comicPages?: ComicPage[];
  currentIndex: number;
  onSelectChapter: (index: number) => void;
  bookmarks: number[];
  onToggleBookmark: (index: number) => void;
}

export const TableOfContentsModal: React.FC<TableOfContentsModalProps> = ({
  isOpen,
  onClose,
  title,
  chapters,
  comicPages,
  currentIndex,
  onSelectChapter,
  bookmarks,
  onToggleBookmark,
}) => {
  const { t, tf } = useI18n();
  if (!isOpen) return null;

  const isComic = Boolean(comicPages && comicPages.length > 0);
  const itemsCount = isComic ? comicPages!.length : (chapters?.length || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-neutral-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <Book className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base">
                {isComic ? t('toc.comicTitle') : t('toc.title')}
              </h3>
              <p className="text-xs text-neutral-400 truncate max-w-sm">{title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-mono px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
          >
            {t('toc.closeEsc')}
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {isComic
            ? comicPages!.map((page, idx) => {
                const isActive = currentIndex === idx;
                const isBookmarked = bookmarks.includes(idx + 1);

                return (
                  <div
                    key={page.pageNumber}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/15 border-amber-500/60 text-amber-300'
                        : 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700'
                    }`}
                    onClick={() => {
                      onSelectChapter(idx);
                      onClose();
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                        {String(page.pageNumber).padStart(2, '0')}
                      </span>
                      <span className="text-sm font-semibold">
                        {page.title || tf('toc.pageLabel', { n: page.pageNumber })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBookmark(idx + 1);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isBookmarked ? 'text-amber-400' : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                        title={t('toc.bookmarkTitle')}
                      >
                        <Bookmark className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} />
                      </button>
                      {isActive && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400 text-neutral-950 font-bold">
                          {t('toc.current')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            : chapters?.map((chap, idx) => {
                const isActive = currentIndex === idx;
                const isBookmarked = bookmarks.includes(idx);

                return (
                  <div
                    key={chap.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/15 border-amber-500/60 text-amber-300'
                        : 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700'
                    }`}
                    onClick={() => {
                      onSelectChapter(idx);
                      onClose();
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-neutral-400 w-6">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <span className="text-sm font-semibold">{chap.title}</span>
                        {chap.wordCount && (
                          <span className="block text-[11px] text-neutral-500 mt-0.5">
                            {tf('toc.words', { count: chap.wordCount.toLocaleString() })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBookmark(idx);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isBookmarked ? 'text-amber-400' : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                        title={t('toc.bookmarkTitle')}
                      >
                        <Bookmark className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} />
                      </button>
                      {isActive && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400 text-neutral-950 font-bold">
                          {t('toc.reading')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950 text-xs text-neutral-400 flex items-center justify-between">
          <span>{tf('toc.totalSections', { count: itemsCount })}</span>
          <span>{tf('toc.bookmarksSaved', { count: bookmarks.length })}</span>
        </div>
      </div>
    </div>
  );
};
