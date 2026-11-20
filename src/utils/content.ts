/**
 * Content helpers shared by the text reader engines.
 * EPUB chapters are real HTML; TXT/MOBI/PDF chapters are plain text
 * that must be escaped + paragraphised before being injected as HTML,
 * otherwise newlines collapse and the book renders as one blob.
 */

/** Characters that make up dense CJK prose (Han, kana, compatibility ideographs). */
const CJK_CHAR_GLOBAL = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isHtmlContent(content: string): boolean {
  // A real tag like <p>, <div>, <h1>… marks structured HTML content.
  return /<[a-zA-Z][^>]*>/.test(content);
}

/**
 * True when the text is mostly CJK characters. Such books (Chinese web
 * novels in particular) put one paragraph per line, so a plain newline is a
 * paragraph break rather than a soft wrap.
 */
export function isCjkDominant(text: string): boolean {
  const cjk = text.match(CJK_CHAR_GLOBAL)?.length ?? 0;
  if (cjk < 4) return false;
  const visible = text.replace(/\s+/g, '').length;
  return visible > 0 && cjk / visible >= 0.2;
}

/** Count CJK characters plus whitespace-separated Latin words. */
export function countWords(text: string): number {
  if (!text) return 0;
  const cjk = text.match(CJK_CHAR_GLOBAL)?.length ?? 0;
  const latin = text
    .replace(CJK_CHAR_GLOBAL, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, cjk + latin);
}

/**
 * Convert plain text into simple, readable HTML paragraphs.
 *
 * Blank lines always separate paragraphs. Inside a paragraph a single
 * newline is treated differently per script:
 * - CJK prose: every line is its own paragraph (one-paragraph-per-line is
 *   the convention for Chinese novels, and hard wrapping is rare).
 * - Latin prose: a single newline is a soft wrap and becomes a space.
 */
export function textToHtml(text: string): string {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!normalized.trim()) return '';

  let paragraphs: string[];
  if (isCjkDominant(normalized)) {
    paragraphs = normalized.split('\n');
  } else {
    paragraphs = normalized
      .split(/\n[ \t\u00a0\u3000]*\n+/)
      .map((block) =>
        block
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .join(' ')
      );
  }

  return paragraphs
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('\n');
}

/**
 * Returns HTML safe for dangerouslySetInnerHTML: keeps structured HTML
 * untouched, normalises plain text to paragraphs.
 */
export function normalizeChapterToHtml(content: string): string {
  if (!content) return '';
  return isHtmlContent(content) ? content : textToHtml(content);
}

/** Strip the leading block from an HTML string (rarely needed). */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  if (!isHtmlContent(html)) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body?.textContent || '';
}
