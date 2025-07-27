export interface BookSection {
  title: string;
  content: string;
  wordCount: number;
  id: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  sections: BookSection[];
  totalWords: number;
  fileName: string;
  dateAdded: string;
  storagePath?: string;
  downloadURL?: string;
  completed?: boolean;
  css: string;
  cover: string;
  wordsRead?: number; // Added for tracking words read
  wordsPerPage?: number; // Words per page for pagination (250-500, default 250)
}

export interface ReadingProgress {
  bookId: string;
  currentSection: number;
  lastRead: string;
}

export interface Word {
  word: string;
  type: WordType;
}

export type WordType = 'known' | 'tracking' | 'ignored' | 'unknown';

export interface ReaderSettings {
  readerFont: string;
  readerWidth: number;
  readerFontSize: number;
  disableWordUnderlines: boolean;
  viewMode: 'scroll-section' | 'scroll-book' | 'paginated-single' | 'paginated-two';
  disableWordsReadPopup: boolean;
  readerContainerStyle: 'contained' | 'border' | 'none' | 'full-width';
  ttsSpeed: number;
  ttsVoice: string | null;
  disableWordHighlighting: boolean;
  disableSentenceHighlighting: boolean;
  invisibleText: boolean;
  showCurrentWordWhenInvisible: boolean;
  highlightSentenceOnHover: boolean;
  lineSpacing: number;

  nativeLanguage: string;
  targetLanguage: string;
  dictionary: string;
  showAudioBarOnStart: boolean;
  enableHighlightWords: boolean;
  highlightInsteadOfUnderline?: boolean; // Use highlights instead of underlines for word status
  autoMarkUnknownAsKnownOnPageAdvance?: boolean; // Auto-mark unknown words as known when advancing pages
  autoMarkAsLearningOnPopupOpen?: boolean; // Auto-mark words as learning when opening popup
  disableWordDefinitionPopup?: boolean;
  disableClipboardButton?: boolean; // Hide clipboard button in reader
  enableMarkdown?: boolean; // Render page content as markdown
  enableSwipeNavigation?: boolean; // Enable swipe left/right for prev/next page
  autoMarkPageComplete?: boolean; // Automatically mark page complete when going to next page
  wordPopupDefaultTab?: 'definition' | 'explain' | 'translate' | 'sentence' | 'word-explain'; // Default tab for word popup
}

export interface TTSVoice {
  Name: string;
  LocalName?: string;
  Locale?: string;
}

export interface PopupState {
  word: string;
  x: number;
  y: number;
  status: WordType;
}

export interface DefinitionPopupState {
  word: string;
  anchor: { x: number; y: number } | null;
  loading: boolean;
  data: any;
  error: string | null;
}

export interface WiktionaryPopupState {
  word: string;
  anchor: { x: number; y: number } | null;
  loading: boolean;
  data: any;
  error: string | null;
}

export interface WordsReadPopupState {
  visible: boolean;
  wordCount: number;
}

export interface UnmarkedPopupState {
  visible: boolean;
  wordCount: number;
} 