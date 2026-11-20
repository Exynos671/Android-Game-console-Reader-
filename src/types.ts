export type BookFormat = 'txt' | 'epub' | 'pdf' | 'cbz' | 'mobi';

export type ReaderTheme = 'oled' | 'dark' | 'sepia' | 'paper' | 'retro' | 'gba' | 'gbp';

export type ReadingMode = 'paginated' | 'continuous' | 'manga_rtl' | 'webtoon';

export type PageTurnAnimation = 'instant' | 'slide' | 'fade';

/** Image display mode inside books (fit centred vs fullscreen + pan). */
export type ImageViewMode = 'fit' | 'full';

/** Which controller-binding slot a remap targets. */
export type BindSlot = 'primary' | 'secondary';

/** App-wide chrome appearance (library / menus / reading chrome). */
export type UiTheme = 'night' | 'day';

/** Global UI (chrome) scale — handheld screens need larger controls. */
export type UiScale = 'small' | 'medium' | 'large' | 'xlarge';

/** Physical panel type used to guard the OLED pure-black theme. */
export type ScreenPanel = 'auto' | 'oled' | 'lcd';

/** What the bottom progress bar counts against. */
export type BookProgressMode = 'chapter' | 'book';

export type ReaderFontFamily =
  | 'serif'
  | 'sans'
  | 'mono'
  | 'display'
  | 'pixel1'
  | 'pixel2';

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
  bindings: Record<ReaderAction, string>; // primary: action -> input identifier
  /** Optional second (alternate) binding per action. */
  secondaryBindings?: Partial<Record<ReaderAction, string>>;
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

/** A user-defined shelf folder / category. */
export interface BookCategory {
  id: string;
  name: string;
  createdAt: number;
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
  /** 0-based page index *inside* the current chapter (true paginated reading). */
  readerPage?: number;
  totalPages: number;
  lastReadTimestamp: number;
  bookmarks: number[]; // page or chapter indexes
  /** Which user folder this book belongs to ("" = uncategorized). */
  categoryId?: string;
  /** Cached real per-chapter reflowed page counts (whole-book progress). */
  measuredChapterPages?: number[];
  /** Cached count of chapters whose reflowed pages have been measured. */
  measuredChapterCount?: number;
  /** Revision of the plain-text parser that produced `chapters` (TXT books). */
  parserRevision?: number;
}

export interface ReaderSettings {
  fontSize: number; // in px
  lineHeight: number; // 1.2 to 2.2
  fontFamily: ReaderFontFamily;
  theme: ReaderTheme;
  readingMode: ReadingMode;
  distractionFree: boolean;
  marginSize: 'compact' | 'balanced' | 'relaxed';
  pageTurnAnimation: PageTurnAnimation;
  /** Duration of the page-turn animation in ms. */
  pageTurnSpeedMs: number;
  /** Book images: fit centred on screen, or fullscreen with stick panning. */
  imageViewMode: ImageViewMode;
  /** Whether the bottom progress counts whole-book pages or current chapter. */
  progressMode: BookProgressMode;
  showHudTimeAndBattery: boolean; // bottom info bar (progress / time / battery)
  bottomBarFontSize: 'xs' | 'sm' | 'md'; // size of the bottom info bar text
  backDoublePressMs: number; // double-press interval (ms) to exit a book
  immersiveMode: boolean; // hide the Android status/navigation bars
  uiTheme: UiTheme; // night (dark chrome) or day (light chrome)
  uiScale: UiScale; // global chrome size for small handheld screens
  screenPanel: ScreenPanel; // physical panel type (OLED guard)
  brightness: number; // 50 to 100%
  warmth: number; // 0 to 50%
}
