'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBooks, getBookJson, updateBookMetadata } from '@/services/epubService';
import { useAuth } from '@/hooks/useAuth';
import { UserService } from '@/services/userService';
import { WordService, WordType, Word } from '@/services/wordService';
import DOMPurify from 'dompurify';
import { createPortal } from 'react-dom';
import React from 'react';
import Head from 'next/head';
import { ReadingSessionService } from '@/services/readingSessionService';
import { FiCheck } from 'react-icons/fi';
import parse, { HTMLReactParserOptions, Text } from 'html-react-parser';
// @ts-ignore
import SpeechPlayerImport from '../../../components/SpeechPlayer.jsx';
const SpeechPlayer: any = SpeechPlayerImport;
import { Settings, Maximize2, List, CheckCircle, XCircle, ArrowLeft, Clipboard } from 'lucide-react';
import { EpubHtmlStyles } from '@/components/EpubHtmlStyles';
import { SentenceService } from '@/services/sentenceService';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/contexts/I18nContext';

// Types
interface BookSection {
  title: string;
  content: string;
  wordCount: number;
  id: string;
}

interface Book {
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

interface ReadingProgress {
  bookId: string;
  currentSection: number;
  lastRead: string;
}

export default function ReaderPage() {
  const { t } = useTranslation(['reader', 'common']);
  // All hooks must be called here, at the top level, before any return or conditional logic
  // (Move all useState, useEffect, useMemo, useCallback, useRef, etc. here)
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookId = searchParams ? searchParams.get('book') : null;
  const pageParam = searchParams ? searchParams.get('page') : null;
  const { user } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [readerFont, setReaderFont] = useState<string>('serif');
  const [readerWidth, setReaderWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return Number(localStorage.getItem('readerWidth')) || 1200;
    }
    return 1200;
  });
  const [readerFontSize, setReaderFontSize] = useState<number>(18);
  const [showHeader, setShowHeader] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [userWords, setUserWords] = useState<Word[]>([]);
  const [wordStatusMap, setWordStatusMap] = useState<{ [word: string]: WordType }>({});
  const [popup, setPopup] = useState<{ word: string; x: number; y: number; status: WordType } | null>(null);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [nativeLanguage, setNativeLanguage] = useState<string>('en');
  const [defPopup, setDefPopup] = useState<{
    word: string;
    anchor: { x: number; y: number } | null;
    loading: boolean;
    data: any;
    error: string | null;
  } | null>(null);
  const defPopupTimeout = useRef<NodeJS.Timeout | null>(null);
  const [shiftedWord, setShiftedWord] = useState<string | null>(null);
  const [showEntireBook, setShowEntireBook] = useState(false);
  const [disableWordUnderlines, setDisableWordUnderlines] = useState<boolean>(false);
  const [currentTheme, setCurrentTheme] = useState<string>('light');
  const [currentViewMode, setCurrentViewMode] = useState<'scroll-section' | 'scroll-book' | 'paginated-single' | 'paginated-two'>('scroll-section');
  const [isWideScreen, setIsWideScreen] = useState(false);
  const [readSections, setReadSections] = useState<{ [key: string]: boolean }>({});
  const [totalWordsRead, setTotalWordsRead] = useState(0);
  const [showWordsReadPopup, setShowWordsReadPopup] = useState({ visible: false, wordCount: 0 });
  const [disableWordsReadPopup, setDisableWordsReadPopup] = useState(false);
  const [showUnmarkedPopup, setShowUnmarkedPopup] = useState({ visible: false, wordCount: 0 });
  const [wiktionaryPopup, setWiktionaryPopup] = useState<{
    word: string;
    anchor: { x: number; y: number } | null;
    loading: boolean;
    data: any;
    error: string | null;
  } | null>(null);
  const wiktionaryPopupTimeout = useRef<NodeJS.Timeout | null>(null);
  // 1. Add new state for container style
  const [readerContainerStyle, setReaderContainerStyle] = useState<'contained' | 'border' | 'none' | 'full-width'>('contained');
  // 1. Add state for sentencesPerPage and sentence-based pagination
  const [sentencesPerPage, setSentencesPerPage] = useState<number>(50);
  const [sentencePages, setSentencePages] = useState<string[][]>([]); // Each page is an array of sentences
  const [currentSentencePage, setCurrentSentencePage] = useState(0);
  const [readPages, setReadPages] = useState<{ [key: number]: boolean }>({});

  // Add missing state variables to fix linter errors
  const [visibleSection, setVisibleSection] = useState(0);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Section-aware pagination state
  const [sectionPages, setSectionPages] = useState<string[][][]>([]); // sectionPages[sectionIndex][pageIndex] = [sentences]
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const [showSectionSidebar, setShowSectionSidebar] = useState(false);

  // Add state for read pages per section
  const [readPagesBySection, setReadPagesBySection] = useState<{ [sectionIdx: number]: Set<number> }>({});

  // State for TTS highlighting
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);
  const [disableSentenceSpans, setDisableSentenceSpans] = useState(false);

  const [isSentenceSelectMode, setIsSentenceSelectMode] = useState(false);
  const [forcedSpeechStartIndex, setForcedSpeechStartIndex] = useState<number | null>(null);

  // Add state for TTS settings
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [ttsVoice, setTtsVoice] = useState('es-MX-JorgeNeural');
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [isSpeechPlayerActive, setIsSpeechPlayerActive] = useState(true);
  const [showAudioBarOnStart, setShowAudioBarOnStart] = useState(true);
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);

  // Add state for available TTS voices
  const [availableVoices, setAvailableVoices] = useState<{ Name: string; LocalName?: string; Locale?: string }[]>([]);
  const [isFetchingVoices, setIsFetchingVoices] = useState(false);

  // Add state for tracking if 'w' is held
  const [isWHeld, setIsWHeld] = useState(false);

  // Add state for showing the currently-being-read word when invisible text is enabled
  const [showCurrentWordWhenInvisible, setShowCurrentWordWhenInvisible] = useState<boolean>(false);

  const speechPlayerRef = React.useRef(null);

  const [showSectionWordCount, setShowSectionWordCount] = useState(false);

  // Add state for sentence hover highlighting
  const [highlightSentenceOnHover, setHighlightSentenceOnHover] = useState(false);
  // Add state for currently hovered sentence
  const [currentlyHighlightedSentence, setCurrentlyHighlightedSentence] = useState<number | null>(null);
  // Add state for line spacing
  const [lineSpacing, setLineSpacing] = useState<number>(1.5);

  const [showSentenceSaved, setShowSentenceSaved] = useState(false);
  const [savedSentencesSet, setSavedSentencesSet] = useState<Set<string>>(new Set());

  // Fetch voices from Azure
  const fetchVoices = useCallback(async () => {
    setIsFetchingVoices(true);
    try {
      const region = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION || 'eastus';
      const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`;
      const headers: Record<string, string> = {};
      if (process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY) headers['Ocp-Apim-Subscription-Key'] = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY;
      const response = await fetch(endpoint, { headers });
      if (response.ok) {
        const voices = await response.json();
        setAvailableVoices(voices);
      }
    } catch {}
    setIsFetchingVoices(false);
  }, []);

  useEffect(() => { fetchVoices(); }, [fetchVoices]);

  // Helper: get total words for a page
  function getPageWordCount(sectionIdx: number, pageIdx: number): number {
    const page = sectionPages[sectionIdx]?.[pageIdx] || [];
    return page.join(' ').split(/\s+/).filter(Boolean).length;
  }

  // Function to handle when current reading sentence ends
  const onCurrentReadingSentenceEnd = useCallback((sentenceIndex: number) => {
    console.log('[ReaderPage] onCurrentReadingSentenceEnd called for sentence', sentenceIndex);
    setActiveSentenceIndex(null);
    setActiveWordIndex(null);
  }, []);

  // Helper: robust sentence splitter
  function splitSentences(text: string) {
    // Split after ., !, ?, ¿, ¡, even if no space after, and include closing punctuation
    // Handles Spanish and English sentence boundaries robustly
    return text.match(/[^.!?¿¡]+[.!?¿¡]+["']?(?=\s|$|[A-ZÁÉÍÓÚÑ¿¡])/g) || [];
  }

  // Build sectionPages on book or sentencesPerPage change
  useEffect(() => {
    if (!book) return;
    const newSectionPages: string[][][] = book.sections.map((section, idx) => {
      // Print the full content before splitting
      console.log(`Section ${idx + 1} (${section.title}): RAW CONTENT:`);
      console.log(section.content);
      // Split into sentences
      function splitSentences(text: string): string[] {
        const paragraphs = text.split(/\n\n+/g).map(p => p.trim()).filter(Boolean);
        const sentenceRegex = /(?<!\b[A-Z][a-z]\.|Sr\.|Sra\.|Dr\.|Dra\.|etc\.|No\.|N\u00ba)\s*(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ])/g;
        return paragraphs.flatMap(paragraph => paragraph.split(sentenceRegex).map((s: string) => s.trim()).filter(Boolean));
      }
      const sentences = splitSentences(section.content);
      // Print only the first 10 split sentences
      console.log(`Section ${idx + 1} (${section.title}): FIRST 10 SENTENCES:`);
      sentences.slice(0, 10).forEach((s: string, i: number) => console.log(`Sentence ${i + 1}:`, s));
      // Print the first sentence
      if (sentences.length > 0) {
        console.log(`Section ${idx + 1} (${section.title}): FIRST SENTENCE:`, sentences[0]);
      } else {
        console.log(`Section ${idx + 1} (${section.title}): No sentences found.`);
      }
      const pages: string[][] = [];
      for (let i = 0; i < sentences.length; i += sentencesPerPage) {
        pages.push(sentences.slice(i, i + sentencesPerPage));
      }
      return pages;
    });
    setSectionPages(newSectionPages);
    // Restore progress
    let sectionIdx = 0, pageIdx = 0;
    const key = `reader-last-pos-${book.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const obj = JSON.parse(saved);
        if (typeof obj.sectionIndex === 'number' && typeof obj.pageIndex === 'number') {
          sectionIdx = Math.max(0, Math.min(obj.sectionIndex, newSectionPages.length - 1));
          pageIdx = Math.max(0, Math.min(obj.pageIndex, (newSectionPages[sectionIdx]?.length || 1) - 1));
        }
      } catch {}
    }
    setCurrentSectionIndex(sectionIdx);
    setCurrentPageIndex(pageIdx);
  }, [book, sentencesPerPage]);

  // Save progress on change
  useEffect(() => {
    if (book?.id) {
      // Clamp indices to valid ranges before saving
      let sectionIdx = Math.max(0, Math.min(currentSectionIndex, sectionPages.length - 1));
      let pageIdx = Math.max(0, Math.min(currentPageIndex, (sectionPages[sectionIdx]?.length || 1) - 1));
      localStorage.setItem(`reader-last-pos-${book.id}`, JSON.stringify({ sectionIndex: sectionIdx, pageIndex: pageIdx }));
    }
  }, [book?.id, currentSectionIndex, currentPageIndex, sectionPages]);

  // Helper to get section title
  function getSectionTitle(section: BookSection | undefined, idx: number) {
    let title = section?.title?.trim() || '';
    if (!title) title = `Section ${idx + 1}`;
    if (title.length > 100) title = title.slice(0, 100) + '…';
    return title;
  }

    const [invisibleText, setInvisibleText] = useState<boolean>(false);

    // Set default for disableWordHighlighting and disableSentenceHighlighting to true, and highlightSentenceOnHover to false
    const [disableWordHighlighting, setDisableWordHighlighting] = useState<boolean>(true);
    const [disableSentenceHighlighting, setDisableSentenceHighlighting] = useState<boolean>(true);

  // Navigation helpers
  const goToPage = (sectionIdx: number, pageIdx: number) => {
    // Clamp indices
    sectionIdx = Math.max(0, Math.min(sectionIdx, sectionPages.length - 1));
    pageIdx = Math.max(0, Math.min(pageIdx, (sectionPages[sectionIdx]?.length || 1) - 1));
    setCurrentSectionIndex(sectionIdx);
    setCurrentPageIndex(pageIdx);
  };
  const nextPage = () => {
    if (!sectionPages.length) return;
    const pagesInSection = sectionPages[currentSectionIndex]?.length || 0;
    if (currentPageIndex < pagesInSection - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    } else if (currentSectionIndex < sectionPages.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      setCurrentPageIndex(0);
    }
  };
  const prevPage = () => {
    if (!sectionPages.length) return;
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    } else if (currentSectionIndex > 0) {
      const prevSectionPages = sectionPages[currentSectionIndex - 1]?.length || 1;
      setCurrentSectionIndex(currentSectionIndex - 1);
      setCurrentPageIndex(prevSectionPages - 1);
    }
  };

  // Sync currentSentencePage with URL parameter changes
  useEffect(() => {
    if (pageParam && !isNaN(Number(pageParam))) {
      const pageNum = Math.max(0, Math.min(Number(pageParam), sentencePages.length - 1));
      if (pageNum !== currentSentencePage) {
        setCurrentSentencePage(pageNum);
      }
    }
  }, [pageParam, sentencePages.length, currentSentencePage]);

  // Load book from Firebase Storage
  useEffect(() => {
    // This effect loads the book metadata and content for the current user and bookId.
    // It first tries to load from localStorage for speed, then falls back to fetching from storage if not cached.
    // Sets the book state and current section, or error if not found.
    if (!user?.uid || !bookId) return;
    console.log('Current userId (reader):', user.uid);
    getBooks(user.uid).then(async (metadatas) => {
      const meta = metadatas.find((m) => m.bookId === bookId);
      console.log('Found meta:', meta);
      if (meta) {
        const localKey = `epub-book-${meta.bookId}`;
        let bookObj = null;
        const cached = localStorage.getItem(localKey);
        console.log('Reader: localStorage key', localKey, 'cached:', cached);
        if (cached) {
          try {
            bookObj = JSON.parse(cached);
            console.log('Reader: loaded from localStorage:', bookObj);
          } catch { bookObj = null; }
        }
        if (!bookObj && meta.downloadURL) {
          try {
            console.log('Reader: fetching from storage:', meta.downloadURL);
            bookObj = await getBookJson(meta.downloadURL);
            console.log('Reader: fetched from storage:', bookObj);
            if (bookObj && bookObj.sections && Array.isArray(bookObj.sections)) {
              localStorage.setItem(localKey, JSON.stringify(bookObj));
              console.log('Reader: saved to localStorage:', localKey);
            } else {
              setError('Book data from storage is invalid.');
              setBook(null);
              return;
            }
          } catch (e) {
            setError('Failed to load book from storage.');
            setBook(null);
            console.error('Reader: failed to fetch book JSON:', e);
            return;
          }
        }
        if (bookObj && bookObj.sections && Array.isArray(bookObj.sections)) {
          const book = { ...bookObj, ...meta, id: meta.bookId };
          console.log('Fetched book in reader:', { id: book.id, title: book.title });
          setBook(book);
          let sectionNum = 0;
          if (typeof (meta as any).currentSection === 'number') {
            sectionNum = (meta as any).currentSection;
          } else if (pageParam && !isNaN(Number(pageParam))) {
            sectionNum = Math.max(0, Math.min(Number(pageParam), bookObj.sections.length - 1));
          }
          // Don't set currentSentencePage here - it will be set in the sentencePages effect
        } else {
          setError('Book could not be loaded.');
          setBook(null);
        }
      } else {
        setError('Book not found.');
        setBook(null);
      }
    });
  }, [user, bookId, pageParam]);

  // 2. On book load, flatten all section contents and paginate by sentencesPerPage
  useEffect(() => {
    if (!book) return;
    // Flatten all section contents into a single string
    const allText = book.sections.map(s => s.content).join(' ');
    // Split into sentences (keep punctuation)
    const sentences = allText.match(/[^.!?\n]+[.!?]+["']?(?=\s|$)|[^.!?\n]+$/g) || [];
    // Chunk into pages
    const newPages: string[][] = [];
    for (let i = 0; i < sentences.length; i += sentencesPerPage) {
      newPages.push(sentences.slice(i, i + sentencesPerPage));
    }
    setSentencePages(newPages);
    // Set initial page based on URL parameter, saved progress, or localStorage
    if (pageParam && !isNaN(Number(pageParam))) {
      const pageNum = Math.max(0, Math.min(Number(pageParam), newPages.length - 1));
      setCurrentSentencePage(pageNum);
    } else {
      // Try to restore from localStorage
      let lastPage = 0;
      if (book.id) {
        const saved = localStorage.getItem(`reader-last-page-${book.id}`);
        if (saved && !isNaN(Number(saved))) {
          lastPage = Math.max(0, Math.min(Number(saved), newPages.length - 1));
        }
      }
      setCurrentSentencePage(lastPage);
    }
  }, [book, sentencesPerPage, pageParam]);

  // Auto-scroll effect
  useEffect(() => {
    let scrollInterval: NodeJS.Timeout;
    if (isAutoScrolling && contentRef.current) {
      // New calculation: always a visible speed, 0.5x = 0.375*baseSpeed
      const baseSpeed = 40; // px/sec, can be tuned
      const interval = 16;
      // pixelsPerInterval = baseSpeed * (0.25 + scrollSpeed * 0.25)
      // 0.5x = 0.375*baseSpeed, 1x = 0.5*baseSpeed, 2x = baseSpeed, 5x = 1.5*baseSpeed
      const pixelsPerInterval = (baseSpeed * (0.25 + scrollSpeed * 0.25) * interval) / 1000;
      const smoothScroll = () => {
        if (contentRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
          if (scrollTop + clientHeight >= scrollHeight - 50) {
            if (book && currentSentencePage < sentencePages.length - 1) {
              nextSentencePage();
            } else {
              setIsAutoScrolling(false);
            }
          } else {
            contentRef.current.scrollTop += pixelsPerInterval;
          }
        }
      };
      scrollInterval = setInterval(smoothScroll, interval);
    }
    return () => { if (scrollInterval) clearInterval(scrollInterval); };
  }, [isAutoScrolling, scrollSpeed, currentSentencePage, sentencePages.length, book]);

  useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = 0; }, [currentSentencePage]);

  const backToLibrary = () => {
    router.push('/library');
  };

  // Save reading progress to Firestore metadata and localStorage
  useEffect(() => {
    // This effect saves the user's reading progress for the current book and section.
    // It updates both localStorage and Firestore metadata for persistence.
    if (book && user?.uid) {
      // Save to localStorage
      const progress: ReadingProgress = {
        bookId: book.id,
        currentSection: currentSentencePage,
        lastRead: new Date().toISOString()
      };
      const savedProgress = localStorage.getItem('epub-reader-progress');
      let allProgress: ReadingProgress[] = [];
      if (savedProgress) {
        allProgress = JSON.parse(savedProgress);
        allProgress = allProgress.filter(p => p.bookId !== book.id);
      }
      allProgress.push(progress);
      localStorage.setItem('epub-reader-progress', JSON.stringify(allProgress));
      // Save to Firestore metadata
      updateBookMetadata(user.uid, book.id, { currentSection: currentSentencePage });
    }
  }, [book, currentSentencePage, user]);

  // Load preferences on mount
  useEffect(() => {
    if (user?.uid) {
      UserService.getUserPreferences(user.uid).then(prefs => {
        if (prefs) {
          setReaderFont(prefs.readerFont || 'serif');
          setReaderWidth(prefs.readerWidth || 700);
          setReaderFontSize(prefs.readerFontSize || 18);
          setDisableWordUnderlines(!!prefs.disableWordUnderlines);
          setCurrentTheme(prefs.theme || 'light');
          setCurrentViewMode((prefs.viewMode as 'scroll-section' | 'scroll-book' | 'paginated-single' | 'paginated-two') || 'scroll-section');
          setDisableWordsReadPopup(!!prefs.disableWordsReadPopup);
          
          // Load new reader-specific preferences
          setReaderContainerStyle(prefs.readerContainerStyle || 'contained');
          setSentencesPerPage(prefs.sentencesPerPage || 50);
          setTtsSpeed(prefs.ttsSpeed || 1.0);
          setTtsVoice(prefs.ttsVoice || 'es-MX-JorgeNeural');
          setDisableWordHighlighting(prefs.disableWordHighlighting !== undefined ? prefs.disableWordHighlighting : true);
          setDisableSentenceHighlighting(prefs.disableSentenceHighlighting !== undefined ? prefs.disableSentenceHighlighting : true);
          setInvisibleText(!!prefs.invisibleText);
          setShowCurrentWordWhenInvisible(!!prefs.showCurrentWordWhenInvisible);
          setHighlightSentenceOnHover(!!prefs.highlightSentenceOnHover);
          setLineSpacing(prefs.lineSpacing || 1.5);
          setDisableWordSpans(!!prefs.disableWordSpans);
          setDisableSentenceSpans(!!prefs.disableSentenceSpans);
          
          // Load additional preferences
          setNativeLanguage(prefs.nativeLanguage || 'en');
          setCurrentTheme(prefs.theme || 'light');
          setCurrentViewMode((prefs.viewMode as 'scroll-section' | 'scroll-book' | 'paginated-single' | 'paginated-two') || 'scroll-section');
          setShowAudioBarOnStart(!!prefs.showAudioBarOnStart);
          setIsSpeechPlayerActive(!!prefs.showAudioBarOnStart);
        }
      });
    }
  }, [user]);

  // Detect wide screen for two-page spread
  useEffect(() => {
    const checkWideScreen = () => {
      setIsWideScreen(window.innerWidth > 1024);
    };
    checkWideScreen();
    window.addEventListener('resize', checkWideScreen);
    return () => window.removeEventListener('resize', checkWideScreen);
  }, []);

  // Apply theme to html[data-theme]
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme, currentViewMode]);

  // Save preferences when changed
  const savePreferences = async (
    font: string,
    width: number,
    fontSize: number,
    disableUnderlines = disableWordUnderlines,
    theme = currentTheme,
    viewMode = currentViewMode,
    disableWordsReadPopupValue = disableWordsReadPopup,
    containerStyle = readerContainerStyle,
    sentencesPerPageValue = sentencesPerPage,
    ttsSpeedValue = ttsSpeed,
    ttsVoiceValue = ttsVoice,
    disableWordHighlightingValue = disableWordHighlighting,
    disableSentenceHighlightingValue = disableSentenceHighlighting,
    invisibleTextValue = invisibleText,
    showCurrentWordWhenInvisibleValue = showCurrentWordWhenInvisible,
    highlightSentenceOnHoverValue = highlightSentenceOnHover,
    lineSpacingValue = lineSpacing,
    disableWordSpansValue = disableWordSpans,
    disableSentenceSpansValue = disableSentenceSpans,
    nativeLanguageValue = nativeLanguage
  ) => {
    // This function saves the user's reader preferences to the backend.
    // It is called whenever a setting is changed in the UI.
    if (user?.uid) {
      console.log('Saving preferences:', { 
        font, width, fontSize, disableUnderlines, theme, viewMode, 
        disableWordsReadPopupValue, containerStyle, sentencesPerPageValue,
        ttsSpeedValue, ttsVoiceValue, disableWordHighlightingValue,
        disableSentenceHighlightingValue, invisibleTextValue,
        showCurrentWordWhenInvisibleValue, highlightSentenceOnHoverValue,
        lineSpacingValue, disableWordSpansValue, disableSentenceSpansValue
      });
      await UserService.updateUserPreferences(user.uid, {
        readerFont: font,
        readerWidth: width,
        readerFontSize: fontSize,
        disableWordUnderlines: disableUnderlines,
        theme: theme,
        viewMode: viewMode,
        disableWordsReadPopup: disableWordsReadPopupValue,
        readerContainerStyle: containerStyle,
        sentencesPerPage: sentencesPerPageValue,
        ttsSpeed: ttsSpeedValue,
        ttsVoice: ttsVoiceValue,
        disableWordHighlighting: disableWordHighlightingValue,
        disableSentenceHighlighting: disableSentenceHighlightingValue,
        invisibleText: invisibleTextValue,
        showCurrentWordWhenInvisible: showCurrentWordWhenInvisibleValue,
        highlightSentenceOnHover: highlightSentenceOnHoverValue,
        lineSpacing: lineSpacingValue,
        disableWordSpans: disableWordSpansValue,
        disableSentenceSpans: disableSentenceSpansValue,
        nativeLanguage: nativeLanguageValue,
        showAudioBarOnStart: showAudioBarOnStart,
      });
    }
  };

  // Fullscreen handler
  const handleFullscreen = () => {
    if (typeof window !== 'undefined') {
      const elem = document.documentElement;
      if (!document.fullscreenElement) {
        elem.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    }
  };

  // Collapse handler (for demo, just scrolls to top)
  const handleCollapse = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch user words on mount
  useEffect(() => {
    if (user?.uid) {
      WordService.getWords(user.uid).then(words => {
        setUserWords(words);
        const map: { [word: string]: WordType } = {};
        words.forEach(w => { map[w.word.toLowerCase()] = w.type; });
        setWordStatusMap(map);
      });
    }
  }, [user]);

  // Helper: tokenize paragraph into words and punctuation (Unicode-aware, don't split on accented letters)
  function tokenize(text: string) {
    if (!text) return [];
    // Split on spaces and keep punctuation as separate tokens, but keep all Unicode letters together
    // This regex matches words (including Unicode letters, apostrophes, hyphens), or punctuation/space
    return Array.from(text.matchAll(/([\p{L}\p{M}\d'-]+|[.,!?;:"()\[\]{}…—–\s]+)/gu)).map(m => m[0]);
  }

  // Helper: get next status (unknown -> known -> tracking -> ignored -> unknown)
  function nextStatus(current: WordType | undefined): WordType {
    if (!current) return 'known'; // unknown -> known
    if (current === 'known') return 'tracking';
    if (current === 'tracking') return 'ignored';
    if (current === 'ignored') return 'known'; // ignored -> unknown (which is not in the map, so nextStatus returns 'known')
    return 'known';
  }



  // Helper: get underline style
  function getUnderline(type: WordType | undefined, hovered: boolean) {
    if (type === 'tracking') return '2px solid #a78bfa'; // purple
    if (!type) return 'none'; // no underline for unknown
    if (type === 'known') return hovered ? '2px solid #16a34a' : 'none';
    if (type === 'ignored') return hovered ? '2px solid #222' : 'none';
    return 'none';
  }

  // Use localStorage/cache for word map
  useEffect(() => {
    if (user?.uid) {
      const cacheKey = `epub-wordmap-${user.uid}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const map = JSON.parse(cached);
          setWordStatusMap(map);
        } catch {}
      } else {
        WordService.getWords(user.uid).then(words => {
          const map: { [word: string]: WordType } = {};
          words.forEach(w => { map[w.word.toLowerCase()] = w.type; });
          setWordStatusMap(map);
          localStorage.setItem(cacheKey, JSON.stringify(map));
        });
      }
    }
  }, [user]);

  // Update cache when wordStatusMap changes
  useEffect(() => {
    if (user?.uid) {
      const cacheKey = `epub-wordmap-${user.uid}`;
      localStorage.setItem(cacheKey, JSON.stringify(wordStatusMap));
    }
  }, [wordStatusMap, user]);





  // Memoize tokenized section content for smoother rendering
  const tokenizedSections = useMemo(() =>
    book?.sections.map(section => section.content.split('\n\n').map(tokenize)) || [],
    [book]
  );
  const currentTokenizedSection = tokenizedSections[currentSentencePage] || [];


  // Scroll handler for entire book mode
  useEffect(() => {
    if (!showEntireBook || !book) return;
    const handleScroll = () => {
      if (!sectionRefs.current.length) return;
      const headerHeight = isMobile ? 56 : 64;
      const scrollY = window.scrollY;
      let current = 0;
      for (let i = 0; i < sectionRefs.current.length; i++) {
        const ref = sectionRefs.current[i];
        if (ref) {
          const top = ref.getBoundingClientRect().top + scrollY;
          if (scrollY + headerHeight >= top) {
            current = i;
          } else {
            break;
          }
        }
      }
      setVisibleSection(current);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showEntireBook, book, isMobile]);

  // Helper to scroll to a section anchor in entire book mode
  const scrollToSection = (idx: number) => {
    const ref = sectionRefs.current[idx];
    if (ref) {
      const headerHeight = isMobile ? 56 : 64;
      const top = ref.getBoundingClientRect().top + window.scrollY - headerHeight - 8; // 8px extra margin
      window.scrollTo({
        top,
        behavior: 'smooth',
      });
      setVisibleSection(idx);
    }
};

  // Inject book CSS into the DOM, scoped to .epub-html
  React.useEffect(() => {
    // This effect injects the book's custom CSS into the DOM, scoped to the .epub-html class.
    // It ensures that book-specific styles do not leak outside the reading area.
    if (book?.css) {
      console.log('Injecting book CSS into DOM');
      let styleTag = document.getElementById('epub-book-css') as HTMLStyleElement | null;
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'epub-book-css';
        document.head.appendChild(styleTag);
      }
      // Prefix all CSS selectors with .epub-html to scope styles
      const scopedCss = book.css.replace(/(^|\})\s*([^@\s][^{]+)\s*\{/g, (match, brace, selector) => {
        // Don't prefix @keyframes or @font-face
        if (/^@/.test(selector.trim())) return match;
        // Prefix each selector in a comma-separated list
        const scoped = selector.split(',').map((sel: string) => `.epub-html ${sel.trim()}`).join(', ');
        return `${brace} ${scoped} {`;
      });
      styleTag.textContent = scopedCss;
    }
    return () => {
      const styleTag = document.getElementById('epub-book-css');
      if (styleTag) styleTag.remove();
    };
  }, [book?.css]);

  // Helper: check if a string is a valid image URL
  function isValidImageUrl(url: string | undefined): boolean {
    return !!url && (url.startsWith('http') || url.startsWith('data:image'));
  }

  // Load read sections on mount
  useEffect(() => {
    if (user?.uid && book?.id) {
      ReadingSessionService.getBookSessions(user.uid, book.id).then(sessions => {
        const readMap: { [sectionIdx: number]: Set<number> } = {};
        let totalWords = 0;
        sessions.forEach(session => {
          // sectionId is in the form 'sectionIdx-pageIdx'
          const [sectionIdx, pageIdx] = session.sectionId.split('-').map(Number);
          if (!isNaN(sectionIdx) && !isNaN(pageIdx)) {
            if (!readMap[sectionIdx]) readMap[sectionIdx] = new Set();
            readMap[sectionIdx].add(pageIdx);
          }
          totalWords += session.wordCount;
        });
        setReadPagesBySection(readMap);
        setTotalWordsRead(totalWords);
      });
    }
  }, [user, book]);


  const [disableWordSpans, setDisableWordSpans] = useState(false);
  
  // Navigation handlers for sentence pages
  const nextSentencePage = () => {
    console.log('[ReaderPage] nextSentencePage called');
    if (currentSentencePage < sentencePages.length - 1) {
      const newPage = currentSentencePage + 1;
      setCurrentSentencePage(newPage);
      router.push(`/reader?book=${book?.id}&page=${newPage}`, { scroll: false });
    }
  };

  // Previous sentence page
  const prevSentencePage = () => {
    console.log('[ReaderPage] prevSentencePage called');
    if (currentSentencePage > 0) {
      const newPage = currentSentencePage - 1;
      setCurrentSentencePage(newPage);
      router.push(`/reader?book=${book?.id}&page=${newPage}`, { scroll: false });
    }
  };

  // Mark as read
  const handleMarkAsRead = () => {
    setReadPages(prev => {
      const newRead = { ...prev };
      for (let i = 0; i <= currentSentencePage; i++) {
        newRead[i] = true;
      }
      return newRead;
    });
  };

  // Unmark as read
  const handleUnmarkAsRead = () => {
    setReadPages(prev => {
      const copy = { ...prev };
      delete copy[currentSentencePage];
      return copy;
    });
  };



  // Save current page to localStorage on every page change (must be before any return)
  useEffect(() => {
    if (book?.id && typeof currentSentencePage === 'number') {
      localStorage.setItem(`reader-last-page-${book.id}`, String(currentSentencePage));
    }
  }, [book?.id, currentSentencePage]);

  // Mark page complete
  const isPageRead = !!readPagesBySection[currentSectionIndex]?.has(currentPageIndex);

  // Mark page complete
  const handleMarkPageComplete = async () => {
    if (isPageRead) return;
    setReadPagesBySection(prev => {
      const copy = { ...prev };
      if (!copy[currentSectionIndex]) copy[currentSectionIndex] = new Set();
      copy[currentSectionIndex].add(currentPageIndex);
      return copy;
    });
    // Add to history and Firestore
    if (user?.uid && book) {
      const session = {
        userId: user.uid,
        // bookId is optional for new sessions, but include for backward compatibility
        bookId: book.id,
        bookTitle: book.title || '',
        sectionId: `${currentSectionIndex}-${currentPageIndex}`,
        sectionTitle: currentSection?.title || '',
        wordCount: getPageWordCount(currentSectionIndex, currentPageIndex),
        timestamp: new Date(),
      };
      await ReadingSessionService.addSession(session);
    }
    setTotalWordsRead(wr => wr + getPageWordCount(currentSectionIndex, currentPageIndex));
  };

  // Unmark page complete
  const handleUnmarkPageComplete = async () => {
    if (!isPageRead) return;
    setReadPagesBySection(prev => {
      const copy = { ...prev };
      if (copy[currentSectionIndex]) copy[currentSectionIndex].delete(currentPageIndex);
      return copy;
    });
    if (user?.uid && book) {
      await ReadingSessionService.removeSession({
        userId: user.uid,
        bookId: book.id,
        sectionId: `${currentSectionIndex}-${currentPageIndex}`,
      });
    }
    setTotalWordsRead(wr => {
      const newWr = Math.max(0, wr - getPageWordCount(currentSectionIndex, currentPageIndex));
      if (book) {
        window.dispatchEvent(new CustomEvent('rf-words-read-updated', { detail: { bookId: book.id, totalWordsRead: newWr } }));
      }
      return newWr;
    });
  };


  // Always recalculate section from currentSentencePage
  const section = book?.sections[currentSentencePage];

  // Add a derived value for isZeroWordSection - check if current page has content
  const isZeroWordSection = !sentencePages[currentSentencePage] || sentencePages[currentSentencePage].length === 0;

  // Helper to sanitize HTML: remove <a> tags and all event handlers
  function sanitizeHtml(html: string) {
    // Remove <a ...>...</a> tags
    let sanitized = html.replace(/<a [^>]*>(.*?)<\/a>/gi, '$1');
    // Remove inline event handlers (onclick, onmouseover, etc.)
    sanitized = sanitized.replace(/ on\w+="[^"]*"/gi, '');
    sanitized = sanitized.replace(/ on\w+='[^']*'/gi, '');
    return sanitized;
  }

  // Add a single WordSpan component for all word spans
  function WordSpan({ token, wordKey, wordStyle }: { token: string; wordKey: string; wordStyle?: React.CSSProperties }) {
    return (
      <span
        data-word-key={wordKey}
        className={"inline-block cursor-pointer transition-colors duration-150 word-span"}
        style={wordStyle}
      >
        {token}
      </span>
    );
  }

  // In scroll-section mode, use WordSpan for all words
  {section && section.content
    ? section.content.split('\n\n').map((paragraph, pIdx) => (
        <p key={pIdx} style={{ margin: '1em 0', fontFamily: readerFont, fontSize: readerFontSize, fontWeight: 400 }}>
          {paragraph}
        </p>
      ))
    : null}

  // In wrapSentencesAndWordsInHtml, use WordSpan for all words
  function wrapSentencesAndWordsInHtml(html: string) {
    const sanitized = sanitizeHtml(html);
    const options: HTMLReactParserOptions = {
      replace: (node: any) => {
        if (node.type === 'text') {
          // Split into sentences
          const sentences = splitSentences((node as Text).data);
          return sentences.map((sentence, sIdx) => {
            // Tokenize the sentence into words and punctuation
            const tokens = tokenize(sentence);
            return (
              <span key={sIdx} className="sentence-span">
                {tokens.map((token, i) => {
                  const isWord = /[\p{L}\p{M}\d'-]+/u.test(token);
                  const key = `html-${sIdx}-${i}`;
                  return token;
                })}
              </span>
            );
          });
        }
        // Remove all event handlers from elements
        if (node.attribs) {
          Object.keys(node.attribs).forEach(attr => {
            if (/^on/i.test(attr)) {
              delete node.attribs[attr];
            }
          });
        }
        return undefined;
      },
    };
    return parse(sanitized, options);
  }

  
// Add minimal CSS for .epub-html to ensure images, headings, and footnotes display well

// Add SectionCheckButton component
function SectionCheckButton({ isRead }: { isRead: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      tabIndex={-1}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="transition-colors duration-200 w-6 h-6 flex items-center justify-center rounded focus:outline-none border-none bg-transparent"
      style={{ padding: 0, minWidth: 24, display: 'inline-flex' }}
      aria-label={isRead ? (hovered ? 'Unmark as read' : 'Marked as read') : 'Mark as read'}
    >
      {isRead ? (
        hovered ? (
          <svg className="w-5 h-5 text-red-500 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <FiCheck className="text-green-500 w-5 h-5 transition-all duration-200" />
        )
      ) : null}
    </span>
  );
}

// Keyboard navigation for page turning
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      prevPage();
    } else if (e.key === 'ArrowRight') {
      nextPage();
    } else if (e.key === 'Enter') {
      if (isPageRead) {
        handleUnmarkPageComplete();
      } else {
        handleMarkPageComplete();
      }
    } else if (e.key === 'w' || e.key === 'W') {
      setIsWHeld(true);
    } else if (e.key === 'i' || e.key === 'I') {
      setInvisibleText(v => !v);
    } else if (e.key === 's' || e.key === 'S') {
      setShowSectionSidebar(v => !v);
    } else if (e.key === 'r' || e.key === 'R') {
      // @ts-ignore
      if (speechPlayerRef.current && typeof speechPlayerRef.current.repeatCurrentSentence === 'function') {
        // @ts-ignore
        speechPlayerRef.current.repeatCurrentSentence();
      }
    }
  };
  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'w' || e.key === 'W') {
      setIsWHeld(false);
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}, [prevPage, nextPage, isPageRead, handleMarkPageComplete, handleUnmarkPageComplete]);


  // Get reader container class
  function getReaderContainerClass() {
    if (readerContainerStyle === 'contained') return 'bg-white rounded-lg border-[0.75] border-black';
    if (readerContainerStyle === 'border') return 'bg-transparent border border-gray-300 rounded-lg';
    if (readerContainerStyle === 'full-width') return 'bg-white';
    return 'bg-transparent';
  }
  
  // Get reader container style
  function getReaderContainerStyle() {
    if (readerContainerStyle === 'full-width') {
      return { fontFamily: readerFont, fontSize: '1.1rem', width: '100%', maxWidth: '100%', margin: 0, padding: 0, boxShadow: 'none', border: 'none', background: 'white' };
    }
    let style: React.CSSProperties = { 
      fontFamily: readerFont, 
      fontSize: '1.1rem', 
      maxWidth: readerWidth, 
      width: readerWidth, 
      margin: '0', 
      padding: isMobile ? '1.5rem 0.75rem' : '2.5rem 2.5rem',
    };
    if (readerContainerStyle === 'none') {
      style = { ...style, boxShadow: 'none', border: 'none', background: 'transparent' };
    } else if (readerContainerStyle === 'border') {
      style = { ...style, boxShadow: 'none', background: 'transparent' };
    }
    return style;
  }

  // Get current section/page content safely
  const currentSection = book?.sections?.[currentSectionIndex];
  const currentPages = sectionPages[currentSectionIndex] || [];
  const currentPageSentences = currentPages[currentPageIndex] || [];

  // Calculate global page number and total pages
  const flatPages = sectionPages.flat();
  let globalPageNumber = 1;
  let totalPages = flatPages.length;
  if (sectionPages.length && currentSectionIndex < sectionPages.length) {
    globalPageNumber = sectionPages.slice(0, currentSectionIndex).reduce((acc, arr) => acc + arr.length, 0) + currentPageIndex + 1;
  }

  // Persist readPagesBySection in localStorage whenever it changes
  useEffect(() => {
    if (book?.id) {
      localStorage.setItem(`reader-read-pages-${book.id}`,
        JSON.stringify(Object.fromEntries(Object.entries(readPagesBySection).map(([k, v]) => [k, Array.from(v)])))
      );
    }
  }, [book?.id, readPagesBySection]);


  // Instead of currentPageSentences, create a flat array of all sentences for the page, with global indices
  const flatSentences: string[] = [];
  const sentenceToSectionMap: { sentenceIdx: number, sectionIdx: number, localSentenceIdx: number }[] = [];
  currentPageSentences.forEach((sentence, idx) => {
    flatSentences.push(sentence);
    sentenceToSectionMap.push({ sentenceIdx: idx, sectionIdx: currentSectionIndex, localSentenceIdx: idx });
  });



      // Place early returns for error and !book after all hooks
      if (error) {
        return (
          <div className="min-h-screen flex items-center justify-center text-red-600 text-xl">
            {t('reader:error', error)}
          </div>
        );
      }
    
      if (!book) {
        return (
          <div className="min-h-screen flex items-center justify-center text-gray-600 text-xl">
            {t('reader:bookNotFound', 'Book not found.')}
          </div>
        );
      }
  

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}>
      <EpubHtmlStyles />
      {/* Mobile: Dropdown icon is in the bar when header is visible, floating when hidden */}
      {isMobile ? (
        <div className="fixed top-0 left-0 w-full z-50 pointer-events-none" style={{ height: '56px' }}>
          <div className="relative w-full h-full flex items-center justify-end pr-2">
            <button
              onClick={() => setShowHeader((prev) => !prev)}
              className="absolute top-1/2 -translate-y-1/2 bg-white border-2 border-black shadow-lg rounded-full p-1 hover:bg-gray-100 transition-all pointer-events-auto mr-2"
              title={showHeader ? 'Hide top bar' : 'Show top bar'}
              style={{ zIndex: 60, right: '0.05rem' }}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="black" viewBox="0 0 24 24">
                <path d="M19 9l-7 7-7-7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowHeader((prev) => !prev)}
          className="fixed top-3 right-4 z-50 bg-white border-2 border-gray-300 shadow-lg rounded-full p-2 hover:bg-gray-100 transition-all"
          title={showHeader ? 'Hide top bar' : 'Show top bar'}
        >
          <svg className="w-6 h-6" fill="none" stroke="black" viewBox="0 0 24 24">
            {showHeader ? (
              <path d="M19 9l-7 7-7-7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M5 15l7-7 7 7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </button>
      )}
      {/* Header (conditionally rendered) */}
      {showHeader && (
        <div className="bg-white border-[0.75] border-black fixed top-0 left-0 w-full z-20" style={{ minHeight: isMobile ? '56px' : '64px', paddingTop: 0, paddingBottom: 0, fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}>
          <div className="w-full px-8 py-3 grid grid-cols-3 items-center gap-4" style={{ minHeight: '64px' }}>
            {/* Left section: Library button + Section toggle */}
            <div className="flex items-center gap-2 justify-start">
              <button 
                onClick={backToLibrary} 
                className={`flex items-center justify-center ${isMobile ? 'w-8 h-8 min-w-0 min-h-0 p-0' : 'gap-2 px-4 py-2'} font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors ${isMobile ? '' : 'text-base'}`}
                style={isMobile ? { width: 32, height: 32, minWidth: 28, minHeight: 28 } : {}}
              >
                <ArrowLeft className={isMobile ? 'w-4 h-4' : 'w-6 h-6'} />
              </button>
              <button 
                onClick={() => setShowSectionSidebar(v => !v)} 
                className={`rounded ${isMobile ? 'w-8 h-8 min-w-0 min-h-0 p-0 flex items-center justify-center bg-gray-200 hover:bg-gray-300' : 'px-3 py-2 bg-gray-200 hover:bg-gray-300 font-bold text-sm'}`}
                style={isMobile ? { width: 32, height: 32, minWidth: 28, minHeight: 28 } : {}}
                title={showSectionSidebar ? 'Hide Sections' : 'Show Sections'}
              >
                {isMobile ? (
                  <List className="w-4 h-4 text-[#232946]" />
                ) : (
                  <span style={{ color: '#232946', fontWeight: 700 }}>{showSectionSidebar ? 'Hide Sections' : 'Show Sections'}</span>
                )}
              </button>
              
              {/* Hide section name on mobile */}
              {!isMobile && (
                <span className="truncate font-extrabold text-lg ml-2" style={{maxWidth: '240px', color: '#232946', fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif'}}>
                  {getSectionTitle(currentSection, currentSectionIndex)}
                </span>
              )}
            </div>
            {/* Center section: Navigation controls (with audio button on left for mobile) */}
            <div className="flex items-center justify-center gap-2">
              {isMobile && (
                <button
                  onClick={() => setIsSpeechPlayerActive(!isSpeechPlayerActive)}
                  className="flex items-center justify-center h-8 w-8 min-w-0 min-h-0 font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors"
                  title={isSpeechPlayerActive ? 'Hide Speech Player' : 'Show Speech Player'}
                  style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, borderRadius: '50%' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </button>
              )}
              <button 
                onClick={prevPage} 
                disabled={globalPageNumber === 1} 
                className="flex items-center justify-center h-8 w-8 min-w-0 min-h-0 font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors disabled:bg-gray-300 disabled:text-gray-400"
                style={isMobile ? { width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0 } : { width: 36, height: 36 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-base font-bold text-[#232946] whitespace-nowrap">{globalPageNumber} / {totalPages}</span>
              <button 
                onClick={nextPage} 
                disabled={globalPageNumber === totalPages} 
                className="flex items-center justify-center h-8 w-8 min-w-0 min-h-0 font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors disabled:bg-gray-300 disabled:text-gray-400"
                style={isMobile ? { width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0 } : { width: 36, height: 36 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            {/* Right section: Settings and complete/uncomplete (and audio on desktop) */}
            <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'} justify-end mr-2`}>
              {/* Settings button */}
              <button
                onClick={() => setShowSettings(true)}
                className={`flex items-center justify-center h-8 w-8 min-w-0 min-h-0 font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors`}
                title="Reader Settings"
                aria-label="Reader Settings"
                style={isMobile ? { width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, borderRadius: '50%' } : {}}
              >
                <Settings className={isMobile ? 'w-5 h-5' : 'w-5 h-5'} />
              </button>
              {/* Fullscreen button: only show on desktop */}
              {!isMobile && (
                <button
                  onClick={handleFullscreen}
                  className="flex items-center gap-2 px-4 py-2 font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors text-base"
                  title="Fullscreen"
                  aria-label="Fullscreen"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              )}
              {/* Audio/Speech button on desktop */}
              {!isMobile && (
                <button
                  onClick={() => setIsSpeechPlayerActive(!isSpeechPlayerActive)}
                  className="flex items-center gap-2 px-4 py-2 font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors text-base"
                  title={isSpeechPlayerActive ? 'Hide Speech Player' : 'Show Speech Player'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  {isSpeechPlayerActive ? 'Hide' : 'Read Aloud'}
                </button>
              )}
              {/* Complete/Uncomplete button */}
              {isMobile ? (
                isPageRead ? (
                  <button onClick={handleUnmarkPageComplete} className="flex items-center justify-center w-8 h-8 min-w-0 min-h-0 p-0 rounded bg-green-500 text-white" title="Uncomplete">
                    <XCircle className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={handleMarkPageComplete} className="flex items-center justify-center w-8 h-8 min-w-0 min-h-0 p-0 rounded bg-blue-500 text-white" title="Complete">
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )
              ) : (
                isPageRead ? (
                  <button onClick={handleUnmarkPageComplete} className="rounded bg-green-500 text-white font-bold whitespace-nowrap px-4 py-2">Uncomplete</button>
                ) : (
                  <button onClick={handleMarkPageComplete} className="rounded bg-blue-500 text-white font-bold whitespace-nowrap px-4 py-2">Complete</button>
                )
              )}
            </div>
          </div>
        </div>
      )}
      {/* Layout: sidebar + main content */}
      <div style={{ height: showHeader ? '64px' : isMobile ? '40px' : '0' }} />
      <div className="flex w-full px-0 py-12" style={{ margin: '0 auto' }}>
        {/* Section Sidebar, only if showSectionSidebar */}
        {showSectionSidebar && (
          <div className="flex flex-col items-start pr-6" style={{ minWidth: 220 }}>
            <div className="font-bold text-lg mb-2 flex items-center gap-2">
              <span>{t('reader:sections', 'Sections')}</span>
              <label className="flex items-center gap-1 text-xs font-normal ml-2">
                <input
                  type="checkbox"
                  checked={showSectionWordCount}
                  onChange={e => setShowSectionWordCount(e.target.checked)}
                  className="accent-[#2563eb] h-4 w-4 border-gray-300 rounded"
                  style={{ marginRight: 4 }}
                />
                <span>{t('reader:showWordCount', 'Show word count')}</span>
              </label>
            </div>
            {book.sections.map((section, idx) => {
              const totalPages = sectionPages[idx]?.length || 0;
              const readPages = readPagesBySection[idx]?.size || 0;
              const allRead = totalPages > 0 && readPages === totalPages;
              return (
                <div key={section.id || idx} className="w-full mb-1">
                  <button
                    className={`w-full text-left px-4 py-2 rounded font-semibold transition-all ${idx === currentSectionIndex ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                    style={{ fontWeight: idx === currentSectionIndex ? 700 : 500, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    onClick={() => goToPage(idx, 0)}
                  >
                    <span>{getSectionTitle(section, idx)}</span>
                    {allRead ? (
                      <FiCheck className="text-green-500 ml-2" />
                    ) : totalPages > 0 ? (
                      <span className="ml-2 text-green-600 font-bold">{readPages} / {totalPages}</span>
                    ) : null}
                  </button>
                  {showSectionWordCount && (
                    <div className="pl-4 pb-1 text-xs text-gray-400" style={{ fontSize: 12 }}>
                      {section.wordCount?.toLocaleString() || 0} words
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {/* Main reading area (centered, text always starts at top) */}
        <div
          className="flex-1 flex justify-center transition-all duration-300"
          style={{
            marginLeft: 0,
            padding: isMobile ? '0 8px' : undefined,
            maxWidth: isMobile ? '100vw' : '100vw',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflowX: isMobile ? 'hidden' : undefined,
          }}
        >
          <div className="flex flex-col items-center justify-start w-full" style={{ minHeight: 'calc(100vh - 260px)', height: '100%' }}>
            <div className={getReaderContainerClass()} style={{
              ...getReaderContainerStyle(),
              margin: '0 auto',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              color: invisibleText && !disableSentenceHighlighting && !disableWordHighlighting ? 'rgba(0,0,0,0.001)' : '#232946',
              maxWidth: isMobile ? '95vw' : readerWidth,
              width: isMobile ? '100%' : readerWidth,
              padding: isMobile ? '1.25rem 0.5rem' : '1.5rem',
              boxSizing: 'border-box',
              overflowX: isMobile ? 'hidden' : undefined,
            }}>
              {/* Page content, always starts at top */}
              <div style={{ fontFamily: readerFont, fontSize: readerFontSize, maxWidth: readerWidth, width: '100%', color: invisibleText ? 'rgba(0,0,0,0.01)' : '#232946', lineHeight: lineSpacing }}>                {disableSentenceSpans ? (
                  <div>{flatSentences.join(' ') + ' '}</div>
                ) : (
                  flatSentences.map((sentence, sIdx) => {
                    const words = sentence.match(/\S+/g) || [];
                    const isSentenceHighlighted = sIdx === activeSentenceIndex && !disableSentenceHighlighting;
                    const isSentenceHovered = highlightSentenceOnHover && sIdx === currentlyHighlightedSentence;
                    const showCurrentSentence = invisibleText && isWHeld && isSentenceHighlighted;
                    const forceVisible = showCurrentSentence || (invisibleText && isWHeld && isSentenceHighlighted);
                    return (
                      <span
                        key={sIdx}
                        data-sentence-index={sIdx}
                        className={`${isSentenceHighlighted ? 'speaking-highlight' : ''} ${isSentenceSelectMode ? 'sentence-selectable' : ''}`}
                        style={{
                          marginRight: 8,
                          cursor: isSentenceSelectMode ? 'pointer' : (highlightSentenceOnHover ? 'pointer' : 'pointer'),
                          color: showCurrentSentence
                            ? '#232946'
                            : (invisibleText ? 'rgba(0,0,0,0.01)' : '#232946'),
                          background: isSentenceHovered ? 'rgba(56, 189, 248, 0.18)' : undefined,
                          borderRadius: isSentenceHovered ? '0.25em' : undefined,
                          transition: 'background 0.15s',
                          boxShadow: isSentenceHovered ? '0 -4px 0 0 rgba(56, 189, 248, 0.18)' : undefined,
                          display: 'inline',
                          verticalAlign: 'baseline',
                        }}
                        onClick={async () => {
                          if (isSentenceSelectMode) {
                            setForcedSpeechStartIndex(sIdx);
                            setIsSentenceSelectMode(false);
                            return;
                          }
                          if (!user?.uid) return;
                          if (savedSentencesSet.has(sentence)) return;
                          try {
                            await SentenceService.addSentence(user.uid, sentence);
                            setSavedSentencesSet(prev => new Set(prev).add(sentence));
                            setShowSentenceSaved(true);
                            setTimeout(() => setShowSentenceSaved(false), 1200);
                          } catch (err) {
                            // Optionally handle error
                          }
                        }}
                        onMouseEnter={highlightSentenceOnHover ? () => setCurrentlyHighlightedSentence(sIdx) : undefined}
                        onMouseLeave={highlightSentenceOnHover ? () => setCurrentlyHighlightedSentence(null) : undefined}
                      >
                        {disableWordSpans
                          ? sentence + ' '
                          : words.map((word, wIdx) => {
                              const isWordHighlighted = isSentenceHighlighted && wIdx === activeWordIndex && !disableWordHighlighting;
                              // Insert clipboard button before the first word of the first sentence on mobile
                              if (isMobile && sIdx === 0 && wIdx === 0) {
                                return [
                                  <button
                                    key="clipboard-btn"
                                    onClick={async () => {
                                      const text = flatSentences.join(' ');
                                      try {
                                        await navigator.clipboard.writeText(text);
                                        setShowCopyConfirm(true);
                                        setTimeout(() => setShowCopyConfirm(false), 1200);
                                        console.log('[Reader Copy] Copied text:', text);
                                      } catch (err) {
                                        console.error('[Reader Copy] Failed to copy:', err);
                                      }
                                    }}
                                    className="inline-flex items-center justify-center w-7 h-7 min-w-0 min-h-0 p-0 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 shadow border border-gray-300 mr-1 align-middle"
                                    title="Copy page text"
                                    style={{ verticalAlign: 'middle' }}
                                  >
                                    <Clipboard className="w-4 h-4" />
                                  </button>,
                                  <span
                                    key={wIdx}
                                    className={isWordHighlighted ? 'speaking-highlight-word' : ''}
                                    style={{
                                      marginRight: 4,
                                      color: showCurrentSentence
                                        ? '#232946'
                                        : (invisibleText
                                            ? (showCurrentWordWhenInvisible && isWordHighlighted
                                                ? '#232946'
                                                : 'rgba(0,0,0,0.001)')
                                            : undefined),
                                    }}
                                  >
                                    {word + ' '}
                                  </span>
                                ];
                              }
                              return (
                                <span
                                  key={wIdx}
                                  className={isWordHighlighted ? 'speaking-highlight-word' : ''}
                                  style={{
                                    marginRight: 4,
                                    color: showCurrentSentence
                                      ? '#232946'
                                      : (invisibleText
                                          ? (showCurrentWordWhenInvisible && isWordHighlighted
                                              ? '#232946'
                                              : 'rgba(0,0,0,0.001)')
                                          : undefined),
                                  }}
                                >
                                  {word + ' '}
                                </span>
                              );
                            })}
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Floating TTS Controls at the bottom */}
      {isSpeechPlayerActive && (
        <SpeechPlayer
          ref={speechPlayerRef}
          sentences={flatSentences}
          onSentenceChange={setActiveSentenceIndex}
          onWordChange={setActiveWordIndex}
          onSentenceSelect={setActiveSentenceIndex}
          onPlaybackFinish={() => {
            setActiveSentenceIndex(null);
            setActiveWordIndex(null);
            // Only close the popup if we are at the last sentence
            if (
              typeof activeSentenceIndex === 'number' &&
              flatSentences.length > 0 &&
              activeSentenceIndex >= flatSentences.length - 1
            ) {
              setIsSpeechPlayerActive(false);
            }
          }}
          speakingRate={ttsSpeed}
          voiceName={ttsVoice}
          onProgress={setActiveSentenceIndex}
          onCurrentReadingSentenceEnd={onCurrentReadingSentenceEnd}
          onSelectModeToggle={setIsSentenceSelectMode}
          forceStartAt={forcedSpeechStartIndex}
          onForceStartProcessed={() => setForcedSpeechStartIndex(null)}
        />
      )}
      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)', color: '#232946' }}
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-white rounded-2xl border-[0.75] border-black shadow-lg w-full relative"
            style={{
              fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif',
              maxWidth: 400,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              boxSizing: 'border-box',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-2xl font-bold transition-colors bg-transparent border-none"
              style={{ lineHeight: 1 }}
            >
              ×
            </button>
            <h2 className="text-2xl font-extrabold mb-4 text-[#232946] tracking-tight text-center">Reader Settings</h2>
            <div className="mb-6">
              <label className="block font-bold mb-2 text-black">Font Size ({readerFontSize}px)</label>
              <input
                type="range"
                min={14}
                max={28}
                step={1}
                value={readerFontSize}
                onChange={e => { setReaderFontSize(Number(e.target.value)); savePreferences(readerFont, readerWidth, Number(e.target.value), disableWordUnderlines, currentTheme, currentViewMode, disableWordsReadPopup, readerContainerStyle, sentencesPerPage, ttsSpeed, ttsVoice, disableWordHighlighting, disableSentenceHighlighting, invisibleText, showCurrentWordWhenInvisible, highlightSentenceOnHover, lineSpacing, disableWordSpans, disableSentenceSpans, nativeLanguage); }}
                className="w-full accent-[#2563eb]"
              />
            </div>
            <div className="mb-6">
              <label className="block font-bold mb-2 text-black">Text Width ({readerWidth}px)</label>
              <input
                type="range"
                min={500}
                max={1600}
                step={10}
                value={readerWidth}
                onChange={e => { setReaderWidth(Number(e.target.value)); savePreferences(readerFont, Number(e.target.value), readerFontSize, disableWordUnderlines, currentTheme, currentViewMode, disableWordsReadPopup, readerContainerStyle, sentencesPerPage, ttsSpeed, ttsVoice, disableWordHighlighting, disableSentenceHighlighting, invisibleText, showCurrentWordWhenInvisible, highlightSentenceOnHover, lineSpacing, disableWordSpans, disableSentenceSpans, nativeLanguage); }}
                className="w-full accent-[#2563eb]"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>Narrow (~55 char)</span>
                <span>Medium (~75 char)</span>
                <span>Wide (~95 char)</span>
              </div>
            </div>
            
            {/* Single example text, black color, all settings applied */}
           
            <div className="mb-6">
              <label className="block font-bold mb-2 text-black">Font Family</label>
              <select
                value={readerFont}
                onChange={e => { setReaderFont(e.target.value); savePreferences(e.target.value, readerWidth, readerFontSize, disableWordUnderlines, currentTheme, currentViewMode, disableWordsReadPopup, readerContainerStyle, sentencesPerPage, ttsSpeed, ttsVoice, disableWordHighlighting, disableSentenceHighlighting, invisibleText, showCurrentWordWhenInvisible, highlightSentenceOnHover, lineSpacing, disableWordSpans, disableSentenceSpans, nativeLanguage); }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              >
                <option value="serif">Serif (default)</option>
                <option value="sans-serif">Sans-serif</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Arial">Arial</option>
                <option value="Verdana">Verdana</option>
                <option value="Noto Sans">Noto Sans</option>
                <option value="Merriweather">Merriweather</option>
              </select>
            </div>
            {/* Example sentence moved to the very bottom */}
            {(() => {
              // Log font size and width for the settings example text
              console.log('Settings example text font size:', readerFontSize, 'and width:', readerWidth);
              return (
                <div className="mt-4 mb-4 p-5 border-[0.75] border-black rounded bg-gray-50 text-black" style={{ fontFamily: readerFont, fontSize: readerFontSize, maxWidth: readerWidth }}>
                  Example: El rápido zorro marrón salta sobre el perro perezoso.
                </div>
              );
            })()}
            <div className="mb-6">
              <label className="block font-bold mb-2 text-black">Container Mode</label>
              <select
                value={readerContainerStyle}
                onChange={e => {
                  setReaderContainerStyle(e.target.value as any);
                  savePreferences(readerFont, readerWidth, readerFontSize, disableWordUnderlines, currentTheme, currentViewMode, disableWordsReadPopup, e.target.value as any, sentencesPerPage, ttsSpeed, ttsVoice, disableWordHighlighting, disableSentenceHighlighting, invisibleText, showCurrentWordWhenInvisible, highlightSentenceOnHover, lineSpacing, disableWordSpans, disableSentenceSpans, nativeLanguage);
                }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              >
                <option value="contained">Contained (default)</option>
                <option value="border">Border Only</option>
                <option value="none">None (transparent)</option>
                <option value="full-width">Full-width (long)</option>
              </select>
            </div>
            
            {/* 5. Settings modal: add sentences per page setting */}
            <div className="mb-6">
              <label className="block font-bold mb-2 text-black">Sentences per Page</label>
              <input
                type="number"
                min={10}
                max={200}
                step={1}
                value={sentencesPerPage}
                onChange={e => {
                  setSentencesPerPage(Number(e.target.value));
                  savePreferences(readerFont, readerWidth, readerFontSize, disableWordUnderlines, currentTheme, currentViewMode, disableWordsReadPopup, readerContainerStyle, Number(e.target.value), ttsSpeed, ttsVoice, disableWordHighlighting, disableSentenceHighlighting, invisibleText, showCurrentWordWhenInvisible, highlightSentenceOnHover, lineSpacing, disableWordSpans, disableSentenceSpans, nativeLanguage);
                }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>
            <div className="mb-6">
              <label className="block font-bold mb-2 text-black">TTS Speed ({ttsSpeed}x)</label>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.05}
                value={ttsSpeed}
                onChange={e => {
                  setTtsSpeed(Number(e.target.value));
                  savePreferences(readerFont, readerWidth, readerFontSize, disableWordUnderlines, currentTheme, currentViewMode, disableWordsReadPopup, readerContainerStyle, sentencesPerPage, Number(e.target.value), ttsVoice, disableWordHighlighting, disableSentenceHighlighting, invisibleText, showCurrentWordWhenInvisible, highlightSentenceOnHover, lineSpacing, disableWordSpans, disableSentenceSpans, nativeLanguage);
                }}
                className="w-full accent-[#2563eb]"
              />
            </div>

            <div className="mb-6">
              <label className="block font-bold mb-2 text-black">Voice Option</label>
              <div className="flex gap-2 items-center">
                <select
                  value={ttsVoice}
                  onChange={e => {
                    setTtsVoice(e.target.value);
                    savePreferences(readerFont, readerWidth, readerFontSize, disableWordUnderlines, currentTheme, currentViewMode, disableWordsReadPopup, readerContainerStyle, sentencesPerPage, ttsSpeed, e.target.value, disableWordHighlighting, disableSentenceHighlighting, invisibleText, showCurrentWordWhenInvisible, highlightSentenceOnHover, lineSpacing, disableWordSpans, disableSentenceSpans, nativeLanguage);
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                >
                  {availableVoices.length === 0 ? (
                    <option>Loading voices...</option>
                  ) : (
                    availableVoices.map(v => (
                      <option key={v.Name} value={v.Name}>{v.LocalName || v.Name} ({v.Locale})</option>
                    ))
                  )}
                </select>
                <button type="button" onClick={fetchVoices} disabled={isFetchingVoices} className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-xs font-bold">
                  {isFetchingVoices ? 'Updating...' : 'Update List'}
                </button>
              </div>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="disable-word-highlighting"
                type="checkbox"
                checked={disableWordHighlighting}
                onChange={e => {
                  setDisableWordHighlighting(e.target.checked);
                  savePreferences(readerFont, readerWidth, readerFontSize, disableWordUnderlines, currentTheme, currentViewMode, disableWordsReadPopup, readerContainerStyle, sentencesPerPage, ttsSpeed, ttsVoice, e.target.checked, disableSentenceHighlighting, invisibleText, showCurrentWordWhenInvisible, highlightSentenceOnHover, lineSpacing, disableWordSpans, disableSentenceSpans, nativeLanguage);
                }}
                className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
              />
              <label htmlFor="disable-word-highlighting" className="font-bold text-black select-none cursor-pointer">Disable word highlighting</label>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="disable-sentence-highlighting"
                type="checkbox"
                checked={disableSentenceHighlighting}
                onChange={e => {
                  setDisableSentenceHighlighting(e.target.checked);
                  savePreferences(readerFont, readerWidth, readerFontSize, disableWordUnderlines, currentTheme, currentViewMode, disableWordsReadPopup, readerContainerStyle, sentencesPerPage, ttsSpeed, ttsVoice, disableWordHighlighting, e.target.checked, invisibleText, showCurrentWordWhenInvisible, highlightSentenceOnHover, lineSpacing, disableWordSpans, disableSentenceSpans, nativeLanguage);
                }}
                className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
              />
              <label htmlFor="disable-sentence-highlighting" className="font-bold text-black select-none cursor-pointer">Disable sentence highlighting</label>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="invisible-text"
                type="checkbox"
                checked={invisibleText}
                onChange={e => {
                  setInvisibleText(e.target.checked);
                  savePreferences(readerFont, readerWidth, readerFontSize, disableWordUnderlines, currentTheme, currentViewMode, disableWordsReadPopup, readerContainerStyle, sentencesPerPage, ttsSpeed, ttsVoice, disableWordHighlighting, disableSentenceHighlighting, e.target.checked, showCurrentWordWhenInvisible, highlightSentenceOnHover, lineSpacing, disableWordSpans, disableSentenceSpans, nativeLanguage);
                }}
                className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
              />
              <label htmlFor="invisible-text" className="font-bold text-black select-none cursor-pointer">Invisible text (text is rendered but not visible)</label>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="show-current-word-when-invisible"
                type="checkbox"
                checked={showCurrentWordWhenInvisible}
                onChange={e => {
                  setShowCurrentWordWhenInvisible(e.target.checked);
                  savePreferences(readerFont, readerWidth, readerFontSize, disableWordUnderlines, currentTheme, currentViewMode, disableWordsReadPopup, readerContainerStyle, sentencesPerPage, ttsSpeed, ttsVoice, disableWordHighlighting, disableSentenceHighlighting, invisibleText, e.target.checked, highlightSentenceOnHover, lineSpacing, disableWordSpans, disableSentenceSpans, nativeLanguage);
                }}
                className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
                disabled={!invisibleText}
              />
              <label htmlFor="show-current-word-when-invisible" className="font-bold text-black select-none cursor-pointer">Show currently-being-read word when invisible</label>
            </div>
            
            {/* Settings Modal */}
            <div className="mb-6 flex items-center">
              <input
                id="highlight-sentence-on-hover"
                type="checkbox"
                checked={highlightSentenceOnHover}
                onChange={e => {
                  setHighlightSentenceOnHover(e.target.checked);
                  savePreferences(readerFont, readerWidth, readerFontSize, disableWordUnderlines, currentTheme, currentViewMode, disableWordsReadPopup, readerContainerStyle, sentencesPerPage, ttsSpeed, ttsVoice, disableWordHighlighting, disableSentenceHighlighting, invisibleText, showCurrentWordWhenInvisible, e.target.checked, lineSpacing, disableWordSpans, disableSentenceSpans, nativeLanguage);
                }}
                className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
              />
              <label htmlFor="highlight-sentence-on-hover" className="font-bold text-black select-none cursor-pointer">Highlight sentences on hover</label>
            </div>
            <div className="mb-6">
              <label className="block font-bold mb-2 text-black">Line Spacing</label>
              <input
                type="range"
                min={1.0}
                max={2.5}
                step={0.05}
                value={lineSpacing}
                onChange={e => {
                  setLineSpacing(Number(e.target.value));
                  savePreferences(readerFont, readerWidth, readerFontSize, disableWordUnderlines, currentTheme, currentViewMode, disableWordsReadPopup, readerContainerStyle, sentencesPerPage, ttsSpeed, ttsVoice, disableWordHighlighting, disableSentenceHighlighting, invisibleText, showCurrentWordWhenInvisible, highlightSentenceOnHover, Number(e.target.value), disableWordSpans, disableSentenceSpans, nativeLanguage);
                }}
                className="w-full accent-[#2563eb]"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>1.0</span>
                <span>1.5</span>
                <span>2.5</span>
              </div>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="disable-word-spans"
                type="checkbox"
                checked={disableWordSpans}
                onChange={e => {
                  setDisableWordSpans(e.target.checked);
                  savePreferences(readerFont, readerWidth, readerFontSize, disableWordUnderlines, currentTheme, currentViewMode, disableWordsReadPopup, readerContainerStyle, sentencesPerPage, ttsSpeed, ttsVoice, disableWordHighlighting, disableSentenceHighlighting, invisibleText, showCurrentWordWhenInvisible, highlightSentenceOnHover, lineSpacing, e.target.checked, disableSentenceSpans, nativeLanguage);
                }}
                className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
              />
              <label htmlFor="disable-word-spans" className="font-bold text-black select-none cursor-pointer">Disable word-level spans (only wrap sentences)</label>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="disable-sentence-spans"
                type="checkbox"
                checked={disableSentenceSpans}
                onChange={e => {
                  setDisableSentenceSpans(e.target.checked);
                  savePreferences(readerFont, readerWidth, readerFontSize, disableWordUnderlines, currentTheme, currentViewMode, disableWordsReadPopup, readerContainerStyle, sentencesPerPage, ttsSpeed, ttsVoice, disableWordHighlighting, disableSentenceHighlighting, invisibleText, showCurrentWordWhenInvisible, highlightSentenceOnHover, lineSpacing, disableWordSpans, e.target.checked, nativeLanguage);
                }}
                className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
              />
              <label htmlFor="disable-sentence-spans" className="font-bold text-black select-none cursor-pointer">Disable sentence-level spans (merge all text on page)</label>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="show-audio-bar-on-start"
                type="checkbox"
                checked={showAudioBarOnStart}
                onChange={async e => {
                  setShowAudioBarOnStart(e.target.checked);
                  if (user?.uid) {
                    await UserService.updateUserPreferences(user.uid, { showAudioBarOnStart: e.target.checked });
                  }
                }}
                className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
              />
              <label htmlFor="show-audio-bar-on-start" className="font-bold text-black select-none cursor-pointer">Show audio bar on start</label>
            </div>
          </div>
        </div>
      )}
     
     
      {/* Add words read popup in bottom right */}
      {showWordsReadPopup.visible && (
        <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1000 }} className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg text-lg font-bold animate-fade-in">
          Marked read! ({showWordsReadPopup.wordCount.toLocaleString()} words)
        </div>
      )}
      {showUnmarkedPopup.visible && (
        <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1000 }} className="bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg text-lg font-bold animate-fade-in">
          Marked unread! (-{showUnmarkedPopup.wordCount.toLocaleString()} words)
        </div>
      )}
      {/* Floating copy confirmation popup */}
      {showCopyConfirm && (
        <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1000 }} className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold animate-fade-in">
          Copied!
        </div>
      )}
      {/* Floating sentence saved popup */}
      {showSentenceSaved && (
        <div style={{ position: 'fixed', bottom: 80, right: 32, zIndex: 1000 }} className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold animate-fade-in">
          Sentence saved!
        </div>
      )}
    </div>
  );
}
