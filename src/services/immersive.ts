import { Capacitor, SystemBars } from '@capacitor/core';

/**
 * Toggles true fullscreen reading on Android by hiding / showing the system
 * status and navigation bars (Capacitor 8 built-in SystemBars plugin).
 * On the web preview it falls back to the browser Fullscreen API.
 */
export async function applyImmersiveMode(enabled: boolean): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!Capacitor.isNativePlatform()) {
    try {
      if (enabled) {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen API unavailable:', e);
    }
    return;
  }
  try {
    if (enabled) {
      await SystemBars.hide();
    } else {
      await SystemBars.show();
    }
  } catch (e) {
    console.warn('SystemBars plugin failed:', e);
  }
}

/** True when running inside the native Android wrapper (Capacitor). */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}
