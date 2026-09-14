import { ScreenPanel } from '../types';

/**
 * Best-effort detection of the physical panel technology.
 *
 * Android exposes no public "is OLED?" API, so we combine two weak signals:
 *  - the UA / device model (known handheld model registry), and
 *  - wide-colour-gamut / HDR media queries (most OLED handhelds are HDR/P3).
 *
 * Anything we cannot classify is reported as `unknown`; callers should treat
 * unknown as "not confirmed OLED" and warn the user before enabling the pure
 * black OLED theme.
 */

export type DetectedPanel = 'oled' | 'lcd' | 'unknown';

/** Known non-OLED handhelds / industrial panels. */
const LCD_HINTS = [
  /arbor/i,
  /gt78/i,
  /gt-78/i,
  /rgb30/i,
  /rg353/i,
  /rg35xx/i,
  /rg552/i,
  /miyoo/i,
  /gcloud/i,
  /logitech/i,
  /steam deck/i,
  /surface/i,
];

/** Known OLED handhelds. */
const OLED_HINTS = [
  /odin2/i,
  /odin 2/i,
  /retroid pocket 4/i,
  /retroid pocket 5/i,
  /rp4/i,
  /rp5/i,
  /rg556/i,
  /rg cube/i,
  /ayn/i,
];

function uaText(): string {
  if (typeof navigator === 'undefined') return '';
  return `${navigator.userAgent || ''} ${(navigator as any).platform || ''}`.toLowerCase();
}

/**
 * Resolve the effective panel type from the user preference and the heuristic.
 * `auto` prefers an explicit model match, then falls back to colour-gamut /
 * HDR probing, and finally to `unknown`.
 */
export function resolvePanelType(preference: ScreenPanel): DetectedPanel {
  if (preference === 'oled' || preference === 'lcd') return preference;

  const ua = uaText();
  for (const re of OLED_HINTS) if (re.test(ua)) return 'oled';
  for (const re of LCD_HINTS) if (re.test(ua)) return 'lcd';

  try {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const hdr = window.matchMedia('(dynamic-range: high)').matches;
      const wide =
        window.matchMedia('(color-gamut: p3)').matches ||
        window.matchMedia('(color-gamut: rec2020)').matches;
      if (hdr && wide) return 'oled';
    }
  } catch {
    /* ignore */
  }

  return 'unknown';
}

/** True when the OLED pure-black theme must be blocked for this panel. */
export function isOledBlocked(panel: DetectedPanel): boolean {
  return panel === 'lcd';
}
