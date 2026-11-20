import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/**
 * Canvas overlay for the dot-matrix reading face.
 *
 * The DOM stays in charge of line breaking, justification, columns, page
 * counts and selection; this layer only repaints the glyphs. Every character
 * is measured with a Range and its glyph is rebuilt from the native design
 * grid of the face the browser picked for it: 8px for Press Start 2P /
 * Silkscreen, 13px for the bundled HanYi CJK face.
 *
 * Why not just use CSS text? A 1px stroke at 18px is 1.386 device pixels, so
 * the browser distributes it across two raster rows by a different amount for
 * every stroke (0.33+1.00, 0.07+1.00+0.60, …), which reads as uneven weight.
 * Here every horizontal band is snapped to a whole device row and then drawn
 * with a constant fractional height, so all strokes get an identical
 * full-row + fringe profile at any font size.
 *
 * Which face paints a glyph is decided the same way the browser decides it
 * for layout: try the families of the computed CSS stack in order and use the
 * first one that actually contains the glyph. Latin therefore stays on
 * Press Start / Silkscreen while Chinese falls back to HanYi, instead of
 * forcing every glyph through the 13px CJK grid.
 */

interface PixelFace {
  family: string;
  /** Font size (CSS px) at which one design pixel is exactly one pixel. */
  designEm: number;
  /** Ascent in design pixels (baseline -> inline box top). */
  ascent: number;
  /** Cell height in design pixels: ascent + descent (+ a guard row). */
  line: number;
  /** Latin-only faces can skip the (expensive) CJK coverage probe. */
  latinOnly: boolean;
}

const PIXEL_FACES: PixelFace[] = [
  // `.font-pixel1` / `.font-pixel2` in index.css define the actual order;
  // this table only supplies each family's native design grid.
  { family: 'Press Start 2P', designEm: 8, ascent: 8, line: 9, latinOnly: true },
  { family: 'Silkscreen', designEm: 8, ascent: 8, line: 10, latinOnly: true },
  { family: 'HanYi Pixel 11', designEm: 13, ascent: 14, line: 17, latinOnly: false },
];

const FACE_BY_FAMILY = new Map(PIXEL_FACES.map((face) => [face.family, face]));

/** CJK, kana, full-width forms and CJK punctuation. */
const CJK_RE =
  /[\u2E80-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF\u3000-\u303F]/;

const ATLAS_COLS = 64;
const ATLAS_ROWS = 32;
/** Guard ring around every cell so a glyph cannot bleed into its neighbour. */
const CELL_PAD = 2;
const MAX_SLOTS = ATLAS_COLS * ATLAS_ROWS;
const FLUSH_SIZE = 256;

/**
 * Reusable probe canvas. It must fit a glyph at twice the largest design em
 * (26px for HanYi): the 2x render is how a real bitmap face is told apart
 * from the browser's own fallback (see `faceCoverage`).
 */
const PROBE_SIZE = 64;
const PROBE_X = 8;
const PROBE_BASELINE = 40;

/** Grapheme splitter: accent marks and emoji sequences are one painted unit. */
const segmenter: Intl.Segmenter | null =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

interface Band {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /**
   * True when the design row just below `y1` has ink under this run, i.e.
   * this band continues into the next band instead of ending the stroke.
   */
  below: boolean;
}

interface Bitmap {
  bands: Band[];
  empty: boolean;
  /** Colour glyph (emoji): painted with fillText instead of flat bands. */
  color: boolean;
}

interface PaintItem {
  page: number;
  x: number;
  y: number;
  /** CSS px per design pixel of the face that paints this glyph. */
  scale: number;
  ch: string;
  /** Face resolved for this glyph, or null for a direct browser fill. */
  face: PixelFace | null;
  /** CSS px from the range top to the shared line baseline. */
  baselineOffset: number;
  /** Full display-size font shorthand for direct / .notdef fallbacks. */
  font: string;
  bold: boolean;
  italic: boolean;
  color: string;
  alpha: number;
  direct: boolean;
  fontSize: number;
}

function rasterize(bits: Uint8Array, cellW: number, cellH: number): Bitmap {
  const bands: Band[] = [];
  let open: Band[] = [];
  let empty = true;

  for (let y = 0; y < cellH; y++) {
    const runs: { x0: number; x1: number }[] = [];
    let x = 0;
    while (x < cellW) {
      if (!bits[y * cellW + x]) {
        x += 1;
        continue;
      }
      const x0 = x;
      while (x < cellW && bits[y * cellW + x]) x += 1;
      runs.push({ x0, x1: x });
    }
    if (runs.length) empty = false;

    const next: Band[] = [];
    for (const r of runs) {
      const prev = open.find((b) => b.x0 === r.x0 && b.x1 === r.x1 && b.y1 === y);
      if (prev) {
        prev.y1 = y + 1;
        next.push(prev);
      } else {
        next.push({ x0: r.x0, x1: r.x1, y0: y, y1: y + 1, below: false });
      }
    }
    for (const b of open) {
      if (!next.includes(b)) bands.push(b);
    }
    open = next;
  }
  bands.push(...open);

  // A band that continues into the row below must be painted all the way to
  // that row's snapped top. Otherwise two independent floors leave a
  // sub-pixel gap at the seam which the canvas antialiases into a light line
  // through the stroke (the "flying white" seen at fractional scales such as
  // 18px on a 2x panel).
  for (const band of bands) {
    if (band.y1 >= cellH) continue;
    const row = band.y1 * cellW;
    for (let x = band.x0; x < band.x1; x++) {
      if (bits[row + x]) {
        band.below = true;
        break;
      }
    }
  }
  return { bands, empty, color: false };
}

/**
 * One reusable atlas per face. Glyphs are rasterized at the face's native
 * design size and cached as 1-bit bands; the canvas itself is only a scratch
 * surface, so resetting it never throws away already extracted bitmaps.
 */
class GlyphAtlas {
  readonly face: PixelFace;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly cellW: number;
  private readonly cellH: number;
  private readonly slotW: number;
  private readonly slotH: number;
  private readonly atlasW: number;
  private readonly atlasH: number;
  private pending: { ch: string; index: number }[] = [];
  private used = 0;
  readonly bitmaps = new Map<string, Bitmap>();

  constructor(face: PixelFace) {
    this.face = face;
    this.cellW = face.designEm;
    this.cellH = face.line;
    this.slotW = this.cellW + CELL_PAD * 2;
    this.slotH = this.cellH + CELL_PAD * 2;
    this.atlasW = this.slotW * ATLAS_COLS;
    this.atlasH = this.slotH * ATLAS_ROWS;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.atlasW;
    this.canvas.height = this.atlasH;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('2D canvas is unavailable');
    this.ctx = ctx;
  }

  ensure(chars: Iterable<string>): void {
    for (const ch of chars) {
      if (this.bitmaps.has(ch)) continue;
      if (this.used >= MAX_SLOTS) {
        this.flush();
        this.reset();
      }
      this.pending.push({ ch, index: this.used });
      this.used += 1;
      if (this.pending.length >= FLUSH_SIZE) this.flush();
    }
    this.flush();
  }

  private reset(): void {
    this.ctx.clearRect(0, 0, this.atlasW, this.atlasH);
    this.used = 0;
  }

  private flush(): void {
    if (!this.pending.length) return;
    const ctx = this.ctx;

    for (const item of this.pending) {
      const col = item.index % ATLAS_COLS;
      const row = Math.floor(item.index / ATLAS_COLS);
      ctx.save();
      ctx.font = `normal 400 ${this.face.designEm}px "${this.face.family}"`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#000';
      try {
        ctx.fillText(
          item.ch,
          col * this.slotW + CELL_PAD,
          row * this.slotH + CELL_PAD + this.face.ascent
        );
      } catch {
        /* ignore unparsable fallback shorthands */
      }
      ctx.restore();
    }

    const data = ctx.getImageData(0, 0, this.atlasW, this.atlasH).data;
    for (const item of this.pending) {
      const col = item.index % ATLAS_COLS;
      const row = Math.floor(item.index / ATLAS_COLS);
      const bits = new Uint8Array(this.cellW * this.cellH);
      let color = false;
      for (let y = 0; y < this.cellH; y++) {
        for (let x = 0; x < this.cellW; x++) {
          const px = col * this.slotW + CELL_PAD + x;
          const py = row * this.slotH + CELL_PAD + y;
          const offset = (py * this.atlasW + px) * 4;
          if (data[offset + 3] < 128) continue;
          bits[y * this.cellW + x] = 1;
          const r = data[offset];
          const g = data[offset + 1];
          const b = data[offset + 2];
          if (Math.abs(r - g) > 8 || Math.abs(g - b) > 8) color = true;
        }
      }
      const bitmap = rasterize(bits, this.cellW, this.cellH);
      bitmap.color = color;
      this.bitmaps.set(item.ch, bitmap);
    }
    this.pending = [];
  }
}

let probeCtx: CanvasRenderingContext2D | null = null;

function probeMask(font: string, ch: string): Uint8Array | null {
  if (!probeCtx && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = PROBE_SIZE;
    canvas.height = PROBE_SIZE;
    probeCtx = canvas.getContext('2d', { willReadFrequently: true });
  }
  if (!probeCtx) return null;

  const ctx = probeCtx;
  ctx.clearRect(0, 0, PROBE_SIZE, PROBE_SIZE);
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#000';
  try {
    ctx.fillText(ch, PROBE_X, PROBE_BASELINE);
  } catch {
    return null;
  }
  const data = ctx.getImageData(0, 0, PROBE_SIZE, PROBE_SIZE).data;
  const mask = new Uint8Array(PROBE_SIZE * PROBE_SIZE);
  for (let i = 0; i < mask.length; i++) {
    mask[i] = data[i * 4 + 3] > 127 ? 1 : 0;
  }
  return mask;
}

/**
 * Mask of `ch` painted by this face at its native design size, or null when
 * the face does not actually contain the glyph.
 *
 * A single-family canvas fill does not stop at the named font: if the glyph
 * is missing, Chrome silently continues down the system fallback list, so a
 * plain "Silkscreen == stack" comparison would attribute Greek, Cyrillic,
 * Hangul or emoji to Silkscreen. A real pixel face is outlined on an integer
 * grid, so its 2x design-size render is an exact 2x2 doubling of its 1x
 * render. System fonts are hinted and scaled as outlines and do not double,
 * which lets us reject them without relying on `document.fonts.check` (that
 * API reports true even for glyphs the face lacks).
 *
 * The returned cell mask is reused for the stack comparison, saving one
 * probe.
 */
function faceCoverage(face: PixelFace, ch: string): Uint8Array | null {
  const base = probeMask(
    `normal 400 ${face.designEm}px "${face.family}"`,
    ch
  );
  if (!base) return null;
  const twice = probeMask(
    `normal 400 ${face.designEm * 2}px "${face.family}"`,
    ch
  );
  if (!twice) return null;

  // Both renders share one baseline, so the 2x grid starts `ascent` design
  // pixels higher. Reject rather than compare a clipped glyph.
  const top1 = PROBE_BASELINE - face.ascent;
  const top2 = PROBE_BASELINE - face.ascent * 2;
  if (
    top1 < 0 ||
    top2 < 0 ||
    PROBE_X + face.designEm * 2 > PROBE_SIZE ||
    top1 + face.line > PROBE_SIZE ||
    top2 + face.line * 2 > PROBE_SIZE
  ) {
    return null;
  }

  // Keep only the atlas cell: a full 64x64 mask per character would cost
  // megabytes on a long CJK book, and pixels outside the cell are clipped
  // by the atlas anyway.
  const cell = new Uint8Array(face.designEm * face.line);
  for (let y = 0; y < face.line; y++) {
    for (let x = 0; x < face.designEm; x++) {
      const bit = base[(top1 + y) * PROBE_SIZE + PROBE_X + x];
      cell[y * face.designEm + x] = bit;
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const doubled =
            twice[(top2 + y * 2 + dy) * PROBE_SIZE + PROBE_X + x * 2 + dx];
          if (doubled !== bit) return null;
        }
      }
    }
  }
  return cell;
}

/**
 * True when the full stack rasterizes `ch` exactly like this face alone at
 * the face's native size. With `base` already proven to be a real glyph of
 * the face, a match means the stack selected this face (and an earlier
 * family did not win), so painting the atlas cell mirrors the browser.
 */
function stackUsesFace(
  stack: string,
  face: PixelFace,
  ch: string,
  cell: Uint8Array
): boolean {
  const fromStack = probeMask(
    `normal 400 ${face.designEm}px ${stack}`,
    ch
  );
  if (!fromStack) return false;
  const top = PROBE_BASELINE - face.ascent;
  for (let y = 0; y < face.line; y++) {
    for (let x = 0; x < face.designEm; x++) {
      if (
        fromStack[(top + y) * PROBE_SIZE + PROBE_X + x] !==
        cell[y * face.designEm + x]
      ) {
        return false;
      }
    }
  }
  return true;
}

/** Split a computed `font-family` list without breaking quoted names. */
function parseFontFamilies(stack: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < stack.length) {
    while (i < stack.length && (stack[i] === ' ' || stack[i] === ',' || stack[i] === '\t')) {
      i += 1;
    }
    if (i >= stack.length) break;
    let name = '';
    if (stack[i] === '"' || stack[i] === "'") {
      const quote = stack[i];
      i += 1;
      while (i < stack.length && stack[i] !== quote) name += stack[i++];
      i += 1;
    } else {
      while (i < stack.length && stack[i] !== ',') name += stack[i++];
    }
    const trimmed = name.trim();
    if (trimmed) out.push(trimmed);
    while (i < stack.length && stack[i] !== ',') i += 1;
  }
  return out;
}

interface BandStyle {
  ghost?: { color: string; dx: number };
  bold?: boolean;
  italic?: boolean;
  /** Synthetic bold width in device pixels. */
  boldDx?: number;
  /** Ascent of this face in design pixels. */
  ascent: number;
}

/** Synthetic oblique slope (tan of the lean angle). */
const ITALIC_SLOPE = 0.2;

function paintBands(
  ctx: CanvasRenderingContext2D,
  bitmap: Bitmap,
  ox: number,
  baseline: number,
  scale: number,
  color: string,
  style: BandStyle
): void {
  const boldDx = style.bold ? style.boldDx ?? 0 : 0;

  const pass = (dx: number, dy: number) => {
    for (const band of bitmap.bands) {
      // Snapping the start of every band to a whole device row gives each
      // stroke the same sub-pixel phase; the fractional height then adds the
      // same fringe to all of them. Where the glyph continues into the row
      // below, that fringe is filled instead (see `below`), so a fractional
      // scale cannot leave a seam inside the stroke.
      const shear = style.italic
        ? Math.round((style.ascent - band.y0) * ITALIC_SLOPE * scale)
        : 0;
      const top = Math.floor((band.y0 - style.ascent) * scale);
      const x = ox + Math.floor(band.x0 * scale) + shear + dx;
      const y = baseline + top + dy;
      const w = (band.x1 - band.x0) * scale;
      let h = (band.y1 - band.y0) * scale;
      if (band.below) {
        // The next design row starts at its own floored top; reach it exactly
        // so a fractional scale cannot leave a seam between the two bands.
        // Only interior edges are extended: the glyph's outer fringe is left
        // alone, and the extra ink is exactly the coverage the gap lacked, so
        // the stroke is restored to its intended weight rather than inflated.
        h = Math.max(h, Math.floor((band.y1 - style.ascent) * scale) - top);
      }
      ctx.fillRect(x, y, w, h);
    }
  };

  if (style.ghost) {
    ctx.fillStyle = style.ghost.color;
    pass(style.ghost.dx, style.ghost.dx);
    if (boldDx) pass(style.ghost.dx + boldDx, style.ghost.dx);
  }
  ctx.fillStyle = color;
  pass(0, 0);
  if (boldDx) pass(boldDx, 0);
}

function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  }
  return hash | 0;
}

export interface PixelCanvasTextProps {
  sheetRef: React.RefObject<HTMLDivElement | null>;
  page: number;
  pageCount: number;
  contentW: number;
  contentH: number;
  html: string;
  dpr: number;
  enabled: boolean;
  /** LCD ghost for dense panels; the colour comes from --hh-lcd-ghost. */
  lcdGhost?: boolean;
  /** Theme / font / size signature; any change forces a repaint. */
  repaintKey: string;
}

export const PixelCanvasText: React.FC<PixelCanvasTextProps> = ({
  sheetRef,
  page,
  pageCount,
  contentW,
  contentH,
  html,
  dpr,
  enabled,
  lcdGhost = false,
  repaintKey,
}) => {
  const canvases = useRef(new Map<number, HTMLCanvasElement>());
  const atlases = useRef(new Map<string, GlyphAtlas>());
  /**
   * `stack + character -> face`. Font fallback is size-independent, so this
   * survives page turns; it is cleared whenever the webfonts finish loading
   * so a fallback decode never sticks.
   */
  const faceCache = useRef(new Map<string, PixelFace | null>());
  /**
   * `family + character -> native mask | null`. This is the expensive part
   * (two renders plus a 2x doubling check), and unlike the final face it does
   * not depend on the stack, so pixel1 / pixel2 share it.
   */
  const coverageCache = useRef(new Map<string, Uint8Array | null>());
  const [fontEpoch, setFontEpoch] = useState(0);

  const setCanvas = useCallback((pageIndex: number, el: HTMLCanvasElement | null) => {
    if (el) canvases.current.set(pageIndex, el);
    else canvases.current.delete(pageIndex);
  }, []);

  // Wait until the webfonts used by the sheet have settled; painting with a
  // fallback face and then hiding the DOM text would show the wrong glyphs.
  // `loadingdone` also catches fonts that only start loading after the first
  // paint, and every bump rebuilds the atlases so no fallback bitmap survives.
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return;
    let alive = true;
    const bump = () => {
      if (!alive) return;
      atlases.current = new Map();
      faceCache.current = new Map();
      coverageCache.current = new Map();
      setFontEpoch((epoch) => epoch + 1);
    };
    if (document.fonts.status === 'loading') {
      document.fonts.ready.then(bump).catch(() => {});
    } else {
      bump();
    }
    document.fonts.addEventListener?.('loadingdone', bump);
    return () => {
      alive = false;
      document.fonts.removeEventListener?.('loadingdone', bump);
    };
  }, []);

  const pages = useMemo(() => {
    const list: number[] = [];
    for (let p = page - 1; p <= page + 1; p++) {
      if (p >= 0 && p < pageCount) list.push(p);
    }
    return list;
  }, [page, pageCount]);

  const htmlKey = useMemo(
    () => `${html.length}:${hashString(html)}`,
    [html]
  );
  const version = `${contentW.toFixed(2)}x${contentH.toFixed(2)}|${dpr}|${repaintKey}|${htmlKey}|${fontEpoch}|g${lcdGhost ? 1 : 0}`;

  // Never leave the reading text transparent without a painted canvas.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!enabled) {
      sheet?.classList.remove('hh-pixel-canvas');
      return;
    }
    return () => {
      sheet?.classList.remove('hh-pixel-canvas');
    };
  }, [enabled, sheetRef]);

  useLayoutEffect(() => {
    if (!enabled || contentW < 1 || contentH < 1 || !pages.length) return;
    const sheet = sheetRef.current;
    if (!sheet) return;

    // Do not hide the DOM text while the pixel face is still loading.
    if (typeof document !== 'undefined' && document.fonts?.status === 'loading') return;

    const targets = new Set(pages);
    const todo = pages.filter((p) => {
      const canvas = canvases.current.get(p);
      return canvas && canvas.dataset.paintVersion !== version;
    });
    if (!todo.length) {
      sheet.classList.add('hh-pixel-canvas');
      return;
    }

    const contexts = new Map<number, CanvasRenderingContext2D>();
    for (const p of todo) {
      const canvas = canvases.current.get(p);
      if (!canvas) continue;
      const bw = Math.max(1, Math.round(contentW * dpr));
      const bh = Math.max(1, Math.round(contentH * dpr));
      if (canvas.width !== bw) canvas.width = bw;
      if (canvas.height !== bh) canvas.height = bh;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      contexts.set(p, ctx);
    }
    if (!contexts.size) return;

    try {
      const sheetRect = sheet.getBoundingClientRect();
      const atlasMap = atlases.current;
      const faceMap = faceCache.current;
      const coverageMap = coverageCache.current;
      let ghost: { color: string; dx: number } | undefined;
      if (lcdGhost) {
        const sheetStyle = getComputedStyle(sheet);
        const ghostColor = sheetStyle.getPropertyValue('--hh-lcd-ghost').trim();
        if (ghostColor) {
          const px = parseFloat(sheetStyle.getPropertyValue('--hh-lcd-px'));
          ghost = {
            color: ghostColor,
            dx: Math.max(1, Math.round((Number.isFinite(px) ? px : 1 / dpr) * dpr)),
          };
        }
      }

      const stackCache = new Map<
        string,
        { primary: PixelFace | null; faces: PixelFace[] }
      >();
      const stackInfoOf = (stack: string) => {
        let info = stackCache.get(stack);
        if (!info) {
          const names = parseFontFamilies(stack);
          // The inline box metrics (and therefore the range top) come from
          // the first family of the stack, so only treat the text as a pixel
          // run when that first family is one of the known faces.
          const primary = FACE_BY_FAMILY.get(names[0] ?? '') ?? null;
          const faces = primary
            ? names
                .map((name) => FACE_BY_FAMILY.get(name))
                .filter((face): face is PixelFace => !!face)
            : [];
          info = { primary, faces };
          stackCache.set(stack, info);
        }
        return info;
      };
      const faceOf = (
        stack: string,
        info: { primary: PixelFace | null; faces: PixelFace[] },
        ch: string
      ): PixelFace | null => {
        if (!info.primary) return null;
        const key = `${stack}\u0000${ch}`;
        const cached = faceMap.get(key);
        if (cached !== undefined) return cached;
        let resolved: PixelFace | null = null;
        for (const candidate of info.faces) {
          if (candidate.latinOnly && CJK_RE.test(ch)) continue;
          const coverageKey = `${candidate.family}\u0000${ch}`;
          let base = coverageMap.get(coverageKey);
          if (base === undefined) {
            base = faceCoverage(candidate, ch);
            coverageMap.set(coverageKey, base);
          }
          if (base && stackUsesFace(stack, candidate, ch, base)) {
            resolved = candidate;
            break;
          }
        }
        faceMap.set(key, resolved);
        return resolved;
      };

      const items: PaintItem[] = [];
      const minPage = Math.min(...pages);
      const maxPage = Math.max(...pages);

      const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const data = node.data;
        if (!data || !data.trim()) continue;
        const el = node.parentElement;
        if (!el || el.closest('svg, math, canvas')) continue;

        const style = getComputedStyle(el);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.visibility === 'collapse'
        ) {
          continue;
        }
        const fontSize = parseFloat(style.fontSize);
        if (!Number.isFinite(fontSize) || fontSize <= 0) continue;
        const family = style.fontFamily || 'sans-serif';
        const color = style.color || '#000';
        // Inline <strong>/<em> must keep their weight and slant. The atlas is
        // still rasterized on each face's native grid, so a synthetic bold
        // face stays as deterministic as the regular one.
        const fontWeight = style.fontWeight || '400';
        const fontStyle = style.fontStyle || 'normal';
        // `opacity` is not inherited: getComputedStyle only reports the
        // element's own value, so multiply it up the tree (the old footer /
        // header metadata use opacity-60 / opacity-70 on a wrapper).
        let alpha = 1;
        for (let cur: Element | null = el; cur && cur !== sheet; cur = cur.parentElement) {
          const o = parseFloat(getComputedStyle(cur).opacity);
          if (Number.isFinite(o)) alpha *= Math.min(1, Math.max(0, o));
        }
        if (alpha <= 0.01) continue;
        const textTransform = style.textTransform;
        const directNode = fontSize < 12.5;
        // `::first-letter` (drop caps) can override colour and family. Only
        // the first character of the first text child of a block can be a
        // first-letter, so this stays cheap.
        const firstNonSpace = data.search(/\S/);
        let firstLetter: CSSStyleDeclaration | null = null;
        if (
          firstNonSpace >= 0 &&
          el.firstChild === node &&
          /^(P|DIV|H1|H2|H3|H4|H5|H6|LI|BLOCKQUOTE|SECTION|ARTICLE|TD|TH)$/.test(
            el.tagName
          )
        ) {
          const pseudo = getComputedStyle(el, '::first-letter');
          if (
            pseudo.color !== color ||
            pseudo.fontFamily !== family ||
            pseudo.fontSize !== style.fontSize ||
            pseudo.fontWeight !== fontWeight ||
            pseudo.fontStyle !== fontStyle
          ) {
            firstLetter = pseudo;
          }
        }

        const nodeStack = stackInfoOf(family);
        const firstLetterStack =
          firstLetter && firstLetter.fontFamily !== family
            ? stackInfoOf(firstLetter.fontFamily)
            : nodeStack;

        // Cheap page filter: a node that has no line fragment inside the
        // painted window is skipped before touching its characters.
        const whole = document.createRange();
        whole.selectNodeContents(node);
        let touches = false;
        for (const rect of whole.getClientRects()) {
          if (rect.width < 0.1) continue;
          const x0 = rect.left - sheetRect.left;
          const x1 = x0 + rect.width;
          const p0 = Math.floor(x0 / contentW + 1e-4);
          const p1 = Math.floor((x1 - 1e-4) / contentW);
          if (p1 >= minPage && p0 <= maxPage) {
            touches = true;
            break;
          }
        }
        if (!touches) continue;

        const range = document.createRange();
        // Restrict a very long text node to the slice that can land on the
        // painted pages. The page index is monotonic in reading order, so a
        // binary search over per-character rects turns a 50k-char paragraph
        // from 50k Range measurements into ~30 probes plus the visible slice.
        let winStart = 0;
        let winEnd = data.length;
        if (data.length > 512) {
          const pageOfIndex = (index: number): number => {
            let probe = index;
            while (probe < data.length && !data[probe].trim()) probe += 1;
            if (probe >= data.length) {
              probe = index - 1;
              while (probe >= 0 && !data[probe].trim()) probe -= 1;
              if (probe < 0) return minPage;
            }
            range.setStart(node, probe);
            range.setEnd(node, probe + 1);
            for (const rect of range.getClientRects()) {
              if (rect.width < 0.2 || rect.height < 0.2) continue;
              return Math.floor((rect.left - sheetRect.left) / contentW + 1e-4);
            }
            return minPage;
          };
          let lo = 0;
          let hi = data.length;
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (pageOfIndex(mid) >= minPage) hi = mid;
            else lo = mid + 1;
          }
          winStart = Math.max(0, lo - 32);
          let after = winStart;
          let end = data.length;
          while (after < end) {
            const mid = (after + end) >> 1;
            if (pageOfIndex(mid) > maxPage) end = mid;
            else after = mid + 1;
          }
          winEnd = Math.min(data.length, after + 32);
        }
        const slice = winStart === 0 && winEnd === data.length
          ? data
          : data.slice(winStart, winEnd);

        // Split on grapheme clusters, not code points: an accented letter or
        // an emoji sequence must be measured (and painted) as one unit, and
        // combining marks have no useful glyph of their own.
        const clusters: { ch: string; index: number }[] = [];
        if (segmenter) {
          for (const part of segmenter.segment(slice)) {
            clusters.push({ ch: part.segment, index: winStart + part.index });
          }
        } else {
          for (let i = 0; i < slice.length; ) {
            const codePoint = slice.codePointAt(i);
            if (codePoint === undefined) break;
            const ch = String.fromCodePoint(codePoint);
            clusters.push({ ch, index: winStart + i });
            i += ch.length;
          }
        }
        for (const cluster of clusters) {
          const i = cluster.index;
          const codeUnits = cluster.ch.length;
          let ch = cluster.ch;
          if (textTransform === 'uppercase') ch = ch.toUpperCase();
          else if (textTransform === 'lowercase') ch = ch.toLowerCase();

          if (ch.trim()) {
            range.setStart(node, i);
            range.setEnd(node, i + codeUnits);
            for (const rect of range.getClientRects()) {
              if (rect.width < 0.2 || rect.height < 0.2) continue;
              const x0 = rect.left - sheetRect.left;
              const p = Math.floor(x0 / contentW + 1e-4);
              if (p < 0 || p >= pageCount || !targets.has(p) || !contexts.has(p)) {
                continue;
              }
              const x = x0 - p * contentW;
              if (x < -contentW || x > contentW) continue;
              const y = rect.top - sheetRect.top;

              // ::first-letter and other pseudo-elements can differ from the
              // node's computed size; the pseudo style carries the real size.
              // Deriving the scale from the inline box height is unreliable:
              // a line-height:1 drop cap reports exactly its font size, while
              // normal text reports the primary face's natural line box.
              const isFirstLetter = firstLetter !== null && i === firstNonSpace;
              const itemFamily =
                (isFirstLetter && firstLetter?.fontFamily) || family;
              const itemColor = (isFirstLetter && firstLetter?.color) || color;
              const itemWeight =
                (isFirstLetter && firstLetter?.fontWeight) || fontWeight;
              const itemStyle =
                (isFirstLetter && firstLetter?.fontStyle) || fontStyle;
              const itemFontSize =
                (isFirstLetter && firstLetter
                  ? parseFloat(firstLetter.fontSize)
                  : NaN) || fontSize;
              const stackInfo = isFirstLetter ? firstLetterStack : nodeStack;
              const face = faceOf(itemFamily, stackInfo, ch);
              const scale = face ? itemFontSize / face.designEm : 1;
              const fontPrefix = `${itemStyle} ${itemWeight}`;
              const itemBold =
                itemWeight === 'bold' ||
                itemWeight === 'bolder' ||
                (/^\d+$/.test(itemWeight) && parseInt(itemWeight, 10) >= 600);
              const itemItalic =
                itemStyle === 'italic' || itemStyle.startsWith('oblique');

              items.push({
                page: p,
                x,
                y,
                scale,
                ch,
                face,
                // The DOM range top is the top of the line's primary inline
                // box; the shared baseline is one ascent below it. Every
                // glyph (including CJK fallbacks) is then placed relative to
                // that same baseline with its own face's ascent.
                baselineOffset: stackInfo.primary
                  ? (stackInfo.primary.ascent * itemFontSize) /
                    stackInfo.primary.designEm
                  : NaN,
                // Synthetic weight / slant is applied to the bands at paint
                // time; rasterizing the normal face keeps the native grid and
                // lets one atlas cell serve all weights.
                font: `${fontPrefix} ${itemFontSize}px ${itemFamily}`,
                bold: itemBold,
                italic: itemItalic,
                color: itemColor,
                alpha,
                direct: directNode || !face || scale < 0.95,
                fontSize: itemFontSize,
              });
            }
          }
        }
      }

      const charsByFace = new Map<PixelFace, Set<string>>();
      for (const item of items) {
        if (item.direct || !item.face) continue;
        let set = charsByFace.get(item.face);
        if (!set) charsByFace.set(item.face, (set = new Set()));
        set.add(item.ch);
      }
      for (const [face, chars] of charsByFace) {
        let atlas = atlasMap.get(face.family);
        if (!atlas) {
          atlas = new GlyphAtlas(face);
          atlasMap.set(face.family, atlas);
        }
        atlas.ensure(chars);
      }

      for (const item of items) {
        const ctx = contexts.get(item.page);
        if (!ctx) continue;
        const ox = Math.round(item.x * dpr);
        const scale = item.scale * dpr;
        // Synthetic bold is proportional to the display size so a 1-design-
        // pixel stem gets the same visual extra weight in every face.
        const boldDx = item.bold
          ? Math.max(1, Math.round(item.fontSize * dpr * 0.03))
          : 0;

        ctx.save();
        ctx.globalAlpha = item.alpha;

        const bitmap = !item.direct && item.face
          ? atlasMap.get(item.face.family)?.bitmaps.get(item.ch)
          : undefined;

        if (!bitmap || bitmap.color) {
          // Direct fill for sizes below the design grid, missing glyphs and
          // colour emoji (band painting would flatten the emoji into one
          // ink colour, so they are drawn with the browser's own bitmap).
          ctx.font = item.font;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
          ctx.fillStyle = item.color;
          let baselineDevice: number;
          if (Number.isFinite(item.baselineOffset)) {
            baselineDevice = Math.round((item.y + item.baselineOffset) * dpr);
          } else {
            const metrics = ctx.measureText(item.ch);
            const ascent =
              metrics.fontBoundingBoxAscent > 0
                ? metrics.fontBoundingBoxAscent
                : item.fontSize * 1.078;
            baselineDevice = Math.round((item.y + ascent) * dpr);
          }
          ctx.fillText(item.ch, ox, baselineDevice);
          ctx.restore();
          continue;
        }
        if (bitmap.empty) {
          ctx.restore();
          continue;
        }

        paintBands(ctx, bitmap, ox, Math.round((item.y + item.baselineOffset) * dpr), scale, item.color, {
          ghost,
          bold: item.bold,
          italic: item.italic,
          boldDx,
          ascent: item.face!.ascent,
        });
        ctx.restore();
      }

      for (const p of todo) {
        const canvas = canvases.current.get(p);
        if (canvas) canvas.dataset.paintVersion = version;
      }
      sheet.classList.add('hh-pixel-canvas');
    } catch (error) {
      sheet.classList.remove('hh-pixel-canvas');
      if (typeof console !== 'undefined') {
        console.warn('[pixel-canvas] paint failed', error);
      }
    }
  }, [
    enabled,
    pages,
    page,
    pageCount,
    contentW,
    contentH,
    dpr,
    version,
    lcdGhost,
    sheetRef,
  ]);

  if (!enabled || contentW < 1 || contentH < 1) return null;

  return (
    <>
      {pages.map((p) => (
        <canvas
          key={p}
          ref={(el) => setCanvas(p, el)}
          aria-hidden="true"
          data-pixel-canvas-page={p}
          style={{
            position: 'absolute',
            left: `${p * contentW}px`,
            top: 0,
            width: `${contentW}px`,
            height: `${contentH}px`,
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
};
