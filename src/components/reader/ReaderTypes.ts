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
  css?: string;
  cover?: string;
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
  sentencesPerPage: number;
  ttsSpeed: number;
  ttsVoice: string;
  disableWordHighlighting: boolean;
  disableSentenceHighlighting: boolean;
  invisibleText: boolean;
  showCurrentWordWhenInvisible: boolean;
  highlightSentenceOnHover: boolean;
  lineSpacing: number;
  disableWordSpans: boolean;
  disableSentenceSpans: boolean;
  nativeLanguage: string;
  showAudioBarOnStart: boolean;
  enableHighlightWords: boolean;
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