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

/** Design pixels per em for the Latin pixel faces (Press Start 2P, Silkscreen). */
export const PIXEL_LATIN_EM_PX = 8;

/** Retina-class panels only. On anything below ~300 ppi a one-device-pixel
 *  ghost is physically too coarse and the snapped strokes gain visible
 *  weight, so the theme keeps its dot-matrix background but drops the
 *  sharpening pass entirely. */
const MIN_SHARPEN_PPI = 300;

/** Nominal CSS pixels per inch for the current platform. `devicePixelRatio`
 *  is reported relative to this value on Android (density = dpi / 160) and
 *  iOS (pt = 1/163 in); desktop scaling factors are mapped to the classic
 *  96–113 ppi panels, which keeps Retina monitors below the 300 ppi gate. */
function platformCssPpi(): number {
  if (typeof navigator === 'undefined') return 160;
  const ua = navigator.userAgent;
  const touchPoints = navigator.maxTouchPoints ?? 0;
  const iPadUA = /Macintosh/i.test(ua) && touchPoints > 1;
  if (/Android/i.test(ua)) return 160;
  if (/iPhone|iPad|iPod/i.test(ua) || iPadUA) return 163;
  if (/Macintosh/i.test(ua)) return 113;
  return 96;
}

/**
 * Estimated physical pixel density of the display.
 *
 * The web platform never exposes the panel diagonal, but the platform CSS
 * baseline turns `devicePixelRatio` into a good ppi estimate. On Android
 * dpr 1 ≈ 160 ppi (320x240 / 640x480 handhelds), dpr 2 ≈ 320 ppi and
 * dpr 3 ≈ 480 ppi; Retina desktop monitors land around 220–260 ppi.
 */
export function estimateScreenPpi(dpr: number): number {
  const density = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  return density * platformCssPpi();
}

/**
 * True when the panel is dense enough (>= 300 ppi) for the dot-matrix
 * sharpening + LCD emboss. Lower-density screens keep the pixel face and
 * the LCD background/grain, rendered with normal grayscale antialiasing.
 */
export function canSharpenPixelText(dpr: number): boolean {
  return estimateScreenPpi(dpr) >= MIN_SHARPEN_PPI;
}

/**
 * Returns the closest font size that maps the pixel font's em onto a whole
 * number of *device* pixels per design pixel, e.g. 18px at DPR 2 becomes
 * 19.5px (39 device pixels, exactly 3 per design pixel).
 *
 * This snap is independent of panel density. At 1.386 device pixels per
 * design pixel (18px on a 1x screen) every 1px stroke is split across two
 * raster rows with a different coverage split per stroke, which reads as
 * uneven stroke weight even though the outline itself is uniform. Only
 * 13/26/39… device pixels per em keep all strokes identical, so the size
 * must be snapped on low-ppi panels too. Whether antialiasing is disabled
 * and the LCD ghost is added is a separate, ppi-gated decision.
 */
export function snapPixelFontSize(size: number, dpr: number): number {
  if (!Number.isFinite(size) || size <= 0) return size;
  const density = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;

  const steps = Math.max(1, Math.round((size * density) / PIXEL_EM_PX));
  return Math.round(((steps * PIXEL_EM_PX) / density) * 100) / 100;
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

/** Minimum device pixels per design pixel required by the LCD emboss.
 *
 *  The ghost is always offset by exactly one device pixel. At two device
 *  pixels per design pixel that is a full half-cell, so every stroke gains
 *  one extra pixel on its bottom/right edge and dense glyphs lose their
 *  counters — the uneven weight seen on 320x240 / 640x480 panels. At three
 *  or more the offset stays a fraction of a cell and only tints the edge. */
const MIN_EMBOSS_DEVICE_PX = 3;

/**
 * True when the LCD emboss (a one-device-pixel ghost under every lit pixel)
 * can be added without visibly changing the stroke weight. Needs both a
 * point-to-point size and enough device pixels inside each design pixel.
 */
export function canEmbossPixelText(fontSize: number, dpr: number): boolean {
  if (!canSharpenPixelText(dpr) || !isPixelCrisp(fontSize, dpr)) return false;
  const density = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const designPx = (fontSize * density) / PIXEL_EM_PX;
  return designPx >= MIN_EMBOSS_DEVICE_PX - 0.01;
}

/**
 * Canvas variant of the emboss gate. The overlay already snaps every stroke
 * band, so the size does not have to land on whole device pixels; only the
 * panel density and the number of device pixels inside one design pixel
 * still decide whether a one-device-pixel ghost stays an edge tint.
 */
export function canCanvasEmboss(fontSize: number, dpr: number): boolean {
  if (!canSharpenPixelText(dpr)) return false;
  const density = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  if (!Number.isFinite(fontSize) || fontSize <= 0) return false;
  const designPx = (fontSize * density) / PIXEL_EM_PX;
  return designPx >= MIN_EMBOSS_DEVICE_PX - 0.01;
}

/**
 * LCD cell size in CSS px: one cell per design pixel of the active dot-matrix
 * face, landed on a whole number of *device* pixels (a fractional pitch blurs
 * the one-device-pixel gaps), but never smaller than 3 device px or the dark
 * gaps would swamp the cell itself.
 *
 * `designEm` decides which face sets the visible dot size. The reader passes
 * the Latin em (8) for the pixel fonts: their glyph pips are what reads as
 * "the dot" on screen, and matching the HanYi 13-px grid instead made the
 * background mesh noticeably finer than the letters.
 */
export function lcdCellSize(
  fontSize: number,
  dpr: number,
  designEm: number = PIXEL_EM_PX
): number {
  const density = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const em = Number.isFinite(designEm) && designEm > 0 ? designEm : PIXEL_EM_PX;
  const glyphCell =
    Number.isFinite(fontSize) && fontSize > 0 ? (fontSize * density) / em : 0;
  // +epsilon keeps exact halves (e.g. 4.5 device px) rounding up instead of
  // flipping down because of float error in the incoming CSS size.
  return Math.max(3, Math.round(glyphCell + 1e-6)) / density;
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
