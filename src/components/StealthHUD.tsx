import React, { useEffect, useState } from 'react';
import { Battery, BatteryCharging, Clock, EyeOff, Gamepad2, Bookmark, Menu } from 'lucide-react';
import { GamepadButtonBadge } from './GamepadButtonBadge';
import { ControllerProfile } from '../types';

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
  const [timeStr, setTimeStr] = useState('');
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);

  // Update clock every minute
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Read handheld console battery if supported
  useEffect(() => {
    let batteryObj: any = null;

    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any)
        .getBattery()
        .then((battery: any) => {
          batteryObj = battery;
          const updateBattery = () => {
            setBatteryLevel(Math.round(battery.level * 100));
            setIsCharging(battery.charging);
          };
          updateBattery();
          battery.addEventListener('levelchange', updateBattery);
          battery.addEventListener('chargingchange', updateBattery);
        })
        .catch(() => {
          // Unsupported or denied
        });
    }

    return () => {
      if (batteryObj) {
        batteryObj.removeEventListener?.('levelchange', () => {});
        batteryObj.removeEventListener?.('chargingchange', () => {});
      }
    };
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 pointer-events-none transition-all duration-300 z-40 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      {/* HUD Container */}
      <div className="max-w-4xl mx-auto px-4 pb-4">
        <div className="pointer-events-auto bg-neutral-950/90 backdrop-blur-md border border-neutral-800/90 rounded-2xl p-3 shadow-2xl flex flex-col gap-2.5">
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
                <span>{timeStr || '19:00'}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={onPrevPage}
              className="p-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
              title="Previous Page"
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
                  Page {currentProgress.current} of {currentProgress.total}
                </span>
                <span>{currentProgress.percentage}%</span>
              </div>
            </div>

            <button
              onClick={onNextPage}
              className="p-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
              title="Next Page"
            >
              <GamepadButtonBadge inputId={profile.bindings.nextPage} size="sm" />
            </button>
          </div>

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80 text-xs">
            <div className="flex items-center gap-3 text-[11px] text-neutral-400">
              <div className="flex items-center gap-1.5">
                <GamepadButtonBadge inputId={profile.bindings.toggleDistractionFree} size="sm" />
                <span className="hidden sm:inline">Exit Distraction-Free</span>
              </div>
              <div className="flex items-center gap-1.5">
                <GamepadButtonBadge inputId={profile.bindings.toggleMenu} size="sm" />
                <span className="hidden sm:inline">Menu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <GamepadButtonBadge inputId={profile.bindings.scrollDown} size="sm" />
                <span className="hidden sm:inline">Scroll</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onToggleBookmark}
                className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                  isBookmarked
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                }`}
                title="Bookmark page"
              >
                <Bookmark className="w-3.5 h-3.5" fill={isBookmarked ? 'currentColor' : 'none'} />
                <span className="text-[11px]">Bookmark</span>
              </button>

              <button
                onClick={onOpenMenu}
                className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white flex items-center gap-1 text-xs"
              >
                <Menu className="w-3.5 h-3.5" />
                <span className="text-[11px]">Settings</span>
              </button>

              <button
                onClick={onToggleDistractionFree}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Exit Fullscreen</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
