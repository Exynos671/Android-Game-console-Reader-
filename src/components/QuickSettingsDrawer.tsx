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
  Smartphone,
} from 'lucide-react';
import { ReaderSettings, ReaderTheme, ReadingMode } from '../types';

interface QuickSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onUpdateSettings: (newSettings: Partial<ReaderSettings>) => void;
  isComic?: boolean;
  onOpenInstallModal?: () => void;
}

export const QuickSettingsDrawer: React.FC<QuickSettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  isComic = false,
  onOpenInstallModal,
}) => {
  if (!isOpen) return null;

  const themes: { id: ReaderTheme; label: string; bg: string; text: string; desc: string }[] = [
    {
      id: 'oled',
      label: 'OLED 纯黑',
      bg: 'bg-black border-neutral-700',
      text: 'text-neutral-200',
      desc: '纯黑像素关闭，掌机/手机极度省电',
    },
    {
      id: 'dark',
      label: '暗夜深灰',
      bg: 'bg-neutral-900 border-neutral-700',
      text: 'text-neutral-200',
      desc: '柔和暗光背景，夜晚久读不刺眼',
    },
    {
      id: 'sepia',
      label: '护眼羊皮纸',
      bg: 'bg-[#f6ebd7] border-amber-300',
      text: 'text-[#382b1d]',
      desc: '经典泛黄纸质色调，温润舒适',
    },
    {
      id: 'paper',
      label: '水墨浅白',
      bg: 'bg-[#fcfbf9] border-neutral-300',
      text: 'text-[#18181b]',
      desc: '模拟电纸书高清晰度质感',
    },
    {
      id: 'retro',
      label: '复古点阵绿',
      bg: 'bg-[#182818] border-emerald-800',
      text: 'text-[#88c070]',
      desc: '经典 Game Boy 复古液晶点阵',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-neutral-900 border-l border-neutral-800 w-full max-w-sm h-full flex flex-col shadow-2xl text-neutral-100 overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">阅读与排版设置</h3>
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
              阅读配色与 OLED 省电
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
              排版阅读模式
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
                <div>分页模式</div>
                <div className="text-[10px] opacity-80 mt-0.5">按键/触屏逐页切换</div>
              </button>

              <button
                onClick={() => onUpdateSettings({ readingMode: 'continuous' })}
                className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                  settings.readingMode === 'continuous'
                    ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                    : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div>连续滚动</div>
                <div className="text-[10px] opacity-80 mt-0.5">摇杆或滑动平滑上下漫游</div>
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
                    <div>日漫从右至左</div>
                    <div className="text-[10px] opacity-80 mt-0.5">符合日系漫画阅读习惯</div>
                  </button>

                  <button
                    onClick={() => onUpdateSettings({ readingMode: 'webtoon' })}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                      settings.readingMode === 'webtoon'
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                        : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div>条漫长图向下</div>
                    <div className="text-[10px] opacity-80 mt-0.5">韩漫/国漫条漫纵向连贯</div>
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
                  正文字形风格
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'serif', label: '人文宋体 (Serif)' },
                    { id: 'sans', label: '现代黑体 (Sans)' },
                    { id: 'mono', label: '等宽极客 (Mono)' },
                    { id: 'display', label: '典雅标题 (Display)' },
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
                  <span>文字字号</span>
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
                  <span>文本行高</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {settings.lineHeight.toFixed(1)} 倍
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
                  版面内边距
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'compact', label: '紧凑' },
                    { id: 'balanced', label: '适中' },
                    { id: 'relaxed', label: '宽裕' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => onUpdateSettings({ marginSize: m.id as any })}
                      className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        settings.marginSize === m.id
                          ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                      }`}
                    >
                      {m.label}
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
                夜间防蓝光暖色滤镜
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
                掌机暗光亮度衰减器
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

          {/* Android Device Installation Quick Option */}
          {onOpenInstallModal && (
            <div className="pt-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenInstallModal();
                }}
                className="w-full py-2 px-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>安装至安卓手机 / 掌机</span>
                </div>
                <span className="text-[10px] font-mono text-neutral-400">PWA / APK →</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm shadow-md transition-colors"
          >
            保存并返回阅读
          </button>
        </div>
      </div>
    </div>
  );
};
