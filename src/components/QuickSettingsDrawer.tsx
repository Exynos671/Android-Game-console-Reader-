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
  Languages,
  Maximize,
  Info,
  Timer,
  PanelBottom,
  Gauge,
  Library,
  Image as ImageIcon,
  Monitor,
  Scaling,
} from 'lucide-react';
import {
  ReaderSettings,
  ReaderTheme,
  ReadingMode,
  PageTurnAnimation,
  UiScale,
  ScreenPanel,
} from '../types';
import { useI18n } from '../i18n';
import { SafeSlider } from './SafeSlider';
import { resolvePanelType } from '../services/displayInfo';

interface QuickSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onUpdateSettings: (newSettings: Partial<ReaderSettings>) => void;
  isComic?: boolean;
  onOpenTutorial?: () => void;
}

export const QuickSettingsDrawer: React.FC<QuickSettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  isComic = false,
  onOpenTutorial,
}) => {
  const { t, lang, setLang } = useI18n();

  if (!isOpen) return null;

  const panelType = resolvePanelType(settings.screenPanel);
  const oledBlocked = panelType !== 'oled';

  const themes: { id: ReaderTheme; label: string; bg: string; text: string; desc: string }[] = [
    {
      id: 'oled',
      label: t('settings.themeOledBlack'),
      bg: 'bg-black border-neutral-700',
      text: 'text-neutral-200',
      desc: t('settings.themeOledDesc'),
    },
    {
      id: 'dark',
      label: t('settings.themeDarkSlate'),
      bg: 'bg-neutral-900 border-neutral-700',
      text: 'text-neutral-200',
      desc: t('settings.themeDarkDesc'),
    },
    {
      id: 'sepia',
      label: t('settings.themeSepia'),
      bg: 'bg-[#f6ebd7] border-amber-300',
      text: 'text-[#382b1d]',
      desc: t('settings.themeSepiaDesc'),
    },
    {
      id: 'paper',
      label: t('settings.themePaper'),
      bg: 'bg-[#fcfbf9] border-neutral-300',
      text: 'text-[#18181b]',
      desc: t('settings.themePaperDesc'),
    },
    {
      id: 'retro',
      label: t('settings.themeRetro'),
      bg: 'bg-[#182818] border-emerald-800',
      text: 'text-[#88c070]',
      desc: t('settings.themeRetroDesc'),
    },
    {
      id: 'gba',
      label: t('settings.themeGba'),
      bg: 'bg-[#9bbc0f] border-emerald-700',
      text: 'text-[#0f380f]',
      desc: t('settings.themeGbaDesc'),
    },
    {
      id: 'gbp',
      label: t('settings.themeGbp'),
      bg: 'bg-[#b8bcb0] border-neutral-500',
      text: 'text-[#2b2f28]',
      desc: t('settings.themeGbpDesc'),
    },
  ];

  const fonts: { id: ReaderSettings['fontFamily']; label: string }[] = [
    { id: 'serif', label: t('settings.fontFamilySerif') },
    { id: 'sans', label: t('settings.fontFamilySans') },
    { id: 'mono', label: t('settings.fontFamilyMono') },
    { id: 'display', label: t('settings.fontFamilyDisplay') },
    { id: 'pixel1', label: t('settings.fontFamilyPixel1') },
    { id: 'pixel2', label: t('settings.fontFamilyPixel2') },
  ];

  const animations: { id: PageTurnAnimation; label: string; desc: string }[] = [
    { id: 'instant', label: t('settings.instant'), desc: t('settings.instantSub') },
    { id: 'slide', label: t('settings.slide'), desc: t('settings.slideSub') },
    { id: 'fade', label: t('settings.fade'), desc: t('settings.fadeSub') },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border-l border-neutral-800 w-full max-w-sm h-full flex flex-col shadow-2xl text-neutral-100 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-4 safe-px border-b border-neutral-800 flex items-center justify-between bg-neutral-950 sticky top-0 z-10"
          style={{
            paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
            paddingLeft: 'calc(1.25rem + env(safe-area-inset-left, 0px))',
            paddingRight: 'calc(1.25rem + env(safe-area-inset-right, 0px))',
          }}
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">{t('settings.title')}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 flex-1 text-sm">
          {/* ===== General & Display ===== */}
          <div className="space-y-3 pt-1">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              {t('settings.general')}
            </label>

            {/* Language */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-amber-400" />
                  {t('settings.language')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLang('zh')}
                  className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                    lang === 'zh'
                      ? 'bg-amber-500 text-neutral-950 border-amber-400'
                      : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  中文
                </button>
                <button
                  onClick={() => setLang('en')}
                  className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                    lang === 'en'
                      ? 'bg-amber-500 text-neutral-950 border-amber-400'
                      : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Day / Night chrome */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateSettings({ uiTheme: 'night' })}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  settings.uiTheme === 'night'
                    ? 'bg-neutral-800 text-amber-400 border-amber-500/50'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                <Moon className="w-4 h-4" />
                {t('settings.nightMode')}
              </button>
              <button
                onClick={() => onUpdateSettings({ uiTheme: 'day' })}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  settings.uiTheme === 'day'
                    ? 'bg-amber-500 text-neutral-950 border-amber-400'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                <Sun className="w-4 h-4" />
                {t('settings.dayMode')}
              </button>
            </div>

            {/* Interface size */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <Scaling className="w-3.5 h-3.5 text-amber-400" />
                  {t('settings.uiScale')}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(['small', 'medium', 'large', 'xlarge'] as UiScale[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => onUpdateSettings({ uiScale: s })}
                    className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                      settings.uiScale === s
                        ? 'bg-amber-500 text-neutral-950 border-amber-400'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    {s === 'small'
                      ? t('common.small')
                      : s === 'medium'
                        ? t('common.medium')
                        : s === 'large'
                          ? t('common.large')
                          : t('common.xlarge')}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-neutral-500 leading-relaxed">
                {t('settings.uiScaleDesc')}
              </p>
            </div>

            {/* Screen panel type (OLED guard) */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-amber-400" />
                  {t('settings.screenPanel')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['auto', 'oled', 'lcd'] as ScreenPanel[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => onUpdateSettings({ screenPanel: p })}
                    className={`py-2 rounded-lg border text-[11px] font-semibold transition-all ${
                      settings.screenPanel === p
                        ? 'bg-neutral-800 text-amber-400 border-amber-500/50'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    {p === 'auto'
                      ? t('settings.screenPanelAuto')
                      : p === 'oled'
                        ? t('settings.screenPanelOled')
                        : t('settings.screenPanelLcd')}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-neutral-500 leading-relaxed">
                {t('settings.screenPanelDesc')}
              </p>
            </div>

            {/* Immersive mode */}
            <label
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800 cursor-pointer hover:border-neutral-700"
              title={t('settings.immersiveModeDesc')}
            >
              <div className="space-y-1 min-w-0">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-200">
                  <Maximize className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  {t('settings.immersiveMode')}
                </span>
                <span className="block text-[10px] text-neutral-500 leading-relaxed">
                  {t('settings.immersiveModeDesc')}
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.immersiveMode}
                onChange={(e) => onUpdateSettings({ immersiveMode: e.target.checked })}
                className="w-5 h-5 rounded accent-amber-400 cursor-pointer shrink-0"
              />
            </label>

            {/* Bottom info bar */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <PanelBottom className="w-3.5 h-3.5 text-amber-400" />
                  {t('settings.bottomBar')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onUpdateSettings({ showHudTimeAndBattery: true })}
                  className={`py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                    settings.showHudTimeAndBattery
                      ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                >
                  {t('settings.bottomBarShow')}
                </button>
                <button
                  onClick={() => onUpdateSettings({ showHudTimeAndBattery: false })}
                  className={`py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                    !settings.showHudTimeAndBattery
                      ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                >
                  {t('settings.bottomBarHide')}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['xs', 'sm', 'md'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => onUpdateSettings({ bottomBarFontSize: s })}
                    className={`py-1 text-[11px] font-semibold rounded-lg border uppercase transition-all ${
                      settings.bottomBarFontSize === s
                        ? 'bg-neutral-800 text-amber-400 border-amber-500/50'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    {s === 'xs'
                      ? t('common.small')
                      : s === 'sm'
                        ? t('common.medium')
                        : t('common.large')}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom progress counts */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <Library className="w-3.5 h-3.5 text-amber-400" />
                  {t('settings.bottomProgress')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onUpdateSettings({ progressMode: 'book' })}
                  className={`py-2 rounded-lg border text-[11px] font-semibold transition-all ${
                    settings.progressMode === 'book'
                      ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                >
                  {t('settings.progressWholeBook')}
                </button>
                <button
                  onClick={() => onUpdateSettings({ progressMode: 'chapter' })}
                  className={`py-2 rounded-lg border text-[11px] font-semibold transition-all ${
                    settings.progressMode === 'chapter'
                      ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                >
                  {t('settings.progressChapter')}
                </button>
              </div>
            </div>

            {/* B double-press interval */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 text-amber-400" />
                  {t('settings.backDoublePress')}
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  {settings.backDoublePressMs}
                  {t('common.milliseconds')}
                </span>
              </div>
              <SafeSlider
                min={400}
                max={1500}
                step={100}
                value={settings.backDoublePressMs}
                onChange={(v) => onUpdateSettings({ backDoublePressMs: Math.round(v) })}
              />
            </div>

            {/* Replay tutorial */}
            {onOpenTutorial && (
              <button
                onClick={onOpenTutorial}
                className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-500/40 flex items-center justify-between text-xs text-neutral-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-sky-400" />
                  {t('settings.tutorial')}
                </span>
                <span className="text-[10px] font-mono text-neutral-500">
                  {t('settings.tutorialDesc')}
                </span>
              </button>
            )}
          </div>

          {/* Themes */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-amber-400" />
              {t('settings.themeOled')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {themes.map((th) => (
                <button
                  key={th.id}
                  onClick={() => onUpdateSettings({ theme: th.id })}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    settings.theme === th.id
                      ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-md'
                      : 'border-neutral-800 hover:border-neutral-700'
                  } ${th.bg}`}
                >
                  <span className={`font-bold text-xs ${th.text}`}>{th.label}</span>
                  <span className={`text-[10px] leading-tight opacity-80 ${th.text}`}>
                    {th.desc}
                  </span>
                  {th.id === 'oled' && oledBlocked && (
                    <span className="text-[9px] font-bold text-rose-400 mt-0.5">
                      {t('settings.themeOledLocked')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Reading Mode */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              {t('settings.readingLayout')}
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
                <div>{t('settings.paginated')}</div>
                <div className="text-[10px] opacity-80 mt-0.5">{t('settings.paginatedSub')}</div>
              </button>

              <button
                onClick={() => onUpdateSettings({ readingMode: 'continuous' })}
                className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                  settings.readingMode === 'continuous'
                    ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                    : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div>{t('settings.continuous')}</div>
                <div className="text-[10px] opacity-80 mt-0.5">{t('settings.continuousSub')}</div>
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
                    <div>{t('settings.mangaRtl')}</div>
                    <div className="text-[10px] opacity-80 mt-0.5">{t('settings.mangaRtlSub')}</div>
                  </button>

                  <button
                    onClick={() => onUpdateSettings({ readingMode: 'webtoon' })}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                      settings.readingMode === 'webtoon'
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                        : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div>{t('settings.webtoon')}</div>
                    <div className="text-[10px] opacity-80 mt-0.5">{t('settings.webtoonSub')}</div>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Image display mode (book images / comic pages) */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              {t('settings.imageDisplay')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateSettings({ imageViewMode: 'fit' })}
                className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                  settings.imageViewMode === 'fit'
                    ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                    : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {t('settings.imageFit')}
              </button>
              <button
                onClick={() => onUpdateSettings({ imageViewMode: 'full' })}
                className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                  settings.imageViewMode === 'full'
                    ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                    : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {t('settings.imageFull')}
              </button>
            </div>
          </div>

          {/* Page Turn Animation */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
              <span className="text-amber-400 text-xs">✦</span>
              {t('settings.pageAnimation')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {animations.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onUpdateSettings({ pageTurnAnimation: a.id })}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                    settings.pageTurnAnimation === a.id
                      ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                      : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div>{a.label}</div>
                  <div className="text-[10px] opacity-80 mt-0.5">{a.desc}</div>
                </button>
              ))}
            </div>

            {/* Page turn speed */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-amber-400" />
                  {t('settings.pageTurnSpeed')}
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  {settings.pageTurnSpeedMs}
                  {t('common.milliseconds')}
                </span>
              </div>
              <SafeSlider
                min={260}
                max={900}
                step={20}
                value={settings.pageTurnSpeedMs}
                onChange={(v) => onUpdateSettings({ pageTurnSpeedMs: Math.round(v) })}
              />
              <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                <span>{t('common.fast')}</span>
                <span>{t('common.slow')}</span>
              </div>
            </div>
          </div>

          {!isComic && (
            <>
              {/* Typography */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-amber-400" />
                  {t('settings.fontStyle')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {fonts.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => onUpdateSettings({ fontFamily: f.id })}
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
                  <span>{t('settings.fontSize')}</span>
                  <span className="font-mono text-amber-400 font-bold">{settings.fontSize}px</span>
                </div>
                <SafeSlider
                  min={13}
                  max={34}
                  step={1}
                  value={settings.fontSize}
                  onChange={(v) => onUpdateSettings({ fontSize: Math.round(v) })}
                />
              </div>

              {/* Line Spacing */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>{t('settings.lineHeight')}</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {settings.lineHeight.toFixed(1)}x
                  </span>
                </div>
                <SafeSlider
                  min={1.2}
                  max={2.2}
                  step={0.1}
                  value={settings.lineHeight}
                  onChange={(v) => onUpdateSettings({ lineHeight: Math.round(v * 10) / 10 })}
                />
              </div>

              {/* Page Margins */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                  <Columns className="w-3.5 h-3.5 text-amber-400" />
                  {t('settings.pageMargins')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'compact', label: t('settings.pageMarginCompact') },
                    { id: 'balanced', label: t('settings.pageMarginBalanced') },
                    { id: 'relaxed', label: t('settings.pageMarginRelaxed') },
                  ] as const).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => onUpdateSettings({ marginSize: m.id })}
                      className={`py-1.5 text-xs font-semibold rounded-lg border capitalize transition-all ${
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
                {t('settings.warmth')}
              </span>
              <span className="font-mono text-amber-400 font-bold">{settings.warmth}%</span>
            </div>
            <SafeSlider
              min={0}
              max={40}
              step={1}
              value={settings.warmth}
              onChange={(v) => onUpdateSettings({ warmth: Math.round(v) })}
            />
          </div>

          {/* Screen Brightness Filter */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                {t('settings.brightness')}
              </span>
              <span className="font-mono text-amber-400 font-bold">{settings.brightness}%</span>
            </div>
            <SafeSlider
              min={40}
              max={100}
              step={1}
              value={settings.brightness}
              onChange={(v) => onUpdateSettings({ brightness: Math.round(v) })}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-4 safe-px border-t border-neutral-800 bg-neutral-950"
          style={{
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
            paddingLeft: 'calc(1.25rem + env(safe-area-inset-left, 0px))',
            paddingRight: 'calc(1.25rem + env(safe-area-inset-right, 0px))',
          }}
        >
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm shadow-md transition-colors"
          >
            {t('settings.applyAndReturn')}
          </button>
        </div>
      </div>
    </div>
  );
};
