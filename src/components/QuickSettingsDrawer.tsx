import React from 'react';
import {
  X,
  Type,
  Sun,
  Moon,
  Columns,
  BookOpen,
  Eye,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { ReaderSettings, ReaderTheme, ReadingMode } from '../types';

interface QuickSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onUpdateSettings: (newSettings: Partial<ReaderSettings>) => void;
  isComic?: boolean;
}

export const QuickSettingsDrawer: React.FC<QuickSettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  isComic = false,
}) => {
  if (!isOpen) return null;

  const themes: { id: ReaderTheme; label: string; bg: string; text: string; desc: string }[] = [
    {
      id: 'oled',
      label: 'OLED Black',
      bg: 'bg-black border-neutral-700',
      text: 'text-neutral-200',
      desc: 'True #000000 for max handheld battery life',
    },
    {
      id: 'dark',
      label: 'Dark Slate',
      bg: 'bg-neutral-900 border-neutral-700',
      text: 'text-neutral-200',
      desc: 'Balanced low-glare dark mode',
    },
    {
      id: 'sepia',
      label: 'Warm Sepia',
      bg: 'bg-[#f6ebd7] border-amber-300',
      text: 'text-[#382b1d]',
      desc: 'Pleasant vintage book page tint',
    },
    {
      id: 'paper',
      label: 'Paper Light',
      bg: 'bg-[#fcfbf9] border-neutral-300',
      text: 'text-[#18181b]',
      desc: 'High-contrast e-ink newspaper aesthetic',
    },
    {
      id: 'retro',
      label: 'Game Boy',
      bg: 'bg-[#182818] border-emerald-800',
      text: 'text-[#88c070]',
      desc: 'Classic handheld 8-bit phosphor matrix',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-neutral-900 border-l border-neutral-800 w-full max-w-sm h-full flex flex-col shadow-2xl text-neutral-100 overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">Reading Environment</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 flex-1 text-sm">
          {/* Themes */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-amber-400" />
              Theme &amp; OLED Battery Saver
            </label>
            <div className="grid grid-cols-2 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onUpdateSettings({ theme: t.id })}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    settings.theme === t.id
                      ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-md'
                      : 'border-neutral-800 hover:border-neutral-700'
                  } ${t.bg}`}
                >
                  <span className={`font-bold text-xs ${t.text}`}>{t.label}</span>
                  <span className={`text-[10px] leading-tight opacity-75 ${t.text}`}>
                    {t.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Reading Mode (especially for Comics / Manga) */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              Reading Layout Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateSettings({ readingMode: 'paginated' })}
                className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                  settings.readingMode === 'paginated'
                    ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                    : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div>Paginated</div>
                <div className="text-[10px] opacity-80 mt-0.5">Turn page by page (RB/LB)</div>
              </button>

              <button
                onClick={() => onUpdateSettings({ readingMode: 'continuous' })}
                className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                  settings.readingMode === 'continuous'
                    ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                    : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div>Continuous Scroll</div>
                <div className="text-[10px] opacity-80 mt-0.5">Smooth thumbstick scroll</div>
              </button>

              {isComic && (
                <>
                  <button
                    onClick={() => onUpdateSettings({ readingMode: 'manga_rtl' })}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                      settings.readingMode === 'manga_rtl'
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                        : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div>Manga (RTL)</div>
                    <div className="text-[10px] opacity-80 mt-0.5">Right-to-left flip</div>
                  </button>

                  <button
                    onClick={() => onUpdateSettings({ readingMode: 'webtoon' })}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                      settings.readingMode === 'webtoon'
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                        : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div>Webtoon Vertical</div>
                    <div className="text-[10px] opacity-80 mt-0.5">Seamless strip reading</div>
                  </button>
                </>
              )}
            </div>
          </div>

          {!isComic && (
            <>
              {/* Typography */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-amber-400" />
                  Font Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'serif', label: 'Literata (Serif)' },
                    { id: 'sans', label: 'Plus Jakarta (Sans)' },
                    { id: 'mono', label: 'JetBrains (Mono)' },
                    { id: 'display', label: 'Cinzel (Display)' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => onUpdateSettings({ fontFamily: f.id as any })}
                      className={`p-2 rounded-xl border text-xs font-medium transition-all ${
                        settings.fontFamily === f.id
                          ? 'bg-neutral-800 text-amber-400 border-amber-500/50 font-bold'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Font Size</span>
                  <span className="font-mono text-amber-400 font-bold">{settings.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="13"
                  max="34"
                  value={settings.fontSize}
                  onChange={(e) => onUpdateSettings({ fontSize: parseInt(e.target.value) })}
                  className="w-full accent-amber-400 bg-neutral-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Line Spacing */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Line Height</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {settings.lineHeight.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="1.2"
                  max="2.2"
                  step="0.1"
                  value={settings.lineHeight}
                  onChange={(e) => onUpdateSettings({ lineHeight: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 bg-neutral-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Page Margins */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                  <Columns className="w-3.5 h-3.5 text-amber-400" />
                  Page Margins
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['compact', 'balanced', 'relaxed'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => onUpdateSettings({ marginSize: m })}
                      className={`py-1.5 text-xs font-semibold uppercase rounded-lg border capitalize transition-all ${
                        settings.marginSize === m
                          ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Night Warmth Filter */}
          <div className="space-y-2 pt-2 border-t border-neutral-800">
            <div className="flex justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                Night Eye Warmth Filter
              </span>
              <span className="font-mono text-amber-400 font-bold">{settings.warmth}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              value={settings.warmth}
              onChange={(e) => onUpdateSettings({ warmth: parseInt(e.target.value) })}
              className="w-full accent-amber-400 bg-neutral-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Screen Brightness Filter */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                Console Brightness Damper
              </span>
              <span className="font-mono text-amber-400 font-bold">{settings.brightness}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="100"
              value={settings.brightness}
              onChange={(e) => onUpdateSettings({ brightness: parseInt(e.target.value) })}
              className="w-full accent-amber-400 bg-neutral-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm shadow-md transition-colors"
          >
            Apply &amp; Return to Reading
          </button>
        </div>
      </div>
    </div>
  );
};
