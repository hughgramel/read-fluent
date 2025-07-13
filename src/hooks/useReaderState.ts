import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Book, ReaderSettings, TTSVoice, WordType } from '@/components/reader/ReaderTypes';
import { getBooks, getBookJson, updateBookMetadata } from '@/services/epubService';
import { UserService } from '@/services/userService';
import { WordService, Word } from '@/services/wordService';
import { ReadingSessionService } from '@/services/readingSessionService';
import { SentenceService } from '@/services/sentenceService';
import { getPageWordCount, cleanWord } from '@/components/reader/ReaderUtils';

export function useReaderState(user: any) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookId = searchParams ? searchParams.get('book') : null;
  const pageParam = searchParams ? searchParams.get('page') : null;

  // Book state
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState<string>('');

  // Reading progress state
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [sectionPages, setSectionPages] = useState<string[][][]>([]);
  const [readPagesBySection, setReadPagesBySection] = useState<{ [sectionIdx: number]: Set<number> }>({});
  const [totalWordsRead, setTotalWordsRead] = useState(0);

  // UI state
  const [showHeader, setShowHeader] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showSectionSidebar, setShowSectionSidebar] = useState(false);
  const [showSectionWordCount, setShowSectionWordCount] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // TTS state
  const [isSpeechPlayerActive, setIsSpeechPlayerActive] = useState(true);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [isSentenceSelectMode, setIsSentenceSelectMode] = useState(false);
  const [forcedSpeechStartIndex, setForcedSpeechStartIndex] = useState<number | null>(null);
  const [availableVoices, setAvailableVoices] = useState<TTSVoice[]>([]);
  const [isFetchingVoices, setIsFetchingVoices] = useState(false);

  // Settings state
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>({
    readerFont: 'serif',
    readerWidth: 1200,
    readerFontSize: 18,
    disableWordUnderlines: false,
    theme: 'light',
    viewMode: 'scroll-section',
    disableWordsReadPopup: false,
    readerContainerStyle: 'contained',
    sentencesPerPage: 50,
    ttsSpeed: 1.0,
    ttsVoice: 'es-MX-JorgeNeural',
    disableWordHighlighting: true,
    disableSentenceHighlighting: true,
    invisibleText: false,
    showCurrentWordWhenInvisible: false,
    highlightSentenceOnHover: false,
    lineSpacing: 1.5,
    disableWordSpans: false,
    disableSentenceSpans: false,
    nativeLanguage: 'en',
    showAudioBarOnStart: true,
    enableHighlightWords: false,
  });

  // Word tracking state
  const [userWords, setUserWords] = useState<Map<string, WordType>>(new Map());
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);

  // Interactive state
  const [isWHeld, setIsWHeld] = useState(false);
  const [currentlyHighlightedSentence, setCurrentlyHighlightedSentence] = useState<number | null>(null);
  const [savedSentencesSet, setSavedSentencesSet] = useState<Set<string>>(new Set());

  // Popup state
  const [showWordsReadPopup, setShowWordsReadPopup] = useState({ visible: false, wordCount: 0 });
  const [showUnmarkedPopup, setShowUnmarkedPopup] = useState({ visible: false, wordCount: 0 });
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);
  const [showSentenceSaved, setShowSentenceSaved] = useState(false);
  
  // Word definition popup state
  const [wordDefinitionPopup, setWordDefinitionPopup] = useState<{
    isVisible: boolean;
    word: string;
    position: { x: number; y: number };
  }>({
    isVisible: false,
    word: '',
    position: { x: 0, y: 0 }
  });
  
  // Shift key state for definition popup
  const [isShiftHeld, setIsShiftHeld] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Auto-hide popups after timeout
  useEffect(() => {
    if (showSentenceSaved) {
      const timer = setTimeout(() => {
        setShowSentenceSaved(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSentenceSaved]);

  useEffect(() => {
    if (showCopyConfirm) {
      const timer = setTimeout(() => {
        setShowCopyConfirm(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showCopyConfirm]);

  // Load book from Firebase Storage
  useEffect(() => {
    if (!user?.uid || !bookId) return;
    
    getBooks(user.uid).then(async (metadatas) => {
      const meta = metadatas.find((m) => m.bookId === bookId);
      if (meta) {
        const localKey = `epub-book-${meta.bookId}`;
        let bookObj = null;
        const cached = localStorage.getItem(localKey);
        
        if (cached) {
          try {
            bookObj = JSON.parse(cached);
          } catch { bookObj = null; }
        }
        
        if (!bookObj && meta.downloadURL) {
          try {
            bookObj = await getBookJson(meta.downloadURL);
            if (bookObj && bookObj.sections && Array.isArray(bookObj.sections)) {
              localStorage.setItem(localKey, JSON.stringify(bookObj));
            } else {
              setError('Book data from storage is invalid.');
              setBook(null);
              return;
            }
          } catch (e) {
            setError('Failed to load book from storage.');
            setBook(null);
            return;
          }
        }
        
        if (bookObj && bookObj.sections && Array.isArray(bookObj.sections)) {
          const book = { ...bookObj, ...meta, id: meta.bookId };
          setBook(book);
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

  // Build sectionPages on book or sentencesPerPage change
  useEffect(() => {
    if (!book) return;
    
    const newSectionPages: string[][][] = book.sections.map((section, idx) => {
      function splitSentences(text: string): string[] {
        const paragraphs = text.split(/\n\n+/g).map(p => p.trim()).filter(Boolean);
        const sentenceRegex = /(?<!\b[A-Z][a-z]\.|Sr\.|Sra\.|Dr\.|Dra\.|etc\.|No\.|N\u00ba)\s*(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ])/g;
        return paragraphs.flatMap(paragraph => paragraph.split(sentenceRegex).map((s: string) => s.trim()).filter(Boolean));
      }
      
      const sentences = splitSentences(section.content);
      const pages: string[][] = [];
      for (let i = 0; i < sentences.length; i += readerSettings.sentencesPerPage) {
        pages.push(sentences.slice(i, i + readerSettings.sentencesPerPage));
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
  }, [book, readerSettings.sentencesPerPage]);

  // Save progress on change
  useEffect(() => {
    if (book?.id) {
      let sectionIdx = Math.max(0, Math.min(currentSectionIndex, sectionPages.length - 1));
      let pageIdx = Math.max(0, Math.min(currentPageIndex, (sectionPages[sectionIdx]?.length || 1) - 1));
      localStorage.setItem(`reader-last-pos-${book.id}`, JSON.stringify({ sectionIndex: sectionIdx, pageIndex: pageIdx }));
    }
  }, [book?.id, currentSectionIndex, currentPageIndex, sectionPages]);

  // Load preferences on mount
  useEffect(() => {
    if (user?.uid) {
      UserService.getUserPreferences(user.uid).then(prefs => {
        if (prefs) {
          setReaderSettings(prev => ({
            ...prev,
            readerFont: prefs.readerFont || 'serif',
            readerWidth: prefs.readerWidth || 700,
            readerFontSize: prefs.readerFontSize || 18,
            disableWordUnderlines: !!prefs.disableWordUnderlines,
            theme: prefs.theme || 'light',
            viewMode: (prefs.viewMode as any) || 'scroll-section',
            disableWordsReadPopup: !!prefs.disableWordsReadPopup,
            readerContainerStyle: prefs.readerContainerStyle || 'contained',
            sentencesPerPage: prefs.sentencesPerPage || 50,
            ttsSpeed: prefs.ttsSpeed || 1.0,
            ttsVoice: prefs.ttsVoice || 'es-MX-JorgeNeural',
            disableWordHighlighting: prefs.disableWordHighlighting !== undefined ? prefs.disableWordHighlighting : true,
            disableSentenceHighlighting: prefs.disableSentenceHighlighting !== undefined ? prefs.disableSentenceHighlighting : true,
            invisibleText: !!prefs.invisibleText,
            showCurrentWordWhenInvisible: !!prefs.showCurrentWordWhenInvisible,
            highlightSentenceOnHover: !!prefs.highlightSentenceOnHover,
            lineSpacing: prefs.lineSpacing || 1.5,
            disableWordSpans: !!prefs.disableWordSpans,
            disableSentenceSpans: !!prefs.disableSentenceSpans,
            nativeLanguage: prefs.nativeLanguage || 'en',
            showAudioBarOnStart: !!prefs.showAudioBarOnStart,
            enableHighlightWords: !!prefs.enableHighlightWords,
          }));
          setIsSpeechPlayerActive(!!prefs.showAudioBarOnStart);
        }
      });
    }
  }, [user]);

  // Load user words for highlighting
  useEffect(() => {
    if (user?.uid) {
      WordService.getWords(user.uid).then(words => {
        const wordMap = new Map<string, WordType>();
        words.forEach(word => {
          wordMap.set(cleanWord(word.word), word.type);
        });
        setUserWords(wordMap);
      });
    }
  }, [user]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load read sections on mount
  useEffect(() => {
    if (user?.uid && book?.id) {
      ReadingSessionService.getBookSessions(user.uid, book.id).then(sessions => {
        const readMap: { [sectionIdx: number]: Set<number> } = {};
        let totalWords = 0;
        sessions.forEach(session => {
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

  // Navigation helpers
  const goToPage = useCallback((sectionIdx: number, pageIdx: number) => {
    sectionIdx = Math.max(0, Math.min(sectionIdx, sectionPages.length - 1));
    pageIdx = Math.max(0, Math.min(pageIdx, (sectionPages[sectionIdx]?.length || 1) - 1));
    setCurrentSectionIndex(sectionIdx);
    setCurrentPageIndex(pageIdx);
  }, [sectionPages.length]);

  const nextPage = useCallback(() => {
    if (!sectionPages.length) return;
    const pagesInSection = sectionPages[currentSectionIndex]?.length || 0;
    if (currentPageIndex < pagesInSection - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    } else if (currentSectionIndex < sectionPages.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      setCurrentPageIndex(0);
    }
  }, [sectionPages, currentSectionIndex, currentPageIndex]);

  const prevPage = useCallback(() => {
    if (!sectionPages.length) return;
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    } else if (currentSectionIndex > 0) {
      const prevSectionPages = sectionPages[currentSectionIndex - 1]?.length || 1;
      setCurrentSectionIndex(currentSectionIndex - 1);
      setCurrentPageIndex(prevSectionPages - 1);
    }
  }, [sectionPages, currentSectionIndex, currentPageIndex]);

  // Mark page complete
  const handleMarkPageComplete = useCallback(async () => {
    const isPageRead = !!readPagesBySection[currentSectionIndex]?.has(currentPageIndex);
    if (isPageRead) return;
    
    setReadPagesBySection(prev => {
      const copy = { ...prev };
      if (!copy[currentSectionIndex]) copy[currentSectionIndex] = new Set();
      copy[currentSectionIndex].add(currentPageIndex);
      return copy;
    });
    
    if (user?.uid && book) {
      const session = {
        userId: user.uid,
        bookId: book.id,
        bookTitle: book.title || '',
        sectionId: `${currentSectionIndex}-${currentPageIndex}`,
        sectionTitle: book.sections[currentSectionIndex]?.title || '',
        wordCount: getPageWordCount(sectionPages, currentSectionIndex, currentPageIndex),
        timestamp: new Date(),
      };
      await ReadingSessionService.addSession(session);
    }
    setTotalWordsRead(wr => wr + getPageWordCount(sectionPages, currentSectionIndex, currentPageIndex));
  }, [readPagesBySection, currentSectionIndex, currentPageIndex, user, book, sectionPages]);

  // Unmark page complete
  const handleUnmarkPageComplete = useCallback(async () => {
    const isPageRead = !!readPagesBySection[currentSectionIndex]?.has(currentPageIndex);
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
      const newWr = Math.max(0, wr - getPageWordCount(sectionPages, currentSectionIndex, currentPageIndex));
      if (book) {
        window.dispatchEvent(new CustomEvent('rf-words-read-updated', { detail: { bookId: book.id, totalWordsRead: newWr } }));
      }
      return newWr;
    });
  }, [readPagesBySection, currentSectionIndex, currentPageIndex, user, book, sectionPages]);

  // Save preferences
  const savePreferences = useCallback(async (newSettings: Partial<ReaderSettings>) => {
    console.log('[ReaderState] Saving preferences:', newSettings);
    setReaderSettings(prev => ({ ...prev, ...newSettings }));
    if (user?.uid) {
      try {
        await UserService.updateUserPreferences(user.uid, newSettings);
        console.log('[ReaderState] Successfully saved preferences');
      } catch (error) {
        console.error('[ReaderState] Failed to save preferences:', error);
        // Optionally revert the local state change on error
        // setReaderSettings(prev => ({ ...prev, ...originalSettings }));
      }
    } else {
      console.warn('[ReaderState] No user UID available, cannot save preferences');
    }
  }, [user]);

  // Handle sentence click
  const handleSentenceClick = useCallback(async (sentence: string, sentenceIndex: number) => {
    if (isSentenceSelectMode) {
      setForcedSpeechStartIndex(sentenceIndex);
      setIsSentenceSelectMode(false);
      return;
    }
    if (!user?.uid) return;
    if (savedSentencesSet.has(sentence)) return;
    try {
      await SentenceService.addSentence(user.uid, sentence);
      setSavedSentencesSet(prev => new Set(prev).add(sentence));
      setShowSentenceSaved(true);
    } catch (err) {
      // Optionally handle error
    }
  }, [isSentenceSelectMode, user, savedSentencesSet]);

  // Copy text
  const handleCopyText = useCallback(async () => {
    const currentPages = sectionPages[currentSectionIndex] || [];
    const currentPageSentences = currentPages[currentPageIndex] || [];
    const text = currentPageSentences.join(' ');
    try {
      await navigator.clipboard.writeText(text);
      setShowCopyConfirm(true);
    } catch (err) {
      console.error('[Reader Copy] Failed to copy:', err);
    }
  }, [sectionPages, currentSectionIndex, currentPageIndex]);

  // Fullscreen handler
  const handleFullscreen = useCallback(() => {
    if (typeof window !== 'undefined') {
      const elem = document.documentElement;
      if (!document.fullscreenElement) {
        elem.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    }
  }, []);

  // Back to library
  const backToLibrary = useCallback(() => {
    router.push('/library');
  }, [router]);

  // Word management functions
  const updateWordStatus = useCallback(async (word: string, type: WordType) => {
    if (!user?.uid) return;
    
    const cleanedWord = cleanWord(word);
    
    // Update local state immediately for instant visual feedback
    if (type === 'unknown') {
      setUserWords(prev => {
        const newMap = new Map(prev);
        newMap.delete(cleanedWord);
        return newMap;
      });
    } else {
      setUserWords(prev => new Map(prev).set(cleanedWord, type));
    }
    
    // Handle database operations in the background
    if (type === 'unknown') {
      try {
        await WordService.removeWord(user.uid, cleanedWord);
      } catch (error) {
        console.error('Failed to remove word:', error);
        // Revert local state on error
        setUserWords(prev => new Map(prev).set(cleanedWord, prev.get(cleanedWord) || 'unknown'));
      }
    } else {
      try {
        await WordService.updateWord(user.uid, cleanedWord, type);
      } catch (error) {
        try {
          await WordService.addWord(user.uid, cleanedWord, type);
        } catch (addError) {
          console.error('Failed to add word:', addError);
          // Revert local state on error
          setUserWords(prev => {
            const newMap = new Map(prev);
            newMap.delete(cleanedWord);
            return newMap;
          });
        }
      }
    }
  }, [user]);

  const getWordStatus = useCallback((word: string): WordType | undefined => {
    return userWords.get(cleanWord(word));
  }, [userWords]);

  const handleWordHover = useCallback((word: string | null) => {
    setHoveredWord(word);
  }, []);

  // Keyboard event handlers for shift key tracking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftHeld(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftHeld(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Word definition popup handlers
  const handleWordDefinitionHover = useCallback((word: string | null, event?: React.MouseEvent) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    if (word && isShiftHeld && event) {
      setWordDefinitionPopup({
        isVisible: true,
        word,
        position: { x: event.clientX, y: event.clientY }
      });
    } else if (!word || !isShiftHeld) {
      setWordDefinitionPopup(prev => ({ ...prev, isVisible: false }));
    }
  }, [isShiftHeld, longPressTimer]);

  const handleWordDefinitionLongPress = useCallback((word: string, event: React.MouseEvent) => {
    const timer = setTimeout(() => {
      setWordDefinitionPopup({
        isVisible: true,
        word,
        position: { x: event.clientX, y: event.clientY }
      });
    }, 500); // 500ms long press

    setLongPressTimer(timer);
  }, []);

  const handleWordDefinitionMouseUp = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  const closeWordDefinitionPopup = useCallback(() => {
    setWordDefinitionPopup(prev => ({ ...prev, isVisible: false }));
  }, []);

  // Calculate derived values
  const currentSection = book?.sections?.[currentSectionIndex];
  const currentPages = sectionPages[currentSectionIndex] || [];
  const currentPageSentences = currentPages[currentPageIndex] || [];
  const flatPages = sectionPages.flat();
  let globalPageNumber = 1;
  let totalPages = flatPages.length;
  if (sectionPages.length && currentSectionIndex < sectionPages.length) {
    globalPageNumber = sectionPages.slice(0, currentSectionIndex).reduce((acc, arr) => acc + arr.length, 0) + currentPageIndex + 1;
  }
  const isPageRead = !!readPagesBySection[currentSectionIndex]?.has(currentPageIndex);

  return {
    // State
    book,
    error,
    currentSectionIndex,
    currentPageIndex,
    sectionPages,
    readPagesBySection,
    totalWordsRead,
    showHeader,
    isMobile,
    showSectionSidebar,
    showSectionWordCount,
    showSettings,
    isSpeechPlayerActive,
    activeSentenceIndex,
    activeWordIndex,
    isSentenceSelectMode,
    forcedSpeechStartIndex,
    availableVoices,
    isFetchingVoices,
    readerSettings,
    isWHeld,
    currentlyHighlightedSentence,
    savedSentencesSet,
    showWordsReadPopup,
    showUnmarkedPopup,
    showCopyConfirm,
    showSentenceSaved,
    hoveredWord,
    wordDefinitionPopup,
    isShiftHeld,
    
    // Derived values
    currentSection,
    currentPageSentences,
    globalPageNumber,
    totalPages,
    isPageRead,
    
    // Actions
    setBook,
    setError,
    setCurrentSectionIndex,
    setCurrentPageIndex,
    setShowHeader,
    setShowSectionSidebar,
    setShowSectionWordCount,
    setShowSettings,
    setIsSpeechPlayerActive,
    setActiveSentenceIndex,
    setActiveWordIndex,
    setIsSentenceSelectMode,
    setForcedSpeechStartIndex,
    setCurrentlyHighlightedSentence,
    setShowWordsReadPopup,
    setShowUnmarkedPopup,
    setShowCopyConfirm,
    setShowSentenceSaved,
    setIsWHeld,
    
    // Functions
    goToPage,
    nextPage,
    prevPage,
    handleMarkPageComplete,
    handleUnmarkPageComplete,
    savePreferences,
    handleSentenceClick,
    handleCopyText,
    handleFullscreen,
    backToLibrary,
    fetchVoices,
    updateWordStatus,
    getWordStatus,
    handleWordHover,
    handleWordDefinitionHover,
    handleWordDefinitionLongPress,
    handleWordDefinitionMouseUp,
    closeWordDefinitionPopup,
  };
} 