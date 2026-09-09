export type BookFormat = 'txt' | 'epub' | 'pdf' | 'cbz' | 'mobi';

export type AspectRatio = 'native' | '16:9' | '3:2' | '4:3' | '1:1' | '9:16' | '9:20';

export type ReaderTheme = 'oled' | 'dark' | 'sepia' | 'paper' | 'retro';

export type ReadingMode = 'paginated' | 'continuous' | 'manga_rtl' | 'webtoon';

export type ReaderAction =
  | 'nextPage'
  | 'prevPage'
  | 'scrollDown'
  | 'scrollUp'
  | 'toggleDistractionFree'
  | 'toggleMenu'
  | 'toggleToc'
  | 'zoomIn'
  | 'zoomOut'
  | 'toggleTheme'
  | 'bookmark'
  | 'backToLibrary';

export interface GamepadBinding {
  action: ReaderAction;
  label: string;
  category: 'navigation' | 'reading' | 'display';
  primaryInput: string; // e.g. 'Button 5' (RB), 'Button 4' (LB), 'Axis 1+' (Left Stick Down)
  secondaryInput?: string;
  keyboardFallback: string; // e.g. 'PageDown', 'ArrowRight', 'e'
}

export interface ControllerProfile {
  id: string;
  name: string;
  description: string;
  bindings: Record<ReaderAction, string>; // action -> input identifier
  deadzone: number;
  scrollSpeed: number; // pixels per tick
  invertScroll: boolean;
  hapticFeedback: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  content: string; // HTML or plain text
  wordCount?: number;
}

export interface ComicPage {
  pageNumber: number;
  imageUrl: string;
  title?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  format: BookFormat;
  coverUrl?: string;
  description?: string;
  fileSize?: string;
  totalChapters?: number;
  chapters?: Chapter[];
  comicPages?: ComicPage[];
  pdfDataUrl?: string;
  rawText?: string;
  currentChapterIndex: number;
  currentPage: number;
  totalPages: number;
  lastReadTimestamp: number;
  bookmarks: number[]; // page or chapter indexes
}

export interface ReaderSettings {
  fontSize: number; // in px
  lineHeight: number; // 1.2 to 2.2
  fontFamily: 'serif' | 'sans' | 'mono' | 'display';
  theme: ReaderTheme;
  aspectRatio: AspectRatio;
  readingMode: ReadingMode;
  distractionFree: boolean;
  marginSize: 'compact' | 'balanced' | 'relaxed';
  pageTurnAnimation: 'instant' | 'slide' | 'fade';
  showHudTimeAndBattery: boolean;
  screenBezelPreview: boolean; // visual border preview for handheld consoles
  brightness: number; // 50 to 100%
  warmth: number; // 0 to 50%
}
