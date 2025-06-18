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
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookId = searchParams ? searchParams.get('book') : null;
  const sectionParam = searchParams ? searchParams.get('section') : null;
  const { user } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [readerFont, setReaderFont] = useState<string>('serif');
  const [readerWidth, setReaderWidth] = useState<number>(700);
  const [readerFontSize, setReaderFontSize] = useState<number>(18);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [userWords, setUserWords] = useState<Word[]>([]);
  const [wordStatusMap, setWordStatusMap] = useState<{ [word: string]: WordType }>({});
  const [popup, setPopup] = useState<{ word: string; x: number; y: number; status: WordType } | null>(null);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [nativeLanguage, setNativeLanguage] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('reader-native-language') || 'en';
    }
    return 'en';
  });
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
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [visibleSection, setVisibleSection] = useState<number>(0);
  const [disableWordUnderlines, setDisableWordUnderlines] = useState<boolean>(false);
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('reader-theme') || 'light';
    }
    return 'light';
  });
  const [currentViewMode, setCurrentViewMode] = useState<'scroll-section' | 'scroll-book' | 'paginated-single' | 'paginated-two'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('reader-view-mode') as 'scroll-section' | 'scroll-book' | 'paginated-single' | 'paginated-two') || 'scroll-section';
    }
    return 'scroll-section';
  });
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
          } else if (sectionParam && !isNaN(Number(sectionParam))) {
            sectionNum = Math.max(0, Math.min(Number(sectionParam), bookObj.sections.length - 1));
          }
          setCurrentSection(sectionNum);
        } else {
          setError('Book could not be loaded.');
          setBook(null);
        }
      } else {
        setError('Book not found.');
        setBook(null);
      }
    });
  }, [user, bookId, sectionParam]);

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
            if (book && currentSection < book.sections.length - 1) {
              nextSection(true);
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
  }, [isAutoScrolling, scrollSpeed, currentSection, book]);

  useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = 0; }, [currentSection]);

  const nextSection = (fromAutoScroll = false) => {
    if (book && currentSection < book.sections.length - 1) {
      const newSection = currentSection + 1;
      setCurrentSection(newSection);
      router.replace(`/reader?book=${book.id}&section=${newSection}`);
      if (fromAutoScroll && contentRef.current) {
        setTimeout(() => { if (contentRef.current) contentRef.current.scrollTop = 0; }, 0);
      }
    }
  };

  const prevSection = () => {
    if (currentSection > 0 && book) {
      const newSection = currentSection - 1;
      setCurrentSection(newSection);
      router.replace(`/reader?book=${book.id}&section=${newSection}`);
    }
  };

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
        currentSection: currentSection,
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
      updateBookMetadata(user.uid, book.id, { currentSection });
    }
  }, [book, currentSection, user]);

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

  // Apply theme to html[data-theme] and persist viewMode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('reader-theme', currentTheme);
    localStorage.setItem('reader-view-mode', currentViewMode);
  }, [currentTheme, currentViewMode]);

  // Save preferences when changed
  const savePreferences = async (
    font: string,
    width: number,
    fontSize: number,
    disableUnderlines = disableWordUnderlines,
    theme = currentTheme,
    viewMode = currentViewMode,
    disableWordsReadPopupValue = disableWordsReadPopup
  ) => {
    // This function saves the user's reader preferences (font, width, font size, etc.) to the backend.
    // It is called whenever a setting is changed in the UI.
    if (user?.uid) {
      console.log('Saving preferences:', { font, width, fontSize, disableUnderlines, theme, viewMode, disableWordsReadPopupValue });
      await UserService.updateUserPreferences(user.uid, {
        readerFont: font,
        readerWidth: width,
        readerFontSize: fontSize,
        disableWordUnderlines: disableUnderlines,
        theme: theme,
        viewMode: viewMode,
        disableWordsReadPopup: disableWordsReadPopupValue,
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

  // Helper: get popup color
  function getPopupColor(status: WordType | undefined) {
    if (status === 'known') return '#16a34a'; // green
    if (status === 'tracking') return '#a78bfa'; // purple
    if (status === 'ignored') return '#222'; // black
    return '#f87171'; // red (unknown)
  }

  // Helper: get underline style
  function getUnderline(type: WordType | undefined, hovered: boolean) {
    if (type === 'tracking') return '2px solid #a78bfa'; // purple
    if (!type) return '2px solid #f87171'; // red (unknown)
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

  // Handle word click
  const handleWordClick = async (word: string, event: React.MouseEvent<HTMLSpanElement, MouseEvent>, key: string) => {
    if (!user?.uid) return;
    const lower = word.toLowerCase();
    const current = wordStatusMap[lower];
    const next = nextStatus(current);
    // Update backend
    await WordService.addWord(user.uid, lower, next);
    // Update local state
    setWordStatusMap(prev => ({ ...prev, [lower]: next }));
    // Show popup above only this word span
    setPopup({ word: key, x: 0, y: 0, status: next });
    setTimeout(() => setPopup(null), 1200);
  };

  // Listen for Shift key globally and toggle definition popup for hovered word
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && hoveredWord) {
        setShiftedWord(hoveredWord);
        const el = document.querySelector(`[data-word-key='${hoveredWord}']`);
        if (el) {
          const rect = (el as HTMLElement).getBoundingClientRect();
          showDefinitionPopup((el as HTMLElement).innerText, { x: rect.left + rect.width / 2, y: rect.top });
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftedWord(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [hoveredWord]);

  // Helper to fetch Wiktionary definitions, and if any definition is a reference to another word, fetch that too (recursively, no duplicates, and only merge real definitions)
  async function fetchWiktionaryDefinition(word: string, lang: string, seen: Set<string> = new Set()) {
    try {
      if (seen.has(word.toLowerCase())) return null; // prevent infinite loop
      seen.add(word.toLowerCase());
      const url = `https://${lang}.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('No definition found');
      const data = await res.json();
      // Find all referenced words in all definitions
      let referencedWords: string[] = [];
      Object.values(data).forEach((entries: any) => {
        entries.forEach((entry: any) => {
          if (entry.definitions && entry.definitions.length > 0) {
            entry.definitions.forEach((def: any) => {
              // Look for 'of <i>word</i>' or 'of <a ...>word</a>'
              const matches = [
                ...def.definition.matchAll(/of <i>([\wáéíóúüñç]+)<\/i>/gi),
                ...def.definition.matchAll(/of <a [^>]+>([\wáéíóúüñç]+)<\/a>/gi)
              ];
              matches.forEach(match => {
                if (match[1]) referencedWords.push(match[1]);
              });
            });
          }
        });
      });
      // Fetch referenced definitions and merge, but only add real definitions (not just more references)
      let referencedDefs: any[] = [];
      for (const refWord of referencedWords) {
        const refData = await fetchWiktionaryDefinition(refWord, lang, seen);
        if (refData) referencedDefs.push(refData);
      }
      // Merge referenced definitions into the main data, but only if they have at least one non-reference definition
      if (referencedDefs.length > 0) {
        referencedDefs.forEach(refData => {
          Object.entries(refData).forEach(([langKey, entries]: any) => {
            if (!data[langKey]) data[langKey] = [];
            // Only add entries that have at least one definition not matching the reference pattern
            const realEntries = entries.filter((entry: any) =>
              entry.definitions && entry.definitions.some((def: any) =>
                !/of <i>[\wáéíóúüñç]+<\/i>|of <a [^>]+>[\wáéíóúüñç]+<\/a>/i.test(def.definition)
              )
            );
            data[langKey] = data[langKey].concat(realEntries);
          });
        });
      }
      return data;
    } catch (e: any) {
      return { error: e.message || 'No definition found' };
    }
  }

  // Handler to show definition popup
  const showDefinitionPopup = async (word: string, anchor: { x: number; y: number }) => {
    setDefPopup({ word, anchor, loading: true, data: null, error: null });
    const data = await fetchWiktionaryDefinition(word, nativeLanguage);
    setDefPopup(prev => prev && prev.word === word ? { ...prev, loading: false, data, error: data.error || null } : prev);
  };

  // Handler to hide definition popup
  const hideDefinitionPopup = () => {
    setDefPopup(null);
    if (defPopupTimeout.current) clearTimeout(defPopupTimeout.current);
  };

  // Restore 1/2/3/4 shortcuts for word status toggling
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (!hoveredWord || !user?.uid) return;
      const [pIdx, i] = hoveredWord.split('-');
      let wordToken = '';
      const section = book?.sections?.[currentSection];
      if (section) {
        outer: for (const [paraIdx, paragraph] of section.content.split('\n\n').entries()) {
          if (String(paraIdx) === pIdx) {
            for (const [tokIdx, token] of tokenize(paragraph).entries()) {
              if (String(tokIdx) === i) {
                wordToken = token;
                break outer;
              }
            }
          }
        }
      }
      if (!wordToken) return;
      const lower = wordToken.toLowerCase();
      let newStatus: WordType | undefined;
      if (e.key === '1') newStatus = undefined; // unknown
      if (e.key === '2') newStatus = 'tracking';
      if (e.key === '3') newStatus = 'known';
      if (e.key === '4') newStatus = 'ignored';
      if (newStatus === undefined && e.key === '1') {
        await WordService.addWord(user.uid, lower, 'tracking');
        setWordStatusMap(prev => {
          const copy = { ...prev };
          delete copy[lower];
          return copy;
        });
        // No popup
        return;
      }
      if (newStatus) {
        await WordService.addWord(user.uid, lower, newStatus);
        setWordStatusMap(prev => ({ ...prev, [lower]: newStatus }));
        // No popup
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredWord, user, book, currentSection]);

  // Remove shadow from definition popup, limit definitions to 5, and close on outside click, esc, or hover another word
  useEffect(() => {
    if (!defPopup) return;
    const handleClick = (e: MouseEvent) => {
      const popup = document.getElementById('definition-popup');
      if (popup && !popup.contains(e.target as Node)) {
        hideDefinitionPopup();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideDefinitionPopup();
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [defPopup]);
  useEffect(() => {
    if (defPopup && hoveredWord && defPopup.word !== (tokenize(section.content.split('\n\n')[parseInt(defPopup.word.split('-')[0])]).find((t, idx) => String(idx) === defPopup.word.split('-')[1]) || '')) {
      hideDefinitionPopup();
    }
  }, [hoveredWord]);

  // Memoize tokenized section content for smoother rendering
  const tokenizedSections = useMemo(() =>
    book?.sections.map(section => section.content.split('\n\n').map(tokenize)) || [],
    [book]
  );
  const currentTokenizedSection = tokenizedSections[currentSection] || [];

  // Throttle setHoveredWord to avoid rapid state updates
  const throttledSetHoveredWord = useCallback(
    (() => {
      let last = 0;
      let timeout: NodeJS.Timeout | null = null;
      return (key: string | null) => {
        const now = Date.now();
        if (timeout) clearTimeout(timeout);
        if (!key) {
          setHoveredWord(null);
          return;
        }
        if (now - last > 40) {
          setHoveredWord(key);
          last = now;
        } else {
          timeout = setTimeout(() => setHoveredWord(key), 40);
        }
      };
    })(),
    []
  );

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

  // Add scrapeComprehension handler
  const handleScrapeComprehension = () => {
    let retryCount = 0;
    const maxRetries = 10; // 30 seconds / 3 seconds = 10 retries
    const retryDelay = 3000; // 3 seconds

    const attemptScrape = () => {
        // Find all elements that might have shadow roots
        const potentialHosts = document.querySelectorAll('*');
        let shadowRoots = [];

        // Collect all shadow roots that contain our target elements
        for (let element of potentialHosts) {
            if (element.shadowRoot) {
                const targets = element.shadowRoot.querySelectorAll('.ComprehensionStatsChart__infoItem');
                if (targets.length > 0) {
                    shadowRoots.push(element.shadowRoot);
                }
            }
        }

        const infoItems = Array.from(document.querySelectorAll('#MigakuShadowDom'));
        console.log(infoItems);
        const result: any = { known: 0, unknown: 0, ignored: 0 };
        let hasUndefinedValues = false;

        // Process each shadow root found
        shadowRoots.forEach((shadowRoot) => {
            const infoItems = shadowRoot.querySelectorAll('.ComprehensionStatsChart__infoItem');
            
            infoItems.forEach((infoItem, itemIndex) => {
                // Find all elements with -emphasis class within this infoItem
                const emphasisElements = infoItem.querySelectorAll('.UiTypo.UiTypo__caption.-emphasis');
                
                if (emphasisElements.length > 0) {
                    // Get the last element
                    const lastElement = emphasisElements[emphasisElements.length - 1];
                    const textContent = lastElement?.textContent?.trim() || '';
                    
                    // Extract number from text like "40 words", "1428 words", etc.
                    const numberMatch = textContent.match(/(\d+)/);
                    
                    if (numberMatch) {
                        const number = parseInt(numberMatch[1], 10);
                        
                        // Try to determine the category from the label
                        const labelElement = infoItem.querySelector('.ComprehensionStatsChart__infoItem__label p');
                        const category = labelElement ? labelElement?.textContent?.trim().toLowerCase() : `item${itemIndex + 1}`;
                        
                        result[category as keyof typeof result] = number;
                    } else {
                        // No number found, mark as having undefined values
                        hasUndefinedValues = true;
                    }
                } else {
                    // No emphasis elements found, mark as having undefined values
                    hasUndefinedValues = true;
                }
            });
        });

        // Check if any of the expected values are undefined or 0 (assuming 0 means not found)
        const hasValidData = result.known !== undefined && result.unknown !== undefined && result.ignored !== undefined &&
                           (result.known > 0 || result.unknown > 0 || result.ignored > 0);

        if (!hasValidData && retryCount < maxRetries) {
            retryCount++;
            console.log(`Attempt ${retryCount} failed, retrying in 3 seconds...`);
            setTimeout(attemptScrape, retryDelay);
            return;
        }

        if (!hasValidData && retryCount >= maxRetries) {
            console.log('Max retries reached, proceeding with current data');
        }

        console.log(result);

        const now = new Date().toISOString();
        const key = `comprehension-${book?.id || 'unknown'}-${currentSection}`;
        
        const data = {
            book: book?.id,
            section: currentSection,
            known_words: result.known || 0,
            unknown_words: result.unknown || 0,
            ignored_words: result.ignored || 0,
            date: now,
        };
        localStorage.setItem(key, JSON.stringify(data));
        console.log('Scraped comprehension:', data);
    };

    // Start the first attempt
    attemptScrape();
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

      // After CSS injection, wrap each word in spans
      console.log('Wrapping words in spans');
      const wrapWordsInSpans = () => {
        const contentDiv = document.querySelector('.epub-html');
        if (!contentDiv) return;

        // Helper function to wrap text nodes in spans
        const wrapTextNode = (node: Node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            // Split on word boundaries, preserving punctuation
            const words = text.split(/(\s+|[.,!?;:"()\[\]{}…—–])/);
            
            // Create a document fragment to hold our new nodes
            const fragment = document.createDocumentFragment();
            
            words.forEach((word, index) => {
              if (word.trim()) {
                const span = document.createElement('span');
                span.className = 'word-span';
                span.textContent = word;
                fragment.appendChild(span);
              } else if (word) {
                // Preserve whitespace and punctuation
                fragment.appendChild(document.createTextNode(word));
              }
            });
            
            // Replace the original text node with our new nodes
            if (node.parentNode) {
              node.parentNode.replaceChild(fragment, node);
            }
          }
        };

        // Recursively process all text nodes
        const processNode = (node: Node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            wrapTextNode(node);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Skip if it's already a word span or a button
            if ((node as Element).classList.contains('word-span') || 
                (node as Element).tagName === 'BUTTON') {
              return;
            }
            // Process child nodes
            Array.from(node.childNodes).forEach(processNode);
          }
        };

        // Process all nodes in the content div
        Array.from(contentDiv.childNodes).forEach(processNode);
      };

      // Execute the word wrapping
      wrapWordsInSpans();
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
        const readMap: { [key: string]: boolean } = {};
        let totalWords = 0;
        sessions.forEach(session => {
          readMap[session.sectionId] = true;
          totalWords += session.wordCount;
        });
        setReadSections(readMap);
        setTotalWordsRead(totalWords);
      });
    }
  }, [user, book]);

  // Add mark as read handler
  const handleMarkAsRead = async () => {
    if (!user?.uid || !book || !book.sections[currentSection]) return;
    const section = book.sections[currentSection];
    const wordCount = section.wordCount;
    if (wordCount === 0) return; // don't save or show popup for 0-word sections
    try {
      await ReadingSessionService.addSession({
        userId: user.uid,
        bookId: book.id,
        bookTitle: book.title || 'Unknown Book',
        sectionId: section.id,
        sectionTitle: section.title,
        wordCount,
        timestamp: new Date()
      });
      setReadSections(prev => ({ ...prev, [section.id]: true }));
      setTotalWordsRead(prev => prev + wordCount);
      if (!disableWordsReadPopup) {
        setShowWordsReadPopup({
          visible: true,
          wordCount: wordCount
        });
        setTimeout(() => setShowWordsReadPopup({ visible: false, wordCount: 0 }), 2500);
      }
    } catch (error) {
      console.error('Failed to mark section as read:', error);
    }
  };

  // Add handler to unmark as read
  const handleUnmarkAsRead = async () => {
    if (!user?.uid || !book || !book.sections[currentSection]) return;
    const section = book.sections[currentSection];
    if (section.wordCount === 0) return; // don't unmark or show popup for 0-word sections
    try {
      await ReadingSessionService.removeSession({
        userId: user.uid,
        bookId: book.id,
        sectionId: section.id,
      });
      setReadSections(prev => {
        const copy = { ...prev };
        delete copy[section.id];
        return copy;
      });
      setTotalWordsRead(prev => Math.max(0, prev - section.wordCount));
      if (!disableWordsReadPopup) {
        setShowUnmarkedPopup({
          visible: true,
          wordCount: section.wordCount
        });
        setTimeout(() => setShowUnmarkedPopup({ visible: false, wordCount: 0 }), 2500);
      }
    } catch (error) {
      console.error('Failed to unmark section as read:', error);
    }
  };

  // Add handleMarkSection and handleUnmarkSection inside the component
  const handleMarkSection = async (sectionId: string, wordCount: number, sectionTitle: string) => {
    if (!user?.uid || !book) return;
    if (wordCount === 0) return;
    try {
      await ReadingSessionService.addSession({
        userId: user.uid,
        bookId: book.id,
        bookTitle: book.title || 'Unknown Book',
        sectionId,
        sectionTitle,
        wordCount,
        timestamp: new Date()
      });
      setReadSections(prev => ({ ...prev, [sectionId]: true }));
      setTotalWordsRead(prev => prev + wordCount);
    } catch (error) {
      console.error('Failed to mark section as read:', error);
    }
  };
  const handleUnmarkSection = async (sectionId: string, wordCount: number) => {
    if (!user?.uid || !book) return;
    if (wordCount === 0) return;
    try {
      await ReadingSessionService.removeSession({
        userId: user.uid,
        bookId: book.id,
        sectionId,
      });
      setReadSections(prev => {
        const copy = { ...prev };
        delete copy[sectionId];
        return copy;
      });
      setTotalWordsRead(prev => Math.max(0, prev - wordCount));
    } catch (error) {
      console.error('Failed to unmark section as read:', error);
    }
  };

  // Handler to show Wiktionary popup
  const showWiktionaryPopup = async (word: string, anchor: { x: number; y: number }) => {
    setWiktionaryPopup({ word, anchor, loading: true, data: null, error: null });
    const data = await fetchWiktionaryDefinition(word, nativeLanguage);
    setWiktionaryPopup(prev => prev && prev.word === word ? { ...prev, loading: false, data, error: data.error || null } : prev);
  };

  // Handler to hide Wiktionary popup
  const hideWiktionaryPopup = () => {
    setWiktionaryPopup(null);
    if (wiktionaryPopupTimeout.current) clearTimeout(wiktionaryPopupTimeout.current);
  };

  // Listen for Shift key globally and toggle Wiktionary popup for hovered word (all modes)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && hoveredWord) {
        const el = document.querySelector(`[data-word-key='${hoveredWord}']`);
        if (el) {
          const rect = (el as HTMLElement).getBoundingClientRect();
          showWiktionaryPopup((el as HTMLElement).innerText, { x: rect.left + rect.width / 2, y: rect.top });
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') hideWiktionaryPopup();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [hoveredWord]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600 text-xl">
        {error}
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600 text-xl">
        Book not found.
      </div>
    );
  }

  // Always recalculate section from currentSection
  const section = book.sections[currentSection];

  // Add a derived value for isZeroWordSection
  const isZeroWordSection = section.wordCount === 0;

  // Helper to split text into sentences (simple regex, can be improved for edge cases)
  function splitSentences(text: string) {
    // This regex splits on sentence-ending punctuation followed by a space or end of string
    return text.match(/[^.!?\n]+[.!?]+["']?(?=\s|$)|[^.!?\n]+$/g) || [];
  }

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
        onClick={e => {
          const rect = (e.target as HTMLElement).getBoundingClientRect();
          showWiktionaryPopup(token, { x: rect.left + rect.width / 2, y: rect.top });
        }}
        onMouseEnter={() => throttledSetHoveredWord(wordKey)}
        onMouseLeave={() => throttledSetHoveredWord(null)}
      >
        {token}
      </span>
    );
  }

  // In scroll-section mode, use WordSpan for all words
  {section.content.split('\n\n').map((paragraph, pIdx) => (
    <p key={pIdx} style={{ margin: '1em 0', fontFamily: readerFont, fontSize: readerFontSize }}>
      {splitSentences(paragraph).map((sentence, sIdx) => (
        <span key={sIdx} className="sentence-span">
          {tokenize(sentence).map((token, i) => {
            const key = `${pIdx}-${sIdx}-${i}`;
            const lower = token.toLowerCase();
            const status = wordStatusMap[lower];
            const isWord = /[\p{L}\p{M}\d'-]+/u.test(token);
            const wordStyle = {
              borderBottom: disableWordUnderlines ? 'none' : getUnderline(status, hoveredWord === key),
              color: shiftedWord === key ? '#a78bfa' : undefined,
              background: hoveredWord === key ? '#f3f4f6' : undefined,
              fontWeight: status === 'known' ? 700 : 500,
              padding: '0 2px',
              borderRadius: 2,
              position: 'relative' as const,
              zIndex: 1,
              fontFamily: readerFont,
              fontSize: readerFontSize,
            };
            return isWord ? (
              <WordSpan key={key} token={token} wordKey={key} wordStyle={wordStyle} />
            ) : (
              <span key={key} style={{ fontFamily: readerFont, fontSize: readerFontSize }}>{token}</span>
            );
          })}
        </span>
      ))}
    </p>
  ))}

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
                  return isWord ? (
                    <WordSpan key={key} token={token} wordKey={key} />
                  ) : token;
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

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}>
      <EpubHtmlStyles />
      {/* Mobile: Dropdown icon is in the bar when header is visible, floating when hidden */}
      {isMobile ? (
        showHeader ? (
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
            className="fixed top-4 z-50 bg-white border-2 border-black shadow-lg rounded-full p-1 hover:bg-gray-100 transition-all mr-2"
            title={showHeader ? 'Hide top bar' : 'Show top bar'}
            style={{ right: '0.5rem' }}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="black" viewBox="0 0 24 24">
              <path d="M5 15l7-7 7 7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )
      ) : (
        <button
          onClick={() => setShowHeader((prev) => !prev)}
          className="fixed top-4 right-6 z-50 bg-white border-2 border-gray-300 shadow-lg rounded-full p-2 hover:bg-gray-100 transition-all"
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
          {isMobile ? (
            <div className="w-full px-2 flex items-center justify-between relative" style={{ minHeight: '56px', height: '56px' }}>
              {/* Left: Back button */}
              <div className="flex items-center h-full">
                <button
                  onClick={backToLibrary}
                  className="flex items-center gap-2 px-4 py-2 font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors text-base"
                  style={{ minWidth: 32, minHeight: 32, width: 32, height: 32, fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}
                  aria-label="Back to Library"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
              </div>
              {/* Center: Section navigation */}
              <div className="flex items-center gap-2 mx-auto" style={{maxWidth: 700}}>
                <button
                  onClick={() => prevSection()}
                  disabled={currentSection === 0}
                  className="flex items-center gap-2 px-4 py-2 font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors text-base disabled:bg-gray-300 disabled:text-gray-400"
                  aria-label="Previous Section"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <input
                  type="number"
                  value={currentSection + 1}
                  min={1}
                  max={book.sections.length}
                  onChange={(e) => {
                    const newSection = Math.max(0, Math.min(Number(e.target.value) - 1, book.sections.length - 1));
                    setCurrentSection(newSection);
                    router.replace(`/reader?book=${book.id}&section=${newSection}`);
                  }}
                  className="w-12 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563eb] transition-colors text-base font-semibold"
                  style={{ fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}
                />
                <span className="text-base font-bold text-[#232946]">/ {book.sections.length}</span>
                <button
                  onClick={() => nextSection()}
                  disabled={currentSection === (book.sections.length || 0) - 1}
                  className="flex items-center gap-2 px-4 py-2 font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors text-base disabled:bg-gray-300 disabled:text-gray-400"
                  aria-label="Next Section"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <span
                  className="truncate font-extrabold text-lg ml-4"
                  style={{
                    width: isMobile ? 220 : 420,
                    minWidth: isMobile ? 220 : 420,
                    maxWidth: isMobile ? 220 : 420,
                    display: 'inline-block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: '#232946',
                    fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif',
                    verticalAlign: 'middle',
                  }}
                >
                  {(() => {
                    const title = showEntireBook
                      ? (book.sections[visibleSection]?.title && book.sections[visibleSection]?.title.trim() !== ''
                          ? book.sections[visibleSection]?.title
                          : 'Untitled Section')
                      : (section.title && section.title.trim() !== '' ? section.title : 'Untitled Section');
                    return title.length > 80 ? title.slice(0, 80) + '…' : title;
                  })()}
                </span>
              </div>
              {/* Right: Controls, now to the left of the dropdown icon */}
              <div className="flex items-center gap-1 h-full pr-10">
                {!showEntireBook && (
                  <button
                    onClick={handleScrapeComprehension}
                    className="flex items-center gap-2 px-4 py-2 font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors text-base"
                    title="Scrape Comprehension Stats"
                  >
                    Scrape
                  </button>
                )}
                {currentViewMode === 'scroll-section' && (
                  <>
                    <button
                      onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                      className="flex items-center gap-2 px-4 py-2 font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors text-base"
                      title={isAutoScrolling ? 'Pause auto-scroll' : 'Start auto-scroll'}
                    >
                      {isAutoScrolling ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>
                    {/* Speed control: slider on desktop, button on mobile */}
                    {isMobile ? (
                      <button
                        onClick={() => {
                          const next = scrollSpeed >= 5 ? 0.5 : +(scrollSpeed + 0.5).toFixed(1);
                          setScrollSpeed(next);
                        }}
                        className="flex items-center gap-2 px-4 py-2 font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors text-base"
                        title="Change scroll speed"
                      >
                        {scrollSpeed.toFixed(1)}x
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-white rounded-md px-3 py-1 border-[0.75] border-[#2563eb]">
                        <input
                          type="range"
                          min="0.5"
                          max="5"
                          step="0.1"
                          value={scrollSpeed}
                          onChange={(e) => setScrollSpeed(Number(e.target.value))}
                          className="w-24 accent-[#2563eb]"
                        />
                        <span className="text-sm font-bold text-[#2563eb] min-w-[2rem] text-center">
                          {scrollSpeed.toFixed(1)}x
                        </span>
                      </div>
                    )}
                  </>
                )}
                <button
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-2 px-4 py-2 font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors text-base"
                  title="Reader Settings"
                  aria-label="Reader Settings"
                >
                  {isMobile ? '⚙️' : 'Settings'}
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full px-8 py-3 flex items-center justify-between relative" style={{ minHeight: '64px' }}>
              {/* Back to Library (absolute left, with margin) */}
              <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  onClick={backToLibrary}
                  className="flex items-center gap-2 px-4 py-2 font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors text-base"
                  style={isMobile ? { minWidth: 32, minHeight: 32, width: 32, height: 32 } : {}}
                >
                  <svg className={isMobile ? 'w-4 h-4' : 'w-6 h-6'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  {!isMobile && 'Library'}
                </button>
                {/* Hamburger menu to toggle section sidebar (hide on mobile) */}
                {!isMobile && (
                  <button
                    onClick={() => setShowSidebar((prev) => !prev)}
                    className="flex items-center gap-2 px-4 py-2 font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors text-base"
                    title="Show/Hide sections"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                )}
                {/* Section name to the right of hamburger menu */}
                {!isMobile && (
                  <span
                    className="truncate font-extrabold text-lg ml-4"
                    style={{
                      maxWidth: 340,
                      display: 'inline-block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: '#232946',
                      fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif',
                      verticalAlign: 'middle',
                    }}
                  >
                    {section.title && section.title.trim() !== '' ? section.title : 'Untitled Section'}
                  </span>
                )}
              </div>
              {/* Section navigation (centered) */}
              <div className="flex items-center gap-4 mx-auto" style={{ position: 'relative', left: 0, right: 0 }}>
                <button
                  onClick={() => showEntireBook ? scrollToSection(Math.max(visibleSection - 1, 0)) : prevSection()}
                  disabled={showEntireBook ? visibleSection === 0 : currentSection === 0}
                  className="flex items-center gap-2 px-4 py-2 font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors text-base disabled:bg-gray-300 disabled:text-gray-400"
                  style={isMobile ? { minWidth: 32, minHeight: 32, width: 32, height: 32 } : {}}
                >
                  <svg className={isMobile ? 'w-4 h-4' : 'w-6 h-6'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span
                  className="flex items-center justify-center font-extrabold text-lg"
                  style={{
                    width: isMobile ? 80 : 120,
                    minWidth: isMobile ? 80 : 120,
                    maxWidth: isMobile ? 80 : 120,
                    textAlign: 'center',
                    color: '#232946',
                    fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {showEntireBook ? `${visibleSection + 1} / ${book.sections.length}` : `${currentSection + 1} / ${book.sections.length}`}
                </span>
                <button
                  onClick={() => showEntireBook ? scrollToSection(Math.min(visibleSection + 1, book.sections.length - 1)) : nextSection()}
                  disabled={showEntireBook ? visibleSection === book.sections.length - 1 : currentSection === (book.sections.length || 0) - 1}
                  className="flex items-center gap-2 px-4 py-2 font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors text-base disabled:bg-gray-300 disabled:text-gray-400"
                  style={isMobile ? { minWidth: 32, minHeight: 32, width: 32, height: 32 } : {}}
                >
                  <svg className={isMobile ? 'w-4 h-4' : 'w-6 h-6'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              {/* Right controls (move left, not fully flush right) */}
              <div className="absolute right-32 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {/* Mark as Read/Unmark Read button, only if not a zero-word section */}
                {!isZeroWordSection && (
                  !readSections[book.sections[currentSection]?.id] ? (
                    <button
                      onClick={handleMarkAsRead}
                      className="flex items-center gap-2 px-4 py-2 font-bold text-white bg-green-500 rounded-full shadow-sm hover:bg-green-600 focus:bg-green-600 border-none transition-colors text-base"
                      title="Mark section as read"
                    >
                      <FiCheck className="w-4 h-4" />
                      Mark Read
                    </button>
                  ) : (
                    <button
                      onClick={handleUnmarkAsRead}
                      className="flex items-center gap-2 px-4 py-2 font-bold text-white bg-red-500 rounded-full shadow-sm hover:bg-red-600 focus:bg-red-600 border-none transition-colors text-base"
                      title="Unmark section as read"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      Unmark Read
                    </button>
                  )
                )}
                {/* Auto-scroll/play button ... */}
                {currentViewMode === 'scroll-section' && (
                  <>
                    <button
                      onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                      className="flex items-center gap-2 px-4 py-2 font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors text-base"
                      style={isMobile ? { minWidth: 32, minHeight: 32, width: 32, height: 32 } : {}}
                      title={isAutoScrolling ? 'Pause auto-scroll' : 'Start auto-scroll'}
                    >
                      {isAutoScrolling ? (
                        <svg className={isMobile ? 'w-4 h-4' : 'w-6 h-6'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className={isMobile ? 'w-4 h-4' : 'w-6 h-6'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>
                    {/* Speed control: slider on desktop, button on mobile */}
                    {isMobile ? (
                      <button
                        onClick={() => {
                          const next = scrollSpeed >= 5 ? 0.5 : +(scrollSpeed + 0.5).toFixed(1);
                          setScrollSpeed(next);
                        }}
                        className="flex items-center gap-2 px-4 py-2 font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors text-base"
                        title="Change scroll speed"
                      >
                        {scrollSpeed.toFixed(1)}x
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-white rounded-md px-3 py-1 border border-black">
                        <input
                          type="range"
                          min="0.5"
                          max="5"
                          step="0.1"
                          value={scrollSpeed}
                          onChange={(e) => setScrollSpeed(Number(e.target.value))}
                          className="w-24 accent-green-600"
                        />
                        <span className="text-sm font-medium text-black min-w-[2rem] text-center">
                          {scrollSpeed.toFixed(1)}x
                        </span>
                      </div>
                    )}
                  </>
                )}
                {/* Fullscreen */}
                {!isMobile && (<button
                  onClick={handleFullscreen}
                  className="flex items-center gap-2 px-4 py-2 font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors text-base"
                  title="Toggle Fullscreen"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M4 4h6M4 4v6M20 20h-6M20 20v-6M4 20v-6M4 20h6M20 4h-6M20 4v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>)}
                {/* Settings: cog on desktop, emoji on mobile */}
                <button
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-2 px-4 py-2 font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors text-base"
                  title="Reader Settings"
                >
                  {isMobile ? '⚙️' : 'Settings'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Layout: sidebar + main content */}
      <div style={{ height: showHeader ? '64px' : isMobile ? '40px' : '0' }} />
      <div className="flex w-full px-0 py-12" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Sidebar (persistent, always flush left) */}
        {showSidebar && !isMobile && (
          <div
            className="z-10"
            style={{
              position: 'fixed',
              top: '54%',
              left: showSidebar ? '2rem' : '-20rem',
              opacity: showSidebar ? 1 : 0,
              height: '70vh',
              minHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 10,
              transform: 'translateY(-50%)',
              pointerEvents: showSidebar ? 'auto' : 'none',
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 4px 24px 0 rgba(37,99,235,0.08)',
              border: '1.5px solid #e5e7eb',
              padding: '0',
              width: 320,
              maxWidth: '90vw',
            }}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200" style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, background: '#fff' }}>
              <span className="font-extrabold text-xl text-[#2563eb] tracking-tight" style={{ fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}>Sections</span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2" style={{ fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}>
              {book.sections.map((s, idx) => {
                const isRead = readSections[s.id] || s.wordCount === 0;
                return (
                  <button
                    key={s.id || idx}
                    onClick={() => {
                      if (isRead && s.wordCount !== 0) handleUnmarkSection(s.id, s.wordCount);
                      else if (!isRead && s.wordCount !== 0) handleMarkSection(s.id, s.wordCount, s.title);
                    }}
                    className={`block w-full text-left px-4 py-3 rounded-lg mb-1 font-bold transition-all duration-150 flex items-center justify-between ${idx === currentSection ? 'bg-[#e6f0fd] text-[#2563eb]' : 'bg-white text-[#626c91] hover:bg-[#f5f7fa] hover:text-[#2563eb]'}`}
                    style={{ fontSize: 17, fontWeight: idx === currentSection ? 800 : 600, letterSpacing: '-0.01em' }}
                  >
                    <span className="truncate flex-1 min-w-0">{s.title && s.title.trim() !== '' ? s.title : 'Untitled Section'}</span>
                    <span className="ml-2 flex-shrink-0" style={{ width: 28, display: 'inline-flex', justifyContent: 'center' }}>
                      {s.wordCount === 0 ? (
                        <FiCheck className="text-green-500 w-5 h-5" />
                      ) : (
                        <SectionCheckButton isRead={isRead} />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {/* Main reading area (flex-1, with left margin for gap if sidebar is open) */}
        <div
          className="flex-1 flex justify-center transition-all duration-300"
          style={{
            marginLeft: showSidebar && !isMobile ? '17rem' : 0,
            padding: isMobile ? '0 0.25rem' : undefined,
            maxWidth: isMobile ? '100vw' : undefined,
          }}
        >
          <div className="bg-white rounded-lg border-[0.75] border-black shadow-[0_6px_0px_#d1d5db] p-12 mb-12" style={{ fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif', fontSize: '1.1rem', maxWidth: readerWidth > 1100 ? readerWidth : 1100, width: readerWidth, margin: '0 auto', padding: isMobile ? '1.5rem 0.5rem' : undefined }} ref={el => {
            if (el) {
              console.log('Setting main reading area font size:', readerFontSize, 'and width:', readerWidth);
            }
          }}>
            <>
              {currentViewMode === 'scroll-section' && (
                <div
                  ref={contentRef}
                  className="epub-html overflow-y-auto scroll-smooth relative"
                  style={{ scrollBehavior: 'smooth', margin: '0 auto', height: 'calc(100vh - 260px)', color: '#222', fontFamily: readerFont, fontSize: readerFontSize, maxWidth: readerWidth, width: '100%' }}
                >
                  {section.content.split('\n\n').map((paragraph, pIdx) => (
                    <p key={pIdx} style={{ margin: '1em 0', fontFamily: readerFont, fontSize: readerFontSize }}>
                      {splitSentences(paragraph).map((sentence, sIdx) => (
                        <span key={sIdx} className="sentence-span">
                          {tokenize(sentence).map((token, i) => {
                            const key = `${pIdx}-${sIdx}-${i}`;
                            const lower = token.toLowerCase();
                            const status = wordStatusMap[lower];
                            const isWord = /[\p{L}\p{M}\d'-]+/u.test(token);
                            const wordStyle = {
                              borderBottom: disableWordUnderlines ? 'none' : getUnderline(status, hoveredWord === key),
                              color: shiftedWord === key ? '#a78bfa' : undefined,
                              background: hoveredWord === key ? '#f3f4f6' : undefined,
                              fontWeight: status === 'known' ? 700 : 500,
                              padding: '0 2px',
                              borderRadius: 2,
                              position: 'relative' as const,
                              zIndex: 1,
                              fontFamily: readerFont,
                              fontSize: readerFontSize,
                            };
                            return isWord ? (
                              <WordSpan key={key} token={token} wordKey={key} wordStyle={wordStyle} />
                            ) : (
                              <span key={key} style={{ fontFamily: readerFont, fontSize: readerFontSize }}>{token}</span>
                            );
                          })}
                        </span>
                      ))}
                    </p>
                  ))}
                  <div style={{ height: '200px' }} />
                </div>
              )}
              {currentViewMode === 'scroll-book' && (
                <div
                  className="epub-html scroll-smooth relative"
                  style={{ scrollBehavior: 'smooth', margin: '0 auto', minHeight: 'calc(100vh - 260px)', color: '#222', fontFamily: readerFont, fontSize: readerFontSize, maxWidth: readerWidth, width: '100%' }}
                >
                  {book.sections.map((sec, secIdx) => (
                    <div key={sec.id || secIdx} className="mb-12 pt-20">
                      <h2 className="text-2xl font-bold mb-4 text-[#0B1423]">{sec.title}</h2>
                      <div>{wrapSentencesAndWordsInHtml(sec.content)}</div>
                    </div>
                  ))}
                  <div style={{ height: '200px' }} />
                </div>
              )}
              {currentViewMode === 'paginated-single' && (
                <div
                  className="epub-html scroll-smooth relative flex flex-col items-center justify-center"
                  style={{ scrollBehavior: 'smooth', margin: '0 auto', minHeight: 'calc(100vh - 260px)', color: '#222', fontFamily: readerFont, fontSize: readerFontSize, maxWidth: readerWidth, width: '100%' }}
                >
                  <div className="w-full">
                    <div>{wrapSentencesAndWordsInHtml(section.content)}</div>
                  </div>
                </div>
              )}
            </>
          </div>
        </div>
      </div>
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-2xl p-8 border-[0.75] border-black shadow-lg max-w-md w-full relative" style={{ fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}>
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
                onChange={e => { setReaderFontSize(Number(e.target.value)); savePreferences(readerFont, readerWidth, Number(e.target.value), disableWordUnderlines, currentTheme, currentViewMode); }}
                className="w-full accent-[#2563eb]"
              />
            </div>
            <div className="mb-6">
              <label className="block font-bold mb-2 text-black">Text Width ({readerWidth}px)</label>
              <input
                type="range"
                min={500}
                max={1200}
                step={10}
                value={readerWidth}
                onChange={e => { setReaderWidth(Number(e.target.value)); savePreferences(readerFont, Number(e.target.value), readerFontSize, disableWordUnderlines, currentTheme, currentViewMode); }}
                className="w-full accent-[#2563eb]"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>Narrow (~55 char)</span>
                <span>Medium (~75 char)</span>
                <span>Wide (~95 char)</span>
              </div>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="disable-underlines"
                type="checkbox"
                checked={disableWordUnderlines}
                onChange={e => {
                  setDisableWordUnderlines(e.target.checked);
                  savePreferences(readerFont, readerWidth, readerFontSize, e.target.checked, currentTheme, currentViewMode, disableWordsReadPopup);
                }}
                className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
              />
              <label htmlFor="disable-underlines" className="font-bold text-black select-none cursor-pointer">Disable word underlines & popups</label>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="disable-words-read-popup"
                type="checkbox"
                checked={disableWordsReadPopup}
                onChange={e => {
                  setDisableWordsReadPopup(e.target.checked);
                  savePreferences(readerFont, readerWidth, readerFontSize, disableWordUnderlines, currentTheme, currentViewMode, e.target.checked);
                }}
                className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
              />
              <label htmlFor="disable-words-read-popup" className="font-bold text-black select-none cursor-pointer">Disable words read popup</label>
            </div>
            {/* Single example text, black color, all settings applied */}
            {(() => {
              // Log font size and width for the settings example text
              console.log('Settings example text font size:', readerFontSize, 'and width:', readerWidth);
              return (
                <div className="mt-4 p-2 border-[0.75] border-black rounded bg-gray-50 text-black" style={{ fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif', fontSize: readerFontSize, maxWidth: readerWidth }}>
                  Example: El rápido zorro marrón salta sobre el perro perezoso.
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {defPopup && defPopup.anchor && (
        (() => {
          let left = defPopup.anchor.x;
          let top = defPopup.anchor.y - 12;
          let transform = 'translate(-50%, -100%)';
          const popupWidth = 340;
          const popupHeight = 400;
          const margin = 8;
          if (isMobile) {
            // Clamp left/right
            left = Math.max(margin + popupWidth / 2, Math.min(window.innerWidth - margin - popupWidth / 2, left));
            // If too close to top, show below the word
            if (top - popupHeight < 0) {
              top = defPopup.anchor.y + 24;
              transform = 'translate(-50%, 0)';
            }
          }
          return (
            <div
              id="definition-popup"
              style={{
                position: 'fixed',
                left,
                top,
                transform,
                zIndex: 200,
                background: '#fff',
                borderRadius: '1em',
                border: '2px solid #d1d5db',
                minWidth: 260,
                maxWidth: 340,
                padding: '1.2em 1.2em 1em 1.2em',
                fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif',
                color: '#0B1423',
                pointerEvents: 'auto',
                maxHeight: 400,
                overflowY: 'auto',
              }}
              onMouseLeave={hideDefinitionPopup}
            >
              <button
                onClick={hideDefinitionPopup}
                style={{ position: 'absolute', top: 8, right: 12, background: 'none', border: 'none', fontSize: 22, color: '#bbb', cursor: 'pointer' }}
                aria-label="Close"
              >×</button>
              <div className="font-bold text-lg mb-2">{defPopup.word}</div>
              {defPopup.loading && <div className="text-gray-400">Loading...</div>}
              {defPopup.error && <div className="text-red-500">{defPopup.error}</div>}
              {defPopup.data && !defPopup.error && (
                <>
                  {Object.entries(defPopup.data).map(([lang, entries]: any, idx) => (
                    <div key={lang + idx}>
                      {entries.map((entry: any, j: number) => (
                        <div key={j} className="mb-3">
                          <div className="text-xs font-bold text-purple-400 mb-1">{entry.partOfSpeech}</div>
                          {entry.inflections && (
                            <div className="mb-1 text-xs text-gray-500 flex flex-wrap gap-2">
                              {entry.inflections.map((inf: any, k: number) => (
                                <span key={k} className="bg-purple-100 text-purple-700 rounded px-2 py-0.5 text-xs font-semibold">{inf}</span>
                              ))}
                            </div>
                          )}
                          <div className="text-sm font-semibold mb-1">Definitions</div>
                          <ul className="list-disc pl-5">
                            {entry.definitions && entry.definitions.slice(0, 5).map((d: any, k: number) => (
                              <li key={k} className="mb-1 text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(d.definition) }} />
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>
          );
        })()
      )}
      {wiktionaryPopup && wiktionaryPopup.anchor && (
        (() => {
          let left = wiktionaryPopup.anchor.x;
          let top = wiktionaryPopup.anchor.y - 12;
          let transform = 'translate(-50%, -100%)';
          const popupWidth = 340;
          const popupHeight = 400;
          const margin = 8;
          if (isMobile) {
            // Clamp left/right
            left = Math.max(margin + popupWidth / 2, Math.min(window.innerWidth - margin - popupWidth / 2, left));
            // If too close to top, show below the word
            if (top - popupHeight < 0) {
              top = wiktionaryPopup.anchor.y + 24;
              transform = 'translate(-50%, 0)';
            }
          }
          return (
            <div
              id="wiktionary-popup"
              style={{
                position: 'fixed',
                left,
                top,
                transform,
                zIndex: 200,
                background: '#fff',
                borderRadius: '1em',
                border: '2px solid #d1d5db',
                minWidth: 260,
                maxWidth: 340,
                padding: '1.2em 1.2em 1em 1.2em',
                fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif',
                color: '#0B1423',
                pointerEvents: 'auto',
                maxHeight: 400,
                overflowY: 'auto',
              }}
              onMouseLeave={hideWiktionaryPopup}
            >
              <button
                onClick={hideWiktionaryPopup}
                style={{ position: 'absolute', top: 8, right: 12, background: 'none', border: 'none', fontSize: 22, color: '#bbb', cursor: 'pointer' }}
                aria-label="Close"
              >×</button>
              <div className="font-bold text-lg mb-2">{wiktionaryPopup.word}</div>
              {wiktionaryPopup.loading && <div className="text-gray-400">Loading...</div>}
              {wiktionaryPopup.error && <div className="text-red-500">{wiktionaryPopup.error}</div>}
              {wiktionaryPopup.data && !wiktionaryPopup.error && (
                <>
                  {Object.entries(wiktionaryPopup.data).map(([lang, entries]: any, idx) => (
                    <div key={lang + idx}>
                      {entries.map((entry: any, j: number) => (
                        <div key={j} className="mb-3">
                          <div className="text-xs font-bold text-purple-400 mb-1">{entry.partOfSpeech}</div>
                          {entry.inflections && (
                            <div className="mb-1 text-xs text-gray-500 flex flex-wrap gap-2">
                              {entry.inflections.map((inf: any, k: number) => (
                                <span key={k} className="bg-purple-100 text-purple-700 rounded px-2 py-0.5 text-xs font-semibold">{inf}</span>
                              ))}
                            </div>
                          )}
                          <div className="text-sm font-semibold mb-1">Definitions</div>
                          <ul className="list-disc pl-5">
                            {entry.definitions && entry.definitions.slice(0, 5).map((d: any, k: number) => (
                              <li key={k} className="mb-1 text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(d.definition) }} />
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>
          );
        })()
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
    </div>
  );
}

// Add minimal CSS for .epub-html to ensure images, headings, and footnotes display well
export function EpubHtmlStyles() {
  return (
    <style jsx global>{`
      .epub-html { font-size: 1em; }
      .epub-html *, .epub-html *:before, .epub-html *:after {
        max-width: 100%;
        box-sizing: border-box;
      }
      .epub-html img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 1em auto;
        position: static !important;
      }
      .epub-html *[style*='position:fixed'],
      .epub-html *[style*='position:absolute'] {
        position: static !important;
      }
      .epub-html p { margin: 1em 0; font-size: 1em; }
      .epub-html a { color: #2563eb; text-decoration: underline; }
      .epub-html sup, .epub-html sub, .epub-html .footnote, .epub-html .footnotes { font-size: 0.75em; }
      .epub-html table { border-collapse: collapse; width: 100%; }
      .epub-html th, .epub-html td { border: 1px solid #ccc; padding: 0.3em 0.6em; }
      .epub-html blockquote { border-left: 4px solid #ccc; margin: 1em 0; padding: 0.5em 1em; color: #555; background: #fafafa; }
      .epub-html ul, .epub-html ol { margin: 1em 0 1em 2em; }
      .epub-html li { margin: 0.3em 0; }
    `}</style>
  );
} 

// Add SectionCheckButton component
function SectionCheckButton({ isRead }: { isRead: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      tabIndex={-1}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="transition-colors duration-200 w-6 h-6 flex items-center justify-center rounded focus:outline-none border-none bg-transparent"
      style={{ padding: 0, minWidth: 24 }}
      aria-label={isRead ? (hovered ? 'Unmark as read' : 'Marked as read') : 'Mark as read'}
      disabled={!isRead}
    >
      {isRead ? (
        hovered ? (
          <svg className="w-5 h-5 text-red-500 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <FiCheck className="text-green-500 w-5 h-5 transition-all duration-200" />
        )
      ) : null}
    </button>
  );
}