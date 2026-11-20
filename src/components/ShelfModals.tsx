import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, FolderPlus, Folder, Trash2, Pencil, Archive, RotateCcw, BookOpen } from 'lucide-react';
import { Book, BookCategory } from '../types';
import { useControllerNav } from '../hooks/useControllerNav';
import { useI18n } from '../i18n';

/* ------------------------------------------------------------------ */
/*  Book actions modal: categorize / move out of shelf / delete file    */
/* ------------------------------------------------------------------ */
interface BookActionsModalProps {
  open: boolean;
  book: Book | null;
  categories: BookCategory[];
  onClose: () => void;
  onAssign: (categoryId: string) => void; // "" = none
  onRemoveFromShelf: () => void; // keeps the file, hides from shelf
  onDeleteFile: () => void; // permanent delete of the file data
  gamepadPressed?: Set<string>;
  isGamepadConnected?: boolean;
}

export const BookActionsModal: React.FC<BookActionsModalProps> = ({
  open,
  book,
  categories,
  onClose,
  onAssign,
  onRemoveFromShelf,
  onDeleteFile,
  gamepadPressed,
  isGamepadConnected,
}: BookActionsModalProps) => {
  const { t } = useI18n();
  const boxRef = useRef<HTMLDivElement>(null);
  const [confirm, setConfirm] = useState<'remove' | 'delete' | null>(null);

  useEffect(() => {
    if (open) setConfirm(null);
  }, [open, book?.id]);

  const nav = useControllerNav({
    containerRef: boxRef,
    active: open,
    gamepadPressed,
    isGamepadConnected,
    onActivate: (id) => {
      if (id.startsWith('cat:')) onAssign(id.slice(4));
      else if (id === 'act:remove') setConfirm((c) => (c === 'remove' ? null : 'remove'));
      else if (id === 'act:delete') setConfirm((c) => (c === 'delete' ? null : 'delete'));
      else if (id === 'confirm:remove') {
        onRemoveFromShelf();
      } else if (id === 'confirm:delete') {
        onDeleteFile();
      } else if (id === 'act:close') onClose();
    },
    onBack: () => {
      if (confirm) setConfirm(null);
      else onClose();
    },
    getInitialId: () => 'act:close',
  });

  if (!open || !book) return null;

  const baseRow =
    'flex items-center justify-between gap-2 p-3 rounded-xl border text-sm cursor-pointer transition-all hh-focusable';
  const idleRow = 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700 text-neutral-100';
  const dangerRow = 'border-rose-800/60 hover:border-rose-500 text-rose-300 bg-rose-950/30';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        ref={boxRef}
        className="w-full max-w-md max-h-[85vh] overflow-y-auto no-scrollbar bg-neutral-900 border border-neutral-700 rounded-3xl shadow-2xl p-5 text-neutral-100 flex flex-col gap-3"
      >
        <div className="flex items-start justify-between gap-3 pb-2 border-b border-neutral-800">
          <div className="min-w-0">
            <h3 className="font-bold text-base truncate">{book.title}</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {book.author} 路 {book.format}
            </p>
          </div>
          <button
            data-nav-id="act:close"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 hh-focusable"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5 text-amber-400" />
            {t('lib.chooseCategory')}
          </label>
          <div className="flex flex-wrap gap-2 pb-1">
            <button
              data-nav-id="cat:"
              onClick={() => onAssign('')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all hh-focusable ${
                !book.categoryId
                  ? 'bg-amber-500 text-neutral-950 border-amber-400'
                  : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {t('lib.noCategory')}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                data-nav-id={`cat:${c.id}`}
                onClick={() => onAssign(c.id)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all hh-focusable ${
                  book.categoryId === c.id
                    ? 'bg-amber-500 text-neutral-950 border-amber-400'
                    : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {confirm === null && (
          <div className="flex flex-col gap-2">
            <button
              data-nav-id="act:remove"
              onClick={() => setConfirm('remove')}
              className={`${baseRow} ${idleRow}`}
            >
              <span className="flex items-center gap-2 text-xs">
                <Archive className="w-4 h-4 text-sky-400" />
                {t('lib.removeFromShelf')}
              </span>
              <span className="text-[10px] text-neutral-500">{t('lib.removeFromShelfHint')}</span>
            </button>
            <button
              data-nav-id="act:delete"
              onClick={() => setConfirm('delete')}
              className={`${baseRow} ${dangerRow}`}
            >
              <span className="flex items-center gap-2 text-xs font-bold">
                <Trash2 className="w-4 h-4" />
                {t('lib.deleteFileTitle')}
              </span>
              <span className="text-[10px] opacity-70">{t('lib.deleteFileHint')}</span>
            </button>
          </div>
        )}

        {confirm !== null && (
          <div className="p-3 rounded-2xl border border-amber-500/50 bg-amber-950/30 space-y-3">
            <p className="text-xs text-neutral-200 leading-relaxed">
              {confirm === 'remove'
                ? t('lib.confirmRemoveDesc')
                : t('lib.confirmDeleteDesc')}
            </p>
            <div className="flex gap-2">
              <button
                data-nav-id={`confirm:${confirm}`}
                onClick={() => {
                  if (confirm === 'remove') onRemoveFromShelf();
                  else onDeleteFile();
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                  confirm === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-sky-500 hover:bg-sky-400 text-white'
                }`}
              >
                {confirm === 'remove' ? t('lib.confirmRemove') : t('lib.confirmDelete')}
              </button>
              <button
                data-nav-id="act:cancel"
                onClick={() => setConfirm(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Shelf manager: category CRUD + removed (shelf-hidden) books         */
/* ------------------------------------------------------------------ */
interface ShelfManagerModalProps {
  open: boolean;
  categories: BookCategory[];
  removedBooks: Book[];
  onClose: () => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
  onRestore: (id: string) => void;
  onDeletePermanently: (id: string) => void;
  onSelectBook: (book: Book) => void;
  gamepadPressed?: Set<string>;
  isGamepadConnected?: boolean;
}

export const ShelfManagerModal: React.FC<ShelfManagerModalProps> = ({
  open,
  categories,
  removedBooks,
  onClose,
  onCreate,
  onRename,
  onDeleteCategory,
  onRestore,
  onDeletePermanently,
  onSelectBook,
  gamepadPressed,
  isGamepadConnected,
}) => {
  const { t } = useI18n();
  const boxRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const nav = useControllerNav({
    containerRef: boxRef,
    active: open,
    gamepadPressed,
    isGamepadConnected,
    onActivate: (id) => {
      if (id === 'act:create') {
        const n = name.trim();
        if (n) onCreate(n);
        setName('');
      } else if (id === 'act:close') onClose();
      else if (id.startsWith('cat:edit:')) {
        const cid = id.slice('cat:edit:'.length);
        const c = categories.find((x) => x.id === cid);
        setEditingId(cid);
        setEditName(c?.name || '');
      } else if (id === 'cat:save') {
        if (editingId && editName.trim()) onRename(editingId, editName.trim());
        setEditingId(null);
      } else if (id.startsWith('cat:del:')) {
        onDeleteCategory(id.slice('cat:del:'.length));
      } else if (id.startsWith('rm:restore:')) {
        onRestore(id.slice('rm:restore:'.length));
      } else if (id.startsWith('rm:delete:')) {
        onDeletePermanently(id.slice('rm:delete:'.length));
      }
    },
    onBack: () => {
      if (editingId) {
        setEditingId(null);
        return;
      }
      onClose();
    },
    getInitialId: () => 'act:close',
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        ref={boxRef}
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto no-scrollbar bg-neutral-900 border border-neutral-700 rounded-3xl shadow-2xl p-5 text-neutral-100 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-neutral-800">
          <h3 className="font-bold text-base flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-amber-400" />
            {t('lib.manageTitle')}
          </h3>
          <button
            data-nav-id="act:close"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 hh-focusable"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Categories */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-neutral-400">{t('lib.categories')}</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('lib.newCategoryName')}
              className="min-w-0 grow basis-32 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-700 text-xs text-neutral-100 placeholder-neutral-500 outline-none focus:border-amber-500/60"
            />
            <button
              data-nav-id="act:create"
              onClick={() => {
                const n = name.trim();
                if (n) onCreate(n);
                setName('');
              }}
              disabled={!name.trim()}
              className="ml-auto shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold disabled:opacity-40 hh-focusable"
            >
              {t('lib.addCategory')}
            </button>
          </div>

          {categories.length === 0 ? (
            <p className="text-xs text-neutral-500 px-1">{t('lib.noCategories')}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 p-3 rounded-xl bg-neutral-950/70 border border-neutral-800"
                >
                  {editingId === c.id ? (
                    <>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1.5 rounded-lg bg-neutral-900 border border-amber-500/50 text-xs text-neutral-100 outline-none"
                        autoFocus
                      />
                      <button
                        data-nav-id="cat:save"
                        onClick={() => {
                          if (editingId && editName.trim()) onRename(editingId, editName.trim());
                          setEditingId(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-neutral-950 text-xs font-bold hh-focusable"
                      >
                        {t('common.save')}
                      </button>
                    </>
                  ) : (
                    <>
                      <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="flex-1 text-sm font-semibold truncate">{c.name}</span>
                      <button
                        data-nav-id={`cat:edit:${c.id}`}
                        onClick={() => {
                          setEditingId(c.id);
                          setEditName(c.name);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-amber-300 text-xs flex items-center gap-1 hh-focusable"
                        title={t('lib.rename')}
                      >
                        <Pencil className="w-3 h-3" />
                        {t('lib.rename')}
                      </button>
                      <button
                        data-nav-id={`cat:del:${c.id}`}
                        onClick={() => onDeleteCategory(c.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-rose-400 text-xs flex items-center gap-1 hh-focusable"
                        title={t('lib.deleteCategory')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Removed books */}
        <div className="space-y-2.5 pt-2 border-t border-neutral-800">
          <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
            <Archive className="w-3.5 h-3.5 text-sky-400" />
            {t('lib.removedBooks')}
            <span className="text-neutral-500 font-mono">({removedBooks.length})</span>
          </label>
          {removedBooks.length === 0 ? (
            <p className="text-xs text-neutral-500 px-1">{t('lib.noRemovedBooks')}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {removedBooks.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 p-3 rounded-xl bg-neutral-950/70 border border-neutral-800"
                >
                  <BookOpen className="w-4 h-4 text-neutral-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{b.title}</div>
                    <div className="text-[10px] text-neutral-500">{b.author} 路 {b.format}</div>
                  </div>
                  <button
                    data-nav-id={`rm:restore:${b.id}`}
                    onClick={() => onRestore(b.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-emerald-300 text-xs flex items-center gap-1 hh-focusable"
                    title={t('lib.restore')}
                  >
                    <RotateCcw className="w-3 h-3" />
                    {t('lib.restore')}
                  </button>
                  <button
                    data-nav-id={`rm:delete:${b.id}`}
                    onClick={() => onDeletePermanently(b.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-rose-400 text-xs flex items-center gap-1 hh-focusable"
                    title={t('lib.deleteFileTitle')}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-neutral-600 leading-relaxed px-1">
            {t('lib.removedHint')}
          </p>
        </div>
      </div>
    </div>
  );
};
