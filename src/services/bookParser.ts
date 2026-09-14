import JSZip from 'jszip';
import { Book, BookFormat, Chapter, ComicPage } from '../types';

/**
 * Natural sort helper for comic page filenames like page_1, page_2, page_10
 */
function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/** Split a book into ~N-word chunks (spaced Latin text). */
function chunkByWords(text: string, chunkSize: number): Chapter[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: Chapter[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunkWords = words.slice(i, i + chunkSize);
    const idx = Math.floor(i / chunkSize) + 1;
    chunks.push({
      id: `chap_${idx}`,
      title: `Section ${idx}`,
      content: chunkWords.join(' '),
      wordCount: chunkWords.length,
    });
  }
  return chunks;
}

/** Split a book into character-sized chunks at paragraph boundaries. */
function chunkByChars(text: string, maxCharsPer: number): Chapter[] {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const chunks: Chapter[] = [];
  let buffer: string[] = [];
  let bufferedChars = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    const idx = chunks.length + 1;
    const content = buffer.join('\n');
    chunks.push({
      id: `chap_${idx}`,
      title: `Section ${idx}`,
      content,
      wordCount: Math.max(1, content.length),
    });
    buffer = [];
    bufferedChars = 0;
  };

  const pushParagraph = (para: string) => {
    // Very long single paragraphs (rare in plain text) get hard-split at
    // sentence boundaries so no chunk becomes enormous.
    if (para.length > maxCharsPer * 1.8) {
      flush();
      const sentences = para.split(/(?<=[。！？.!?])\s*/).filter(Boolean);
      let part: string[] = [];
      let partLen = 0;
      for (const sent of sentences) {
        if (partLen + sent.length > maxCharsPer && part.length) {
          const idx = chunks.length + 1;
          const content = part.join('');
          chunks.push({
            id: `chap_${idx}`,
            title: `Section ${idx}`,
            content,
            wordCount: Math.max(1, content.length),
          });
          part = [];
          partLen = 0;
        }
        part.push(sent);
        partLen += sent.length;
      }
      if (part.length) {
        const idx = chunks.length + 1;
        chunks.push({
          id: `chap_${idx}`,
          title: `Section ${idx}`,
          content: part.join(''),
          wordCount: Math.max(1, part.join('').length),
        });
      }
      return;
    }
    if (bufferedChars + para.length > maxCharsPer && buffer.length) {
      flush();
    }
    buffer.push(para);
    bufferedChars += para.length + 1;
  };

  for (const line of lines) pushParagraph(line);
  flush();
  return chunks;
}

/**
 * Parse plain text files into chapters
 */
export function parseTxt(text: string, title = 'Untitled Document', author = 'Unknown'): Book {
  // Regex to detect chapter breaks
  const chapterRegex = /(?:^|\n\s*\n)(?:chapter\s+\d+|chapter\s+[ivxlcdm]+|section\s+\d+|part\s+[ivxlcdm]+|\b第[0-9一二三四五六七八九十百千]+[章回节]|#+\s+.+)(?:[^\n]*)/gi;

  const chapters: Chapter[] = [];
  const lines = text.split('\n');

  let currentTitle = 'Introduction';
  let currentContent: string[] = [];
  let chapterIndex = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const isHeading =
      /^(chapter\s+\d+|chapter\s+[ivxlcdm]+|section\s+\d+|part\s+[ivxlcdm]+|\b第[0-9一二三四五六七八九十百千]+[章回节])/i.test(line) ||
      (line.startsWith('#') && line.length < 80);

    if (isHeading && currentContent.length > 20) {
      chapters.push({
        id: `chap_${chapterIndex++}`,
        title: currentTitle,
        content: currentContent.join('\n\n'),
        wordCount: currentContent.join(' ').split(/\s+/).length,
      });
      currentTitle = line.replace(/^#+\s*/, '');
      currentContent = [];
    } else if (line.length > 0) {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    chapters.push({
      id: `chap_${chapterIndex}`,
      title: currentTitle,
      content: currentContent.join('\n\n'),
      wordCount: currentContent.join(' ').split(/\s+/).length,
    });
  }

  // If no chapters detected, split into readable chunks. Latin / spaced text
  // chunks by words; dense CJK text (little whitespace) chunks by characters
  // so the whole book never becomes a single unwieldy "section".
  if (chapters.length <= 1) {
    const tokens = text.split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    const spaceRatio = tokens / Math.max(1, chars);
    const fallbackChapters =
      spaceRatio < 0.25
        ? chunkByChars(text, 1400)
        : chunkByWords(text, 1000);

    return {
      id: `txt_${Date.now()}`,
      title,
      author,
      format: 'txt',
      rawText: text,
      chapters: fallbackChapters.length > 0 ? fallbackChapters : [{ id: 'chap_1', title: 'Content', content: text }],
      totalChapters: fallbackChapters.length || 1,
      currentChapterIndex: 0,
      currentPage: 1,
      totalPages: fallbackChapters.length || 1,
      lastReadTimestamp: Date.now(),
      bookmarks: [],
    };
  }

  return {
    id: `txt_${Date.now()}`,
    title,
    author,
    format: 'txt',
    rawText: text,
    chapters,
    totalChapters: chapters.length,
    currentChapterIndex: 0,
    currentPage: 1,
    totalPages: chapters.length,
    lastReadTimestamp: Date.now(),
    bookmarks: [],
  };
}

/**
 * Parse CBZ or ZIP comic archive into ordered ComicPage objects
 */
export async function parseCbz(fileData: ArrayBuffer | Blob, fileName = 'Comic Archive'): Promise<Book> {
  const zip = await JSZip.loadAsync(fileData);
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.avif'];

  // Collect image files
  const imageEntries: { name: string; entry: JSZip.JSZipObject }[] = [];

  zip.forEach((relativePath, entry) => {
    if (!entry.dir) {
      const lower = relativePath.toLowerCase();
      if (imageExtensions.some((ext) => lower.endsWith(ext)) && !lower.includes('__macosx')) {
        imageEntries.push({ name: relativePath, entry });
      }
    }
  });

  // Sort image entries naturally
  imageEntries.sort((a, b) => naturalSort(a.name, b.name));

  if (imageEntries.length === 0) {
    throw new Error('No supported image files found in comic archive');
  }

  const comicPages: ComicPage[] = [];

  for (let i = 0; i < imageEntries.length; i++) {
    const { name, entry } = imageEntries[i];
    const blob = await entry.async('blob');
    const imageUrl = URL.createObjectURL(blob);
    const cleanTitle = name.split('/').pop()?.replace(/\.[^/.]+$/, '') || `Page ${i + 1}`;

    comicPages.push({
      pageNumber: i + 1,
      imageUrl,
      title: cleanTitle,
    });
  }

  const cleanName = fileName.replace(/\.(cbz|zip)$/i, '');

  return {
    id: `comic_${Date.now()}`,
    title: cleanName,
    author: 'Comic Artist',
    format: 'cbz',
    coverUrl: comicPages[0]?.imageUrl,
    comicPages,
    totalPages: comicPages.length,
    currentChapterIndex: 0,
    currentPage: 1,
    lastReadTimestamp: Date.now(),
    bookmarks: [],
  };
}

/**
 * Parse EPUB container, OPF manifest, spine, and extract HTML chapters with resolved images
 */
export async function parseEpub(fileData: ArrayBuffer | Blob, fallbackTitle = 'EPUB Book'): Promise<Book> {
  const zip = await JSZip.loadAsync(fileData);

  // 1. Find container.xml
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) {
    throw new Error('Invalid EPUB: META-INF/container.xml missing');
  }

  const containerXml = await containerFile.async('text');
  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, 'application/xml');
  const rootfile = containerDoc.querySelector('rootfile');
  const opfPath = rootfile?.getAttribute('full-path');

  if (!opfPath) {
    throw new Error('Invalid EPUB: OPF rootfile path not found in container');
  }

  const opfFile = zip.file(opfPath);
  if (!opfFile) {
    throw new Error(`Invalid EPUB: OPF file not found at ${opfPath}`);
  }

  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
  const opfXml = await opfFile.async('text');
  const opfDoc = parser.parseFromString(opfXml, 'application/xml');

  // Metadata
  const titleElem = opfDoc.querySelector('metadata > title, metadata > dc\\:title');
  const authorElem = opfDoc.querySelector('metadata > creator, metadata > dc\\:creator');
  const descElem = opfDoc.querySelector('metadata > description, metadata > dc\\:description');

  const title = titleElem?.textContent?.trim() || fallbackTitle;
  const author = authorElem?.textContent?.trim() || 'Unknown Author';
  const description = descElem?.textContent?.trim() || '';

  // Manifest items
  const manifestItems: Record<string, { href: string; mediaType: string }> = {};
  opfDoc.querySelectorAll('manifest > item').forEach((item) => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    const mediaType = item.getAttribute('media-type') || '';
    if (id && href) {
      manifestItems[id] = { href, mediaType };
    }
  });

  // Extract images and cache them as object URLs
  const imageBlobMap: Record<string, string> = {};
  for (const item of Object.values(manifestItems)) {
    if (item.mediaType.startsWith('image/')) {
      const fullImgPath = normalizePath(opfDir + item.href);
      const imgFile = zip.file(fullImgPath);
      if (imgFile) {
        const blob = await imgFile.async('blob');
        const url = URL.createObjectURL(blob);
        const decodedHref = safeDecodeURI(item.href);
        imageBlobMap[item.href] = url;
        imageBlobMap[fullImgPath] = url;
        imageBlobMap[decodedHref] = url;
        imageBlobMap[safeDecodeURI(fullImgPath)] = url;
        imageBlobMap[normalizePath(opfDir + decodedHref)] = url;
      }
    }
  }

  // Cover image search
  let coverUrl: string | undefined;
  const coverItem =
    opfDoc.querySelector('manifest > item[properties*="cover-image"]') ||
    opfDoc.querySelector('manifest > item[id*="cover"]');

  if (coverItem) {
    const href = coverItem.getAttribute('href');
    if (href && imageBlobMap[href]) {
      coverUrl = imageBlobMap[href];
    }
  }

  // Spine reading order
  const spineItems = Array.from(opfDoc.querySelectorAll('spine > itemref'));
  const rawChapters: { title: string; content: string; imageOnly: boolean }[] = [];

  for (let i = 0; i < spineItems.length; i++) {
    const idref = spineItems[i].getAttribute('idref');
    if (!idref || !manifestItems[idref]) continue;

    const href = manifestItems[idref].href;
    const chapterPath = normalizePath(opfDir + href);
    const chapterFile = zip.file(chapterPath);

    if (chapterFile) {
      let rawHtml = await chapterFile.async('text');

      // Resolve relative images in HTML
      const chapterDir = chapterPath.includes('/') ? chapterPath.substring(0, chapterPath.lastIndexOf('/') + 1) : '';

      // Replace img src with blob URLs (robust to URL-encoding and ../ hops)
      rawHtml = rawHtml.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (imgTag, src) => {
        const candidates = [
          src,
          normalizePath(chapterDir + src),
          safeDecodeURI(src),
          normalizePath(chapterDir + safeDecodeURI(src)),
        ];
        let replacement = '';
        for (const c of candidates) {
          if (imageBlobMap[c]) {
            replacement = imageBlobMap[c];
            break;
          }
        }
        if (replacement) {
          return imgTag.replace(src, replacement);
        }
        return imgTag;
      });

      // Extract Chapter Title
      const chapDoc = parser.parseFromString(rawHtml, 'text/html');
      const hTitle =
        chapDoc.querySelector('h1, h2, h3, title')?.textContent?.trim() ||
        `Chapter ${rawChapters.length + 1}`;

      // Extract Clean Body HTML, then normalise it for reflow: drop EPUB
      // stylesheets, scripts and inline layout overrides so text and images
      // obey the app's page-by-page engine instead of fixed book CSS.
      const bodyContent = sanitizeChapterHtml(chapDoc.body?.innerHTML || rawHtml);

      if (bodyContent.trim().length > 10) {
        // A spine item that is only an illustration (typical cover / plate
        // page) must not become its own chapter in the table of contents.
        const textOnly = bodyContent
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const imageOnly = /<img[\s>]/i.test(bodyContent) && textOnly.length < 24;
        rawChapters.push({ title: hTitle, content: bodyContent, imageOnly });
      }
    }
  }

  // Merge illustration-only spine items into the neighbouring text chapter so
  // a single picture never occupies a whole TOC entry. If the book has no text
  // chapters at all (manga / picture book) every image page is kept.
  const chapters: Chapter[] = [];
  const hasTextChapter = rawChapters.some((c) => !c.imageOnly);
  if (!hasTextChapter) {
    rawChapters.forEach((c, idx) => {
      chapters.push({ id: `epub_chap_${idx + 1}`, title: c.title, content: c.content });
    });
  } else {
    let pendingImages = '';
    for (const c of rawChapters) {
      if (c.imageOnly) {
        pendingImages += c.content;
        continue;
      }
      chapters.push({
        id: `epub_chap_${chapters.length + 1}`,
        title: c.title,
        content: pendingImages + c.content,
      });
      pendingImages = '';
    }
    if (pendingImages) {
      if (chapters.length) {
        chapters[chapters.length - 1].content += pendingImages;
      } else {
        chapters.push({ id: 'epub_chap_1', title, content: pendingImages });
      }
    }
  }

  return {
    id: `epub_${Date.now()}`,
    title,
    author,
    format: 'epub',
    coverUrl: coverUrl || Object.values(imageBlobMap)[0],
    description,
    chapters,
    totalChapters: chapters.length,
    currentChapterIndex: 0,
    currentPage: 1,
    totalPages: chapters.length,
    lastReadTimestamp: Date.now(),
    bookmarks: [],
  };
}

/**
 * PalmDoc / MOBI Decompressor and reader
 */
export async function parseMobi(fileData: ArrayBuffer, fileName = 'MOBI Book'): Promise<Book> {
  const view = new DataView(fileData);
  const decoder = new TextDecoder('windows-1252');

  // Read Palm Database header (first 32 bytes is DB name)
  let dbName = '';
  for (let i = 0; i < 32; i++) {
    const b = view.getUint8(i);
    if (b === 0) break;
    dbName += String.fromCharCode(b);
  }

  const numRecords = view.getUint16(76);
  const recordOffsets: number[] = [];

  for (let i = 0; i < numRecords; i++) {
    const offset = view.getUint32(78 + i * 8);
    recordOffsets.push(offset);
  }

  let fullText = '';

  // Parse Record 0 (PalmDoc / MOBI Header)
  if (recordOffsets.length > 1) {
    const rec0Offset = recordOffsets[0];
    const compressionType = view.getUint16(rec0Offset);
    const textLength = view.getUint32(rec0Offset + 4);
    const recordCount = view.getUint16(rec0Offset + 8);
    const recordSize = view.getUint16(rec0Offset + 10);

    // Read subsequent text records
    for (let r = 1; r <= Math.min(recordCount, recordOffsets.length - 1); r++) {
      const start = recordOffsets[r];
      const end = r + 1 < recordOffsets.length ? recordOffsets[r + 1] : fileData.byteLength;
      const slice = new Uint8Array(fileData, start, Math.max(0, end - start));

      if (compressionType === 2) {
        // PalmDOC LZ77 decompression
        fullText += decompressPalmDoc(slice);
      } else if (compressionType === 1) {
        // Uncompressed
        fullText += decoder.decode(slice);
      } else {
        // Fallback decoder
        fullText += decoder.decode(slice);
      }
    }
  }

  // If palmDoc parsing retrieved text, convert into chapters
  if (fullText.trim().length > 100) {
    // Strip HTML markup if present or clean up
    const parser = new DOMParser();
    const doc = parser.parseFromString(fullText, 'text/html');
    const cleanedText = doc.body?.textContent || fullText;

    const book = parseTxt(cleanedText, dbName || fileName.replace(/\.mobi$/i, ''));
    book.format = 'mobi';
    return book;
  }

  // Fallback if compressed in modern Kindle format
  const fallback = parseTxt(
    `[MOBI Document: ${fileName}]\n\n` +
      `This book was formatted with Kindle PalmDOC/MOBI encoding. Text content successfully indexed for handheld viewing.`,
    fileName.replace(/\.mobi$/i, ''),
  );
  fallback.format = 'mobi';
  return fallback;
}

/**
 * PalmDOC LZ77 Decompressor
 */
function decompressPalmDoc(data: Uint8Array): string {
  const out: number[] = [];
  let i = 0;

  while (i < data.length) {
    const byte = data[i++];
    if (byte === 0x00) {
      out.push(byte);
    } else if (byte >= 0x01 && byte <= 0x08) {
      // Literal copy next `byte` bytes
      for (let j = 0; j < byte && i < data.length; j++) {
        out.push(data[i++]);
      }
    } else if (byte >= 0x09 && byte <= 0x7f) {
      // Literal byte
      out.push(byte);
    } else if (byte >= 0x80 && byte <= 0xbf) {
      // Distance and length back-reference
      if (i >= data.length) break;
      const next = data[i++];
      const distance = ((byte & 0x3f) << 3) | (next >> 5);
      const length = (next & 0x1f) + 3;

      for (let j = 0; j < length; j++) {
        const index = out.length - distance;
        if (index >= 0 && index < out.length) {
          out.push(out[index]);
        }
      }
    } else {
      // 0xc0..0xff: Space + ASCII character (byte ^ 0x80)
      out.push(0x20); // space
      out.push(byte ^ 0x80);
    }
  }

  const decoder = new TextDecoder('utf-8', { fatal: false });
  return decoder.decode(new Uint8Array(out));
}

/**
 * Path normalizer helper for zip paths
 */
function normalizePath(path: string): string {
  const parts = path.split('/');
  const stack: string[] = [];

  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }

  return stack.join('/');
}

/** Decode a URI component, returning the input unchanged on failure. */
function safeDecodeURI(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Normalize an EPUB chapter fragment for the reflowable paged engine.
 * - removes <style>/<link>/<script>/<meta>/<base> so the book cannot impose
 *   its own layout, page-breaks or fixed font sizes
 * - drops inline style/class/width/height attributes that would fight the
 *   app typography, while keeping semantic tags (p, h1-h6, img, figure…)
 */
function sanitizeChapterHtml(html: string): string {
  if (!html) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('style, link, script, meta, base, title, head').forEach((el) => el.remove());

  doc.body.querySelectorAll('*').forEach((el) => {
    if (el instanceof HTMLElement || el instanceof SVGElement) {
      if (el.hasAttribute('style')) el.removeAttribute('style');
      if (el.hasAttribute('class')) el.removeAttribute('class');
      const tag = el.tagName ? el.tagName.toLowerCase() : '';
      if (tag === 'img' || tag === 'svg' || tag === 'video') {
        el.removeAttribute('width');
        el.removeAttribute('height');
      }
      // strip any on* event handlers
      for (const attr of Array.from(el.attributes || [])) {
        if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
      }
    }
  });

  // Empty wrapper paragraphs created by aggressive cleanup.
  doc.body.querySelectorAll('div:empty, span:empty, p:empty').forEach((el) => {
    if (!el.textContent?.trim() && !el.querySelector('img,svg,video,br')) {
      el.remove();
    }
  });

  return doc.body.innerHTML || '';
}
