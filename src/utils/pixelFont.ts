/**
 * Pixel-font sizing helpers.
 *
 * The bundled Chinese pixel face (`Fonts/汉仪像素11px.ttf`) is outlined on a
 * 77 unit grid with a 1000 unit em, i.e. one design pixel is 0.077em and a
 * full em is ~13 design pixels. To render it "point to point" the em has to
 * be mapped onto a whole number of *device* pixels, otherwise every glyph
 * edge picks up a fractional offset and the browser antialiases it.
 */

/** Design pixels per em for the bundled HanYi pixel face. */
export const PIXEL_EM_PX = 13;

/** Below this density the nearest whole-design-pixel step (13px) is too
 *  coarse, so we allow half steps (6.5px) and let grayscale AA even out the
 *  remaining half-pixel. */
const MIN_SNAP_DPR = 1.5;

/**
 * Returns the closest font size that maps the pixel font's em onto a clean
 * device-pixel grid:
 *
 * - DPR >= 1.5: one design pixel = a whole device pixel, e.g. 18px at DPR 2
 *   becomes 19.5px (39 device pixels, 3 device px per design pixel).
 * - DPR < 1.5: one design pixel = half a device pixel, e.g. 18px at DPR 1
 *   becomes 19.5px (1.5 device px per design pixel). Every stroke then has
 *   the same 1.5px coverage instead of alternating 1px / 2px widths.
 */
export function snapPixelFontSize(size: number, dpr: number): number {
  if (!Number.isFinite(size) || size <= 0) return size;
  const density = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;

  const step = density >= MIN_SNAP_DPR ? PIXEL_EM_PX : PIXEL_EM_PX / 2;
  const steps = Math.max(1, Math.round((size * density) / step));
  return Math.round(((steps * step) / density) * 100) / 100;
}

/**
 * True when the reading size lands exactly on whole device pixels per
 * design pixel, i.e. when the browser can rasterize the dot matrix without
 * any antialiasing. Fractional scales get grayscale AA instead, because
 * snapping them to 1px strokes would make some strokes twice as heavy.
 */
export function isPixelCrisp(fontSize: number, dpr: number): boolean {
  const density = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  if (!Number.isFinite(fontSize) || fontSize <= 0) return false;
  const designPx = (fontSize * density) / PIXEL_EM_PX;
  return Math.abs(designPx - Math.round(designPx)) < 0.01;
}

/** LCD cell size in CSS px: one cell per font design pixel, but never
 *  smaller than 3 device px or the dark gaps would swamp the cell itself. */
export function lcdCellSize(fontSize: number, dpr: number): number {
  const density = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const glyphCell = Number.isFinite(fontSize) && fontSize > 0 ? fontSize / PIXEL_EM_PX : 0;
  return Math.max(3 / density, glyphCell);
}

/** Line opacity for the LCD mesh. A one-device-pixel line is physically
 *  much heavier on a 1x panel than on a 3x panel, so the opacity follows
 *  the density to keep the grain equally visible on both. */
export function lcdInkAlpha(dpr: number): number {
  const density = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const t = Math.min(1, Math.max(0, (density - 1) / 1.75));
  return 0.07 + t * 0.06;
}

/**
 * Snaps a CSS line-height multiplier to whole device pixels so every line
 * box starts on the same raster row instead of drifting between rows.
 * Always returns a pixel value (callers divide by the font size when they
 * need a unitless multiplier).
 */
export function snapPixelLineHeight(
  fontSize: number,
  lineHeight: number,
  dpr: number
): number {
  if (!Number.isFinite(fontSize) || !Number.isFinite(lineHeight)) {
    return fontSize * lineHeight;
  }
  const density = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  return Math.round(fontSize * lineHeight * density) / density;
}

/** Snaps an arbitrary CSS px value (margins, column widths) to the device grid. */
export function snapDevicePx(value: number, dpr: number): number {
  const density = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  return Math.round(value * density) / density;
}
