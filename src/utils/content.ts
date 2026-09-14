/**
 * Content helpers shared by the text reader engines.
 * EPUB chapters are real HTML; TXT/MOBI/PDF chapters are plain text
 * that must be escaped + paragraphised before being injected as HTML,
 * otherwise newlines collapse and the book renders as one blob.
 */

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
 * Convert plain text into simple, readable HTML paragraphs.
 * Blocks are separated by one or more blank lines; single line breaks
 * inside a block become spaces.
 */
export function textToHtml(text: string): string {
  const blocks = text
    .split(/\r?\n\s*\r?\n/)
    .map((b) => b.replace(/\r?\n+/g, ' ').trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return '';
  }
  return blocks.map((b) => `<p>${escapeHtml(b)}</p>`).join('\n');
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
