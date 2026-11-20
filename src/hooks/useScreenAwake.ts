import { useEffect } from 'react';
import { ScreenSleepMinutes } from '../types';

/** Custom event so gamepad input can reset the idle timer (it emits no DOM events). */
const ACTIVITY_EVENT = 'handheld-screen-activity';

/** Native bridge exposed by MainActivity on Android. */
interface NativeScreenBridge {
  setKeepScreenOn?: (enabled: boolean) => void;
}

declare global {
  interface Window {
    NativeScreen?: NativeScreenBridge;
  }
}

let webSentinel: WakeLockSentinel | null = null;
let pendingRequest: Promise<void> | null = null;
let requestGeneration = 0;
let nativeHeld = false;

function nativeBridge(): NativeScreenBridge | null {
  if (typeof window === 'undefined') return null;
  const bridge = window.NativeScreen;
  return bridge && typeof bridge.setKeepScreenOn === 'function' ? bridge : null;
}

async function acquireWakeLock(): Promise<void> {
  if (typeof window === 'undefined' || document.visibilityState !== 'visible') return;

  // The native window flag is the most reliable path inside the Android app;
  // the Screen Wake Lock API covers browsers / installed PWAs.
  const native = nativeBridge();
  if (native) {
    if (!nativeHeld) {
      nativeHeld = true;
      try {
        native.setKeepScreenOn!(true);
      } catch {
        nativeHeld = false;
      }
    }
    return;
  }

  if (webSentinel && !webSentinel.released) return;
  if (pendingRequest) return pendingRequest;

  const wakeLock = typeof navigator !== 'undefined' ? navigator.wakeLock : undefined;
  if (!wakeLock) return;

  const generation = ++requestGeneration;
  pendingRequest = (async () => {
    try {
      const sentinel = await wakeLock.request('screen');
      // The reader was closed while the request was in flight: drop it.
      if (generation !== requestGeneration) {
        sentinel.release().catch(() => {});
        return;
      }
      webSentinel = sentinel;
      sentinel.addEventListener('release', () => {
        if (webSentinel === sentinel) webSentinel = null;
      });
    } catch {
      // Refused (battery saver, unsupported WebView…): the system timeout applies.
    } finally {
      pendingRequest = null;
    }
  })();

  return pendingRequest;
}

function releaseWakeLock(): void {
  requestGeneration++;
  const native = nativeBridge();
  if (nativeHeld && native) {
    nativeHeld = false;
    try {
      native.setKeepScreenOn!(false);
    } catch {
      /* ignore */
    }
  }

  const sentinel = webSentinel;
  webSentinel = null;
  if (sentinel && !sentinel.released) {
    sentinel.release().catch(() => {});
  }
}

/** Reset the idle countdown from non-DOM input such as gamepad buttons. */
export function reportScreenActivity(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(ACTIVITY_EVENT));
}

/**
 * Keeps the device screen awake while `active` (a book is open).
 *
 * With a timeout > 0 the wake lock is dropped after that many minutes without
 * user activity, letting the OS turn the screen off. `0` (the “无 / None”
 * option) holds the lock until the reader is closed.
 */
export function useScreenAwake(minutes: ScreenSleepMinutes, active: boolean): void {
  useEffect(() => {
    if (!active || typeof window === 'undefined') {
      releaseWakeLock();
      return;
    }

    const timeoutMs = minutes > 0 ? minutes * 60_000 : 0;
    let timer: number | null = null;
    let lastRefresh = 0;

    const refresh = (force = false) => {
      const now = Date.now();
      // Gamepad scrolling fires on every animation frame; refreshing the
      // wake lock once a second is enough to keep the timer alive.
      if (!force && now - lastRefresh < 1000) return;
      lastRefresh = now;

      if (timer !== null) window.clearTimeout(timer);
      timer = null;
      void acquireWakeLock();

      if (timeoutMs > 0) {
        timer = window.setTimeout(() => {
          timer = null;
          releaseWakeLock();
        }, timeoutMs);
      }
    };

    const onActivity = () => refresh();
    const onVisibilityChange = () => {
      if (document.hidden) {
        if (timer !== null) {
          window.clearTimeout(timer);
          timer = null;
        }
        releaseWakeLock();
      } else {
        refresh(true);
      }
    };

    refresh(true);

    // Pointer / keyboard / wheel cover touch and keyboard use; gamepad input
    // dispatches ACTIVITY_EVENT from the action handler.
    window.addEventListener('pointerdown', onActivity, { passive: true });
    window.addEventListener('touchstart', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity);
    window.addEventListener('wheel', onActivity, { passive: true });
    window.addEventListener(ACTIVITY_EVENT, onActivity);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('touchstart', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('wheel', onActivity);
      window.removeEventListener(ACTIVITY_EVENT, onActivity);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      releaseWakeLock();
    };
  }, [active, minutes]);
}
