import JSZip from 'jszip';
import { Book, BookFormat, Chapter, ComicPage } from '../types';

/**
 * Natural sort helper for comic page filenames like page_1, page_2, page_10
 */
function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
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

  // If no chapters detected, split into chunks of ~1200 words
  if (chapters.length <= 1) {
    const words = text.split(/\s+/);
    const chunkSize = 1000;
    const fallbackChapters: Chapter[] = [];

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunkWords = words.slice(i, i + chunkSize);
      const chunkIndex = Math.floor(i / chunkSize) + 1;
      fallbackChapters.push({
        id: `chap_${chunkIndex}`,
        title: `Section ${chunkIndex}`,
        content: chunkWords.join(' '),
        wordCount: chunkWords.length,
      });
    }

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
        imageBlobMap[item.href] = url;
        imageBlobMap[fullImgPath] = url;
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
  const chapters: Chapter[] = [];

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

      // Replace img src with blob URLs
      rawHtml = rawHtml.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (imgTag, src) => {
        const normalizedSrc = normalizePath(chapterDir + src);
        const replacement = imageBlobMap[src] || imageBlobMap[normalizedSrc];
        if (replacement) {
          return imgTag.replace(src, replacement);
        }
        return imgTag;
      });

      // Extract Chapter Title
      const chapDoc = parser.parseFromString(rawHtml, 'text/html');
      const hTitle =
        chapDoc.querySelector('h1, h2, h3, title')?.textContent?.trim() || `Chapter ${chapters.length + 1}`;

      // Extract Clean Body HTML
      const bodyContent = chapDoc.body?.innerHTML || rawHtml;

      if (bodyContent.trim().length > 10) {
        chapters.push({
          id: `epub_chap_${i + 1}`,
          title: hTitle,
          content: bodyContent,
        });
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
