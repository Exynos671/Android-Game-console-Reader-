import React from 'react';
import { Battery, BatteryCharging, Clock, EyeOff, Gamepad2, Bookmark, Menu } from 'lucide-react';
import { GamepadButtonBadge } from './GamepadButtonBadge';
import { ControllerProfile } from '../types';
import { useSystemStatus } from '../hooks/useSystemStatus';
import { useI18n } from '../i18n';

interface StealthHUDProps {
  visible: boolean;
  bookTitle: string;
  currentProgress: {
    current: number;
    total: number;
    percentage: number;
    chapterTitle?: string;
  };
  isBookmarked: boolean;
  profile: ControllerProfile;
  onToggleDistractionFree: () => void;
  onOpenMenu: () => void;
  onToggleBookmark: () => void;
  onNextPage: () => void;
  onPrevPage: () => void;
}

export const StealthHUD: React.FC<StealthHUDProps> = ({
  visible,
  bookTitle,
  currentProgress,
  isBookmarked,
  profile,
  onToggleDistractionFree,
  onOpenMenu,
  onToggleBookmark,
  onNextPage,
  onPrevPage,
}) => {
  const { t, tf } = useI18n();
  const { timeStr, batteryLevel, isCharging } = useSystemStatus();

  return (
    <div
      className={`fixed inset-x-0 bottom-0 pointer-events-none transition-all duration-300 z-40 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      aria-hidden={!visible}
    >
      {/* HUD Container (safe-area aware) */}
      <div
        className="max-w-4xl mx-auto px-4"
        style={{
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'calc(1rem + env(safe-area-inset-left, 0px))',
          paddingRight: 'calc(1rem + env(safe-area-inset-right, 0px))',
        }}
      >
        <div
          className={`${
            visible ? 'pointer-events-auto' : 'pointer-events-none'
          } bg-neutral-950/90 backdrop-blur-md border border-neutral-800/90 rounded-2xl p-3 shadow-2xl flex flex-col gap-2.5`}
          // Keep the invisible HUD completely inert: it sits above the normal
          // reading chrome when distraction-free mode is off, so a stray tap
          // used to hit hidden buttons (e.g. "Exit Fullscreen") and toggle the
          // mode right back on.
          inert={!visible}
        >
          {/* Top Row: Title, Chapter, Page Progress & Stats */}
          <div className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-neutral-200 truncate">{bookTitle}</span>
              {currentProgress.chapterTitle && (
                <>
                  <span className="text-neutral-600">•</span>
                  <span className="text-neutral-400 truncate">{currentProgress.chapterTitle}</span>
                </>
              )}
            </div>

            {/* System Battery & Time Status for Handhelds */}
            <div className="flex items-center gap-3 shrink-0 font-mono text-[11px] text-neutral-400">
              {batteryLevel !== null && (
                <div className="flex items-center gap-1">
                  {isCharging ? (
                    <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Battery className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>{batteryLevel}%</span>
                </div>
              )}

              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-neutral-500" />
                <span>{timeStr || '--:--'}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={onPrevPage}
              className="p-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
              title={t('hud.previousPage')}
            >
              <GamepadButtonBadge inputId={profile.bindings.prevPage} size="sm" />
            </button>

            <div className="flex-1 flex flex-col gap-1">
              <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${currentProgress.percentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                <span>
                  {tf('hud.pageOf', {
                    current: currentProgress.current,
                    total: currentProgress.total,
                  })}
                </span>
                <span>{tf('hud.percent', { percent: currentProgress.percentage })}</span>
              </div>
            </div>

            <button
              onClick={onNextPage}
              className="p-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
              title={t('hud.nextPage')}
            >
              <GamepadButtonBadge inputId={profile.bindings.nextPage} size="sm" />
            </button>
          </div>

          {/* Bottom Action Bar. Wraps onto a second line on phones: keeping
              every label on one line is more important than a single row. */}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 pt-1 border-t border-neutral-800/80 text-xs">
            <div className="flex shrink-0 items-center gap-2 text-[11px] text-neutral-400 sm:gap-3">
              <div className="flex items-center gap-1.5">
                <GamepadButtonBadge inputId={profile.bindings.toggleDistractionFree} size="sm" />
                <span className="hidden sm:inline whitespace-nowrap">{t('hud.exitDistractionFree')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <GamepadButtonBadge inputId={profile.bindings.toggleMenu} size="sm" />
                <span className="hidden sm:inline whitespace-nowrap">{t('hud.menu')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <GamepadButtonBadge inputId={profile.bindings.scrollDown} size="sm" />
                <span className="hidden sm:inline whitespace-nowrap">{t('hud.scroll')}</span>
              </div>
            </div>

            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={onToggleBookmark}
                className={`shrink-0 whitespace-nowrap p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                  isBookmarked
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                }`}
                title={t('hud.bookmark')}
              >
                <Bookmark className="w-3.5 h-3.5 shrink-0" fill={isBookmarked ? 'currentColor' : 'none'} />
                <span className="text-[11px] whitespace-nowrap">{t('hud.bookmark')}</span>
              </button>

              <button
                onClick={onOpenMenu}
                className="shrink-0 whitespace-nowrap p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white flex items-center gap-1 text-xs"
              >
                <Menu className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px] whitespace-nowrap">{t('hud.settings')}</span>
              </button>

              <button
                onClick={onToggleDistractionFree}
                className="shrink-0 whitespace-nowrap px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1"
              >
                <EyeOff className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">{t('hud.exitFullscreen')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
