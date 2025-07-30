'use client';

import { useRef, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useReaderState } from '@/hooks/useReaderState';
import { useReaderKeyboard } from '@/hooks/useReaderKeyboard';
import { useTheme } from '@/contexts/ThemeContext';
import { ReaderHeader } from '@/components/reader/ReaderHeader';
import { ReaderSidebar } from '@/components/reader/ReaderSidebar';
import { ReaderContent } from '@/components/reader/ReaderContent';
import { ReaderPopups } from '@/components/reader/ReaderPopups';
import { EpubHtmlStyles } from '@/components/EpubHtmlStyles';
import { getReaderContainerClass, getReaderContainerStyle, getSectionTitle, cleanWord, isNumeric } from '@/components/reader/ReaderUtils';
import { ReaderSettings as ReaderSettingsType } from '@/components/reader/ReaderTypes';
import { ArrowLeft, List, Settings, Maximize2, XCircle, CheckCircle, BookOpen, Bot, ListOrdered, Languages, Eye } from 'lucide-react';

// Placeholder AI icon component
const AiIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="#6366f1" strokeWidth="2" fill="#e0e7ff" />
    <text x="12" y="16" textAnchor="middle" fontSize="10" fill="#6366f1" fontWeight="bold">AI</text>
  </svg>
);
import { WordService } from '@/services/wordService';
import { updateBookMetadata } from '@/services/epubService';
// @ts-ignore
import SpeechPlayerImport from '../../../components/SpeechPlayer.jsx';
import React from 'react';
import { defaultReaderSettings } from '@/hooks/useReaderState';
const SpeechPlayer: any = SpeechPlayerImport;

// Type for SpeechPlayer ref
interface SpeechPlayerRef {
  repeatCurrentSentence: () => void;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
}

// ErrorBoundary component for catching rendering errors
class ReaderErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    // Suppress only the specific removeChild error
    if (typeof error?.message === 'string' && error.message.includes("Failed to execute 'removeChild' on 'Node'")) {
      // Do not set hasError, just ignore
      return { hasError: false, error: null };
    } 
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    // You can log errorInfo to an error reporting service here
    // console.error('Reader rendering error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center text-red-600 text-xl bg-white">
          <div>
            <div className="font-bold mb-2">A rendering error occurred in the reader.</div>
            <div className="mb-2">{this.state.error?.message || String(this.state.error)}</div>
                            <div className="text-sm theme-text-secondary">Try refreshing the page or disabling browser extensions that modify the DOM.</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Helper to clean asterisks from a word
function cleanWordForLookup(word: string) {
  return word.replace(/\*+/g, '');
}

export default function ReaderPage() {
  const { user } = useAuth();
  const { currentTheme } = useTheme();
  const speechPlayerRef = useRef<SpeechPlayerRef>(null);
  const [pendingSettings, setPendingSettings] = useState<ReaderSettingsType | null>(null);
  const [hasUnsavedSettings, setHasUnsavedSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'settings' | 'shortcuts'>('settings');
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    if (!isMobile || !readerSettings.enableSwipeNavigation) return;
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (!isMobile) return;
    // Swipe detection
    if (!readerSettings.enableSwipeNavigation || swipeStartX.current === null || swipeStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - swipeStartX.current;
    const deltaY = e.changedTouches[0].clientY - swipeStartY.current;
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        handlePrevPage();
      } else {
        handleNextPage().catch(console.error);
      }
    }
    swipeStartX.current = null;
    swipeStartY.current = null;
  }

  const {
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
    filteredVoices,
    isFetchingVoices,
    readerSettings,
    isWHeld,
    setIsWHeld,
    currentlyHighlightedSentence,
    showWordsReadPopup,
    showUnmarkedPopup,
    showCopyConfirm,
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
    handleDefinitionPopupMouseEnter,
    handleDefinitionPopupMouseLeave,
    getWordKey,
    formatVoiceName,
  } = useReaderState(user);

  // Wrapper function for sentence click that passes speech player ref
  const handleSentenceClickWrapper = (sentence: string, sentenceIndex: number) => {
    handleSentenceClick(sentence, sentenceIndex, speechPlayerRef);
  };

  // Wrapper functions for navigation that pause speech player first
  const handleNextPage = async () => {
    // Pause speech player if it's currently playing
    if (speechPlayerRef.current && isSpeechPlayerActive) {
      speechPlayerRef.current.pause();
    }
    
    // Batch update all unknown words on the current page to known status
    // Only do this when word highlighting is enabled, since users can only see word statuses when highlighting is on
    if (readerSettings.autoMarkUnknownAsKnownOnPageAdvance && readerSettings.enableHighlightWords && user?.uid && book?.id) {
      const currentPages = sectionPages[currentSectionIndex] || [];
      const currentPageSentences = currentPages[currentPageIndex] || [];
      const currentPageWords = currentPageSentences.flatMap(sentence => 
        sentence.split(/\s+/).filter(word => word.length > 0)
      );
      
      // Get all unknown words on the current page, excluding numbers
      const unknownWords = currentPageWords.filter(word => {
        const cleanedWord = cleanWord(word);
        
        // Skip empty words (which include numbers that were cleaned to empty)
        if (!cleanedWord || cleanedWord.length === 0) {
          return false;
        }
        
        const status = getWordStatus(cleanedWord);
        return !status || status === 'unknown';
      });
      
      // Batch update all unknown words to known status
      if (unknownWords.length > 0) {
        try {
          const cleanedUnknownWords = unknownWords.map(word => cleanWord(word)).filter(word => word.length > 0);
          console.log('Words to batch update:', cleanedUnknownWords);
          console.log('User ID:', user.uid);
          if (cleanedUnknownWords.length > 0) {
            await WordService.batchUpdateWords(user.uid, cleanedUnknownWords, 'known');
          }
          
          // Update local state for immediate visual feedback
          cleanedUnknownWords.forEach(word => {
            // Update the userWords map in useReaderState
            // This will trigger a re-render with updated word highlights
            updateWordStatus(word, 'known');
          });
          
          console.log(`Batch updated ${unknownWords.length} unknown words to known status`);
        } catch (error) {
          console.error('Failed to batch update words:', error);
        }
      }
    }
    
    // Reset speech player state for new page
    setActiveSentenceIndex(0);
    setActiveWordIndex(0);
    setCurrentlyHighlightedSentence(null);
    setActiveSentenceIndex(0);
    nextPage();
  };

  const handlePrevPage = () => {
    // Pause speech player if it's currently playing
    if (speechPlayerRef.current && isSpeechPlayerActive) {
      speechPlayerRef.current.pause();
    }
    // Reset speech player state for new page
    setActiveSentenceIndex(null);
    setActiveWordIndex(null);
    prevPage();
  };

  // Keyboard navigation
  useReaderKeyboard({
    onPrevPage: handlePrevPage,
    onNextPage: handleNextPage,
    onMarkPageComplete: handleMarkPageComplete,
    onUnmarkPageComplete: handleUnmarkPageComplete,
    onToggleInvisibleText: () => savePreferences({ invisibleText: !readerSettings.invisibleText }),
    onToggleSectionSidebar: () => setShowSectionSidebar(v => !v),
    onRepeatSentence: () => {
      if (speechPlayerRef.current) {
        speechPlayerRef.current.repeatCurrentSentence();
      }
    },
    isPageRead,
    setIsWHeld,
    hoveredWord,
    updateWordStatus,
    enableHighlightWords: readerSettings.enableHighlightWords,
  });

  // Theme is handled by ThemeContext, no need to manually set data-theme

  // Inject book CSS into the DOM, scoped to .epub-html
  useEffect(() => {
    if (book?.css) {
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

  // Persist readPagesBySection in localStorage whenever it changes
  useEffect(() => {
    if (book?.id) {
      localStorage.setItem(`reader-read-pages-${book.id}`,
        JSON.stringify(Object.fromEntries(Object.entries(readPagesBySection).map(([k, v]) => [k, Array.from(v)])))
      );
    }
  }, [book?.id, readPagesBySection]);

  // Effect: Close word definition popup when TTS is active or sentence select mode is on
  useEffect(() => {
    if (isSpeechPlayerActive || isSentenceSelectMode) {
      closeWordDefinitionPopup();
    }
  }, [isSpeechPlayerActive, isSentenceSelectMode]);

  // Function to handle when current reading sentence ends
  const onCurrentReadingSentenceEnd = (sentenceIndex: number) => {
    setActiveSentenceIndex(null);
    setActiveWordIndex(null);
  };

  // Remove long-press and word status cycling, and update click to show definition popup
  const handleWordClick = (word: string, event?: React.MouseEvent, key?: string) => {
    // Always show the definition popup on click
    handleWordDefinitionHover(word, event, key);
  };

  // Initialize pending settings when settings modal opens
  useEffect(() => {
    if (showSettings) {
      setPendingSettings(readerSettings);
      setHasUnsavedSettings(false);
    }
  }, [showSettings, readerSettings]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (ttsSpeedUpdateTimeoutRef.current) {
        clearTimeout(ttsSpeedUpdateTimeoutRef.current);
      }
    };
  }, []);

  // Debounced TTS speed update
  const ttsSpeedUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle pending settings changes
  const handlePendingSettingChange = (newSettings: Partial<ReaderSettingsType>) => {
    if (pendingSettings) {
      setPendingSettings({ ...pendingSettings, ...newSettings });
      setHasUnsavedSettings(true);
      
      // Special handling for TTS speed - debounce the update
      if ('ttsSpeed' in newSettings) {
        // Clear any existing timeout
        if (ttsSpeedUpdateTimeoutRef.current) {
          clearTimeout(ttsSpeedUpdateTimeoutRef.current);
        }
        
        // Set a new timeout to update after 1 second of inactivity
        ttsSpeedUpdateTimeoutRef.current = setTimeout(async () => {
          const updatedSettings = { ...pendingSettings, ...newSettings };
          await savePreferences(updatedSettings);
          setHasUnsavedSettings(false);
        }, 1000);
      }
    }
  };

  // Save pending settings
  const handleSaveSettings = async () => {
    if (pendingSettings) {
      // Clear any pending TTS speed update
      if (ttsSpeedUpdateTimeoutRef.current) {
        clearTimeout(ttsSpeedUpdateTimeoutRef.current);
        ttsSpeedUpdateTimeoutRef.current = null;
      }
      
      await savePreferences(pendingSettings);
      setHasUnsavedSettings(false);
      // Don't close the settings modal automatically
    }
  };

  // Cancel pending settings
  const handleCancelSettings = () => {
    // Clear any pending TTS speed update
    if (ttsSpeedUpdateTimeoutRef.current) {
      clearTimeout(ttsSpeedUpdateTimeoutRef.current);
      ttsSpeedUpdateTimeoutRef.current = null;
    }
    
    setPendingSettings(readerSettings);
    setHasUnsavedSettings(false);
    // Don't close the settings modal automatically
  };

  // Prevent popup from opening if TTS or sentence select mode is active
  const handleWordDefinitionHoverWrapper = (word: string | null, event?: React.MouseEvent, key?: string) => {
    if (isSpeechPlayerActive || isSentenceSelectMode || readerSettings.disableWordDefinitionPopup) return;
    // Clean asterisks from the word
    const cleanedWord = word ? cleanWordForLookup(word) : word;
    console.log('word', word);
    console.log('cleanedWord', cleanedWord);
  
    handleWordDefinitionHover(cleanedWord, event, key);
  };

  useEffect(() => {
    const handlePlayPauseKey = (e: KeyboardEvent) => {
      if ((e.key === 'p' || e.key === 'w' || e.key === 'P' || e.key === 'W') && isSpeechPlayerActive) {
        if (speechPlayerRef.current) {
          speechPlayerRef.current.togglePlayPause();
        }
      }
    };
    window.addEventListener('keydown', handlePlayPauseKey);
    return () => window.removeEventListener('keydown', handlePlayPauseKey);
  }, [isSpeechPlayerActive]);

  // Early returns for error and !book
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600 text-xl">
        {error}
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center theme-text-secondary text-xl">
        Book not found.
      </div>
    );
  }

  const effectiveSettings = (showSettings && pendingSettings) ? pendingSettings : readerSettings;

  return (
    <div className="page-container" style={{ fontFamily: 'var(--font-family)' }}>
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
        <div className="card-themed fixed top-0 left-0 w-full z-20" style={{ minHeight: isMobile ? '56px' : '64px', paddingTop: 0, paddingBottom: 0, fontFamily: 'var(--font-family)', borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0 }}>
          <div className="w-full px-2 pr-6 py-3 grid grid-cols-3 items-center gap-4" style={{ minHeight: '64px' }}>
            {/* Left section: Library button + Section toggle */}
            <div className="flex items-center gap-2 justify-start">
              <button 
                onClick={backToLibrary} 
                className={`rounded ${isMobile ? 'w-8 h-8 min-w-0 min-h-0 p-0 flex items-center justify-center bg-[var(--primary-color)] text-white hover:bg-[var(--primary-color-hover)] focus:bg-[var(--primary-color-hover)]' : 'px-3 py-2 bg-[var(--primary-color)] text-white font-bold text-sm'}`}
                style={isMobile ? { width: 32, height: 32, minWidth: 32, minHeight: 32 } : {}}
              >
                <ArrowLeft className={isMobile ? 'w-5 h-5' : 'w-6 h-6'} />
              </button>
              <button 
                onClick={() => setShowSectionSidebar(v => !v)} 
                className={`rounded ${isMobile ? 'w-8 h-8 min-w-0 min-h-0 p-0 flex items-center justify-center bg-[var(--sidebar-background)] text-[var(--primary-color)] border theme-border hover:bg-[var(--primary-color)] hover:text-white focus:bg-[var(--primary-color)] focus:text-white' : 'px-3 py-2 bg-[var(--sidebar-background)] text-[var(--primary-color)] font-bold text-sm border theme-border'}`}
                style={isMobile ? { width: 32, height: 32, minWidth: 32, minHeight: 32 } : {}}
                title={showSectionSidebar ? 'Hide Sections' : 'Show Sections'}
              >
                {isMobile ? (
                  <List className="w-5 h-5 theme-text" />
                ) : (
                  <span className="theme-text font-bold">{showSectionSidebar ? 'Hide Sections' : 'Show Sections'}</span>
                )}
              </button>
              
              {/* Hide section name on mobile */}
              {!isMobile && (
                <span className="truncate font-extrabold text-lg ml-2 theme-text" style={{maxWidth: '240px', fontFamily: 'var(--font-family)'}}>
                  {getSectionTitle(currentSection, currentSectionIndex)}
                </span>
              )}
            </div>
            {/* Center section: Navigation controls (with audio button on left for mobile) */}
            <div className="flex items-center justify-center gap-2">
              {isMobile && (
                <button
                  onClick={() => setIsSpeechPlayerActive(!isSpeechPlayerActive)}
                  className="btn-primary flex items-center justify-center h-11 w-11 min-w-0 min-h-0 font-bold rounded-full shadow-sm border-none transition-colors"
                  title={isSpeechPlayerActive ? 'Hide Speech Player' : 'Show Speech Player'}
                  style={isMobile ? { width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, borderRadius: '50%' } : { width: 44, height: 44, minWidth: 44, minHeight: 44, padding: 0, borderRadius: '50%' }}
                >
                  <svg className={isMobile ? 'w-5 h-5' : 'w-7 h-7'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </button>
              )}
              <button 
                onClick={handlePrevPage} 
                disabled={globalPageNumber === 1} 
                className="btn-primary flex items-center justify-center h-11 w-11 min-w-0 min-h-0 font-bold rounded-full shadow-sm border-none transition-colors disabled:bg-gray-300 disabled:text-gray-400"
                style={isMobile ? { width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0 } : { width: 44, height: 44, minWidth: 44, minHeight: 44, padding: 0 }}
              >
                <svg className={isMobile ? "w-5 h-5" : "w-7 h-7"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-base font-bold theme-text whitespace-nowrap">{globalPageNumber} / {totalPages}</span>
              <button 
                onClick={() => handleNextPage().catch(console.error)} 
                disabled={globalPageNumber === totalPages} 
                className="btn-primary flex items-center justify-center h-11 w-11 min-w-0 min-h-0 font-bold rounded-full shadow-sm border-none transition-colors disabled:bg-gray-300 disabled:text-gray-400"
                style={isMobile ? { width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0 } : { width: 44, height: 44, minWidth: 44, minHeight: 44, padding: 0 }}
              >
                <svg className={isMobile ? "w-5 h-5" : "w-7 h-7"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            {/* Right section: Settings and complete/uncomplete (and audio on desktop) */}
            <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'} justify-end mr-2`}>
              {/* Settings button */}
              <button
                onClick={() => setShowSettings(true)}
                className={`btn-primary flex items-center justify-center h-11 w-11 min-w-0 min-h-0 font-bold rounded-full shadow-sm border-none transition-colors`}
                title="Reader Settings"
                aria-label="Reader Settings"
                style={isMobile ? { width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, borderRadius: '50%' } : { width: 44, height: 44, minWidth: 44, minHeight: 44, padding: 0, borderRadius: '50%' }}
              >
                <Settings className={isMobile ? 'w-5 h-5' : 'w-7 h-7'} />
              </button>
              {/* Fullscreen button: only show on desktop */}
              {!isMobile && (
                <button
                  onClick={handleFullscreen}
                  className="btn-primary flex items-center gap-2 px-4 py-2 font-bold rounded-full shadow-sm border-none transition-colors text-base"
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
                  className="btn-primary flex items-center gap-2 px-4 py-2 font-bold rounded-full shadow-sm border-none transition-colors text-base"
                  title={isSpeechPlayerActive ? 'Hide Speech Player' : 'Show Speech Player'}
                >
                  <svg className={isMobile ? 'w-5 h-5' : 'w-7 h-7'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  {isSpeechPlayerActive ? 'Hide' : 'Read Aloud'}
                </button>
              )}
              {/* Complete/Uncomplete button */}
              {isMobile ? (
                isPageRead ? (
                  <button onClick={handleUnmarkPageComplete} className="flex items-center justify-center w-8 h-8 min-w-0 min-h-0 p-0 rounded bg-green-500 text-white" title="Uncomplete">
                    <XCircle className="w-5 h-5" />
                  </button>
                ) : (
                  <button onClick={handleMarkPageComplete} className="flex items-center justify-center w-8 h-8 min-w-0 min-h-0 p-0 rounded bg-blue-500 text-white" title="Complete">
                    <CheckCircle className="w-5 h-5" />
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
      <ReaderErrorBoundary>
        {/* Layout: sidebar + main content */}
        <div style={{ height: showHeader ? '64px' : isMobile ? '40px' : '0' }} />
        <div className="flex w-full px-0" style={{ margin: '0 auto', marginTop: isMobile ? 8 : 0, paddingTop: isMobile ? '1rem' : '3rem', paddingBottom: isMobile ? '1rem' : '3rem' }}>
          
          {/* Section Sidebar */}
          {showSectionSidebar && (
            isMobile ? (
              <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 pb-4 px-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowSectionSidebar(false)}>
                <div className="bg-white rounded-2xl shadow-lg w-full max-w-md relative flex flex-col" style={{ fontFamily: 'var(--font-family)', maxHeight: 'calc(100vh - 8rem)' }} onClick={e => e.stopPropagation()}>
                  {/* Header with close button and word count toggle */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-3">
                                          <h3 className="text-lg font-semibold theme-text">Sections</h3>
                    <label className="flex items-center gap-2 text-sm theme-text-secondary">
                        <input
                          type="checkbox"
                          checked={showSectionWordCount}
                          onChange={e => setShowSectionWordCount(e.target.checked)}
                          className="accent-[#2563eb] h-4 w-4 border-gray-300 rounded"
                        />
                        <span>Word count</span>
                      </label>
                    </div>
                    <button
                      onClick={() => setShowSectionSidebar(false)}
                      className="p-2 theme-text-secondary hover:text-red-500 transition-colors bg-transparent border-none rounded-full hover:bg-gray-100"
                      aria-label="Close"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {/* Scrollable content */}
                  <div className="flex-1 overflow-y-auto p-4">
                    <ReaderSidebar
                      book={book}
                      sectionPages={sectionPages}
                      currentSectionIndex={currentSectionIndex}
                      readPagesBySection={readPagesBySection}
                      showSectionWordCount={showSectionWordCount}
                      onGoToPage={goToPage}
                      onToggleSectionWordCount={setShowSectionWordCount}
                      isMobileModal={true}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <ReaderSidebar
                book={book}
                sectionPages={sectionPages}
                currentSectionIndex={currentSectionIndex}
                readPagesBySection={readPagesBySection}
                showSectionWordCount={showSectionWordCount}
                onGoToPage={goToPage}
                onToggleSectionWordCount={setShowSectionWordCount}
              />
            )
          )}

          {/* Main reading area */}
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
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="flex flex-col items-center justify-start w-full" style={{ minHeight: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 260px)', height: '100%' }}>
              <div className={getReaderContainerClass(effectiveSettings.readerContainerStyle)} style={{
                ...getReaderContainerStyle(effectiveSettings.readerContainerStyle, effectiveSettings.readerFont, effectiveSettings.readerWidth, isMobile),
                margin: '0 auto',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                color: effectiveSettings.invisibleText && !effectiveSettings.disableSentenceHighlighting && !effectiveSettings.disableWordHighlighting ? 'rgba(0,0,0,0.001)' : 'var(--text-color)',
                maxWidth: isMobile ? '95vw' : effectiveSettings.readerWidth,
                width: isMobile ? '100%' : effectiveSettings.readerWidth,
                padding: isMobile ? '0.5rem 0.25rem' : '1.5rem',
                boxSizing: 'border-box',
                overflowX: isMobile ? 'hidden' : undefined,
              }}>
                {/* Clipboard button (mobile, only if not disabled) */}
                {isMobile && !readerSettings.disableClipboardButton && (
                  <button
                    onClick={handleCopyText}
                    className="mb-2 flex items-center gap-2 px-3 py-2 text-sm font-medium theme-text-secondary hover:theme-text transition-colors bg-gray-100 hover:bg-gray-200 rounded-lg theme-border border sm:px-4"
                    style={{ alignSelf: 'flex-start' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                    <span className="hidden sm:inline">Copy Page</span>
                    <span className="sm:hidden">Copy</span>
                  </button>
                )}
                {/* Page content */}
                <ReaderContent
                  flatSentences={currentPageSentences}
                  readerSettings={{
                    ...readerSettings,
                    disableClipboardButton: !!readerSettings.disableClipboardButton,
                    nativeLanguage: readerSettings.nativeLanguage,
                    enableMarkdown: !!readerSettings.enableMarkdown,
                    dictionary: readerSettings.dictionary || 'none',
                autoMarkAsLearningOnPopupOpen: !!readerSettings.autoMarkAsLearningOnPopupOpen,
                autoPlayWordOnPopup: !!readerSettings.autoPlayWordOnPopup,
                ttsVoice: readerSettings.ttsVoice,
                ttsSpeed: readerSettings.ttsSpeed
                  }}
                  readerFont={effectiveSettings.readerFont}
                  readerFontSize={effectiveSettings.readerFontSize}
                  readerWidth={effectiveSettings.readerWidth}
                  lineSpacing={effectiveSettings.lineSpacing}
                  isMobile={isMobile}
                  invisibleText={effectiveSettings.invisibleText}

                  disableWordHighlighting={effectiveSettings.disableWordHighlighting}
                  disableSentenceHighlighting={effectiveSettings.disableSentenceHighlighting}
                  highlightSentenceOnHover={effectiveSettings.highlightSentenceOnHover}
                  showCurrentWordWhenInvisible={effectiveSettings.showCurrentWordWhenInvisible}
                  isWHeld={isWHeld}
                  activeSentenceIndex={activeSentenceIndex}
                  activeWordIndex={activeWordIndex}
                  currentlyHighlightedSentence={currentlyHighlightedSentence}
                  isSentenceSelectMode={isSentenceSelectMode}
                  onSentenceClick={handleSentenceClickWrapper}
                  onCopyText={handleCopyText}
                  showCopyConfirm={showCopyConfirm}
                  enableHighlightWords={effectiveSettings.enableHighlightWords}
                  highlightInsteadOfUnderline={effectiveSettings.highlightInsteadOfUnderline}
                  getWordStatus={getWordStatus}
                  updateWordStatus={updateWordStatus}
                  hoveredWord={hoveredWord}
                  onWordHover={handleWordHover}
                  onWordDefinitionHover={handleWordDefinitionHoverWrapper}
                  onWordDefinitionLongPress={handleWordDefinitionLongPress}
                  onWordDefinitionMouseUp={handleWordDefinitionMouseUp}
                  getWordKey={getWordKey}
                  disableWordDefinitionPopup={effectiveSettings.disableWordDefinitionPopup}
                  showHeader={showHeader}
                  setCurrentlyHighlightedSentence={setCurrentlyHighlightedSentence}
                />
                
                {/* Mark Complete Button - Only show on the last page of the book */}
                {book && book.sections && currentSectionIndex === book.sections.length - 1 && currentPageIndex === sectionPages[currentSectionIndex]?.length - 1 && (
                  <div className="flex justify-center mt-8 mb-4">
                    <button
                      onClick={async () => {
                        if (book && !book.completed && user?.uid) {
                          try {
                            // 1. Batch complete all unknown words on the current page
                            const currentPages = sectionPages[currentSectionIndex] || [];
                            const currentPageSentences = currentPages[currentPageIndex] || [];
                            const currentPageWords = currentPageSentences.flatMap(sentence => 
                              sentence.split(/\s+/).filter(word => word.length > 0)
                            );
                            
                            // Get all unknown words on the current page, excluding numbers
                            const unknownWords = currentPageWords.filter(word => {
                              const cleanedWord = cleanWord(word);
                              
                              // Skip empty words (which include numbers that were cleaned to empty)
                              if (!cleanedWord || cleanedWord.length === 0) {
                                return false;
                              }
                              
                              const status = getWordStatus(cleanedWord);
                              return !status || status === 'unknown';
                            });
                            
                            // Batch update all unknown words to known status
                            if (unknownWords.length > 0) {
                              const cleanedUnknownWords = unknownWords.map(word => cleanWord(word)).filter(word => word.length > 0);
                              console.log('Words to batch update on book completion:', cleanedUnknownWords);
                              
                              if (cleanedUnknownWords.length > 0) {
                                await WordService.batchUpdateWords(user.uid, cleanedUnknownWords, 'known');
                                
                                // Update local state for immediate visual feedback
                                cleanedUnknownWords.forEach(word => {
                                  updateWordStatus(word, 'known');
                                });
                                
                                console.log(`Batch updated ${unknownWords.length} unknown words to known status on book completion`);
                              }
                            }
                            
                            // 2. Mark the current page as complete
                            await handleMarkPageComplete();
                            
                            // 3. Update the book's completed status in the database
                            await updateBookMetadata(user.uid, book.id, { completed: true });
                            
                            // 4. Update the book object locally
                            const updatedBook = { ...book, completed: true };
                            localStorage.setItem(`epub-book-${book.id}`, JSON.stringify(updatedBook));
                            
                            // 5. Force a re-render by updating the book state
                            setBook(updatedBook);
                            
                          } catch (error) {
                            console.error('Failed to mark book as completed:', error);
                            // Don't show alert - just log the error
                          }
                        }
                      }}
                      disabled={book?.completed}
                      className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                        book?.completed 
                          ? 'bg-green-500 text-white cursor-not-allowed' 
                          : 'bg-[var(--primary-color)] text-white hover:bg-[var(--primary-color)] hover:opacity-90 active:scale-95'
                      }`}
                      style={{
                        fontFamily: 'var(--font-family)',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                      }}
                    >
                      {book?.completed ? '✓ Completed!' : 'Mark Complete'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ReaderErrorBoundary>

      {/* Floating TTS Controls */}
      {isSpeechPlayerActive && (
        <SpeechPlayer
          ref={speechPlayerRef}
          sentences={currentPageSentences}
          onSentenceChange={setActiveSentenceIndex}
          onWordChange={setActiveWordIndex}
          onSentenceSelect={setActiveSentenceIndex}
          onPlaybackFinish={() => {
            setActiveSentenceIndex(null);
            setActiveWordIndex(null);
            // Only close the popup if we are at the last sentence
            if (
              typeof activeSentenceIndex === 'number' &&
              currentPageSentences.length > 0 &&
              activeSentenceIndex >= currentPageSentences.length - 1
            ) {
              setIsSpeechPlayerActive(false);
            }
          }}
          speakingRate={effectiveSettings.ttsSpeed}
          voiceName={effectiveSettings.ttsVoice}
          onProgress={setActiveSentenceIndex}
          onCurrentReadingSentenceEnd={onCurrentReadingSentenceEnd}
          onSelectModeToggle={setIsSentenceSelectMode}
          forceStartAt={forcedSpeechStartIndex}
          onForceStartProcessed={() => setForcedSpeechStartIndex(null)}
          onSettingsChange={async (newSettings: { ttsSpeed: number; ttsVoice: string | null }) => {
            // Update the reader settings with the new TTS settings
            const updatedSettings = {
              ...effectiveSettings,
              ttsSpeed: newSettings.ttsSpeed,
              ttsVoice: newSettings.ttsVoice
            };
            await savePreferences(updatedSettings);
          }}
          readerSettings={effectiveSettings}
        />
      )}
      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => {
            setShowSettings(false);
            setPendingSettings(null);
            setHasUnsavedSettings(false);
          }}
        >
          <div
            className="card-themed w-full relative"
            style={{
              fontFamily: 'var(--font-family)',
              maxWidth: 600,
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '2rem',
              boxSizing: 'border-box',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowSettings(false);
                setPendingSettings(null);
                setHasUnsavedSettings(false);
              }}
              className="absolute top-3 right-3 theme-text-secondary hover:text-red-500 text-2xl font-bold transition-colors bg-transparent border-none"
              style={{ lineHeight: 1 }}
            >
              ×
            </button>
            
            {/* Tabs */}
            <div className="flex mb-6">
              <button
                onClick={() => setSettingsTab('settings')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  settingsTab === 'settings'
                    ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                    : 'border-transparent theme-text-secondary hover:theme-text'
                }`}
              >
                Settings
              </button>
              <button
                onClick={() => setSettingsTab('shortcuts')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  settingsTab === 'shortcuts'
                    ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                    : 'border-transparent theme-text-secondary hover:theme-text'
                }`}
              >
                Keyboard Shortcuts
              </button>
            </div>
            
            {/* Settings Tab Content */}
            {settingsTab === 'settings' && (
              <>
                {/* Default Tab Selection */}
            <div className="mb-6">
              <label className="block font-bold mb-2 theme-text">Default Tab</label>
              <p className="text-sm theme-text-secondary mb-3">Which tab would you like to have open by default in the dictionary?</p>
              
              {/* Tab Icons Row */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => handlePendingSettingChange({ wordPopupDefaultTab: 'definition' })}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    (pendingSettings?.wordPopupDefaultTab || readerSettings.wordPopupDefaultTab) === 'definition'
                      ? 'border-[var(--primary-color)] bg-[var(--primary-color)] text-white'
                      : 'theme-border theme-bg hover:border-[var(--primary-color)]'
                  }`}
                >
                  <BookOpen size={20} />
                  <span className="text-xs mt-1">Definition</span>
                </button>
                
                <button
                  onClick={() => handlePendingSettingChange({ wordPopupDefaultTab: 'ai-definition' })}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    (pendingSettings?.wordPopupDefaultTab || readerSettings.wordPopupDefaultTab) === 'ai-definition'
                      ? 'border-[var(--primary-color)] bg-[var(--primary-color)] text-white'
                      : 'theme-border theme-bg hover:border-[var(--primary-color)]'
                  }`}
                >
                  <AiIcon size={20} />
                  <span className="text-xs mt-1">AI Definition</span>
                </button>
                
                <button
                  onClick={() => handlePendingSettingChange({ wordPopupDefaultTab: 'word-explain' })}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    (pendingSettings?.wordPopupDefaultTab || readerSettings.wordPopupDefaultTab) === 'word-explain'
                      ? 'border-[var(--primary-color)] bg-[var(--primary-color)] text-white'
                      : 'theme-border theme-bg hover:border-[var(--primary-color)]'
                  }`}
                >
                  <Bot size={20} />
                  <span className="text-xs mt-1">AI Word</span>
                </button>
                
                <button
                  onClick={() => handlePendingSettingChange({ wordPopupDefaultTab: 'explain' })}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    (pendingSettings?.wordPopupDefaultTab || readerSettings.wordPopupDefaultTab) === 'explain'
                      ? 'border-[var(--primary-color)] bg-[var(--primary-color)] text-white'
                      : 'theme-border theme-bg hover:border-[var(--primary-color)]'
                  }`}
                >
                  <ListOrdered size={20} />
                  <span className="text-xs mt-1">AI Sentence</span>
                </button>
                
                <button
                  onClick={() => handlePendingSettingChange({ wordPopupDefaultTab: 'translate' })}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    (pendingSettings?.wordPopupDefaultTab || readerSettings.wordPopupDefaultTab) === 'translate'
                      ? 'border-[var(--primary-color)] bg-[var(--primary-color)] text-white'
                      : 'theme-border theme-bg hover:border-[var(--primary-color)]'
                  }`}
                >
                  <Languages size={20} />
                  <span className="text-xs mt-1">Translation</span>
                </button>
                
                <button
                  onClick={() => handlePendingSettingChange({ wordPopupDefaultTab: 'sentence' })}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    (pendingSettings?.wordPopupDefaultTab || readerSettings.wordPopupDefaultTab) === 'sentence'
                      ? 'border-[var(--primary-color)] bg-[var(--primary-color)] text-white'
                      : 'theme-border theme-bg hover:border-[var(--primary-color)]'
                  }`}
                >
                  <Eye size={20} />
                  <span className="text-xs mt-1">Sentence</span>
                </button>
              </div>
              
              {/* Dropdown for mobile/alternative selection */}
              <select
                value={pendingSettings?.wordPopupDefaultTab || readerSettings.wordPopupDefaultTab || 'ai-definition'}
                onChange={e => handlePendingSettingChange({ wordPopupDefaultTab: e.target.value as any })}
                className="w-full border border-[var(--border-color)] rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] theme-bg theme-text"
              >
                <option value="definition">Definition</option>
                <option value="ai-definition">AI Definition</option>
                <option value="word-explain">AI Word Explanation</option>
                <option value="explain">AI Sentence Breakdown</option>
                <option value="translate">Translation</option>
                <option value="sentence">Sentence</option>
              </select>
            </div>
            
            <div className="mb-6">
              <label className="block font-bold mb-2 theme-text">Font Size ({pendingSettings?.readerFontSize || readerSettings.readerFontSize}px)</label>
              <input
                type="range"
                min={14}
                max={28}
                step={1}
                value={pendingSettings?.readerFontSize || readerSettings.readerFontSize}
                onChange={e => { handlePendingSettingChange({ readerFontSize: Number(e.target.value) }); }}
                className="w-full"
                style={{ accentColor: 'var(--primary-color)' }}
              />
            </div>
            <div className="mb-6">
              <label className="block font-bold mb-2 theme-text">Text Width ({pendingSettings?.readerWidth || readerSettings.readerWidth}px)</label>
              <input
                type="range"
                min={500}
                max={1600}
                step={10}
                value={pendingSettings?.readerWidth || readerSettings.readerWidth}
                onChange={e => { handlePendingSettingChange({ readerWidth: Number(e.target.value) }); }}
                className="w-full"
                style={{ accentColor: 'var(--primary-color)' }}
              />
              <div className="flex justify-between text-sm theme-text-secondary mt-1">
                <span>Narrow (~55 char)</span>
                <span>Medium (~75 char)</span>
                <span>Wide (~95 char)</span>
              </div>
            </div>
            
            {/* Single example text, black color, all settings applied */}
           
            <div className="mb-6">
              <label className="block font-bold mb-2 theme-text">Font Family</label>
              <select
                value={pendingSettings?.readerFont || readerSettings.readerFont}
                onChange={e => { handlePendingSettingChange({ readerFont: e.target.value }); }}
                className="w-full border border-[var(--border-color)] rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] theme-bg theme-text"
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
              const currentFontSize = pendingSettings?.readerFontSize || readerSettings.readerFontSize;
              const currentFont = pendingSettings?.readerFont || readerSettings.readerFont;
              const currentWidth = pendingSettings?.readerWidth || readerSettings.readerWidth;
              return (
                <div className="mt-4 mb-4 p-5 theme-border rounded theme-text" style={{ fontFamily: currentFont, fontSize: currentFontSize, maxWidth: currentWidth, backgroundColor: 'var(--background)', border: '1px solid var(--border-color)' }}>
                  Example: El rápido zorro marrón salta sobre el perro perezoso.
                </div>
              );
            })()}
            <div className="mb-6">
              <label className="block font-bold mb-2 theme-text">Container Mode</label>
              <select
                value={pendingSettings?.readerContainerStyle || readerSettings.readerContainerStyle}
                onChange={e => {
                  handlePendingSettingChange({ readerContainerStyle: e.target.value as any });
                }}
                className="w-full border border-[var(--border-color)] rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] theme-bg theme-text"
              >
                <option value="contained">Contained (default)</option>
                <option value="border">Border Only</option>
                <option value="none">None (transparent)</option>
                <option value="full-width">Full-width (long)</option>
              </select>
            </div>
            
            {/* 5. Settings modal: add sentences per page setting */}
            {/* Sentences per page setting removed - now using wordsPerPage in Book */}
            <div className="mb-6">
              <label className="block font-bold mb-2 theme-text">TTS Speed ({pendingSettings?.ttsSpeed || readerSettings.ttsSpeed}x)</label>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.05}
                value={pendingSettings?.ttsSpeed || readerSettings.ttsSpeed}
                onChange={e => {
                  handlePendingSettingChange({ ttsSpeed: Number(e.target.value) });
                }}
                className="w-full"
                style={{ accentColor: 'var(--primary-color)' }}
              />
            </div>

            <div className="mb-6">
              <label className="block font-bold mb-2 theme-text">TTS Speaker</label>
              <div className="flex gap-2 items-center">
                <select
                  value={pendingSettings?.ttsVoice || readerSettings.ttsVoice || ''}
                  onChange={e => {
                    handlePendingSettingChange({ ttsVoice: e.target.value || undefined });
                  }}
                  className="w-full border border-[var(--border-color)] rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] theme-bg theme-text max-w-[300px]"
                  style={{ maxWidth: '300px' }}
                >
                  <option value="">No speaker selected</option>
                  {(() => {
                    console.log('[Reader Settings] Filtered voices:', filteredVoices);
                    console.log('[Reader Settings] Target language:', pendingSettings?.targetLanguage || readerSettings.targetLanguage);
                    
                    return filteredVoices.map((voice: any) => (
                      <option key={voice.Name} value={voice.Name}>
                        {formatVoiceName(voice)}
                      </option>
                    ));
                  })()}
                </select>
                <button type="button" onClick={fetchVoices} disabled={isFetchingVoices} className="px-2 py-1 theme-bg-secondary rounded hover:bg-[var(--secondary-color-hover)] text-xs font-bold theme-text">
                  {isFetchingVoices ? 'Updating...' : 'Update List'}
                </button>
              </div>
              <div className="text-xs theme-text-secondary mt-1">
                Target language: {pendingSettings?.targetLanguage || readerSettings.targetLanguage}
              </div>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="disable-word-highlighting"
                type="checkbox"
                checked={pendingSettings?.disableWordHighlighting ?? readerSettings.disableWordHighlighting}
                onChange={e => {
                  handlePendingSettingChange({ disableWordHighlighting: e.target.checked });
                }}
                className="mr-3 h-5 w-5 border-2 theme-border rounded"
                style={{ accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="disable-word-highlighting" className="font-bold theme-text select-none cursor-pointer">Disable word highlighting</label>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="disable-sentence-highlighting"
                type="checkbox"
                checked={pendingSettings?.disableSentenceHighlighting ?? readerSettings.disableSentenceHighlighting}
                onChange={e => {
                  handlePendingSettingChange({ disableSentenceHighlighting: e.target.checked });
                }}
                className="mr-3 h-5 w-5 border-2 theme-border rounded"
                style={{ accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="disable-sentence-highlighting" className="font-bold theme-text select-none cursor-pointer">Disable sentence highlighting</label>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="invisible-text"
                type="checkbox"
                checked={pendingSettings?.invisibleText ?? readerSettings.invisibleText}
                onChange={e => {
                  handlePendingSettingChange({ invisibleText: e.target.checked });
                }}
                className="mr-3 h-5 w-5 border-2 theme-border rounded"
                style={{ accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="invisible-text" className="font-bold theme-text select-none cursor-pointer">Invisible text (text is rendered but not visible)</label>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="show-current-word-when-invisible"
                type="checkbox"
                checked={pendingSettings?.showCurrentWordWhenInvisible ?? readerSettings.showCurrentWordWhenInvisible}
                onChange={e => {
                  handlePendingSettingChange({ showCurrentWordWhenInvisible: e.target.checked });
                }}
                className="mr-3 h-5 w-5 border-2 theme-border rounded"
                style={{ accentColor: 'var(--primary-color)' }}
                disabled={!(pendingSettings?.invisibleText ?? readerSettings.invisibleText)}
              />
              <label htmlFor="show-current-word-when-invisible" className="font-bold theme-text select-none cursor-pointer">Show currently-being-read word when invisible</label>
            </div>
            
            {/* Settings Modal */}
            <div className="mb-6 flex items-center">
              <input
                id="highlight-sentence-on-hover"
                type="checkbox"
                checked={pendingSettings?.highlightSentenceOnHover ?? readerSettings.highlightSentenceOnHover}
                onChange={e => {
                  handlePendingSettingChange({ highlightSentenceOnHover: e.target.checked });
                }}
                className="mr-3 h-5 w-5 border-2 theme-border rounded"
                style={{ accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="highlight-sentence-on-hover" className="font-bold theme-text select-none cursor-pointer">Highlight sentences on hover</label>
            </div>
            <div className="mb-6">
              <label className="block font-bold mb-2 theme-text">Line Spacing</label>
              <input
                type="range"
                min={1.0}
                max={2.5}
                step={0.05}
                value={pendingSettings?.lineSpacing || readerSettings.lineSpacing}
                onChange={e => {
                  handlePendingSettingChange({ lineSpacing: Number(e.target.value) });
                }}
                className="w-full"
                style={{ accentColor: 'var(--primary-color)' }}
              />
              <div className="flex justify-between text-sm theme-text-secondary mt-1">
                <span>1.0</span>
                <span>1.5</span>
                <span>2.5</span>
              </div>
            </div>

            <div className="mb-6 flex items-center">
              <input
                id="show-audio-bar-on-start"
                type="checkbox"
                checked={pendingSettings?.showAudioBarOnStart ?? readerSettings.showAudioBarOnStart}
                onChange={e => {
                  handlePendingSettingChange({ showAudioBarOnStart: e.target.checked });
                }}
                className="mr-3 h-5 w-5 border-2 theme-border rounded"
                style={{ accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="show-audio-bar-on-start" className="font-bold theme-text select-none cursor-pointer">Show audio bar on start</label>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="enable-highlight-words"
                type="checkbox"
                checked={pendingSettings?.enableHighlightWords ?? readerSettings.enableHighlightWords}
                onChange={e => {
                  handlePendingSettingChange({ enableHighlightWords: e.target.checked });
                }}
                className="mr-3 h-5 w-5 border-2 theme-border rounded"
                style={{ accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="enable-highlight-words" className="font-bold theme-text select-none cursor-pointer">Enable highlight words</label>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="highlight-instead-of-underline"
                type="checkbox"
                checked={pendingSettings?.highlightInsteadOfUnderline ?? readerSettings.highlightInsteadOfUnderline}
                onChange={e => {
                  handlePendingSettingChange({ highlightInsteadOfUnderline: e.target.checked });
                }}
                className="mr-3 h-5 w-5 border-2 theme-border rounded"
                style={{ accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="highlight-instead-of-underline" className="font-bold theme-text select-none cursor-pointer">Highlight instead of underline</label>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="auto-mark-unknown-as-known"
                type="checkbox"
                checked={pendingSettings?.autoMarkUnknownAsKnownOnPageAdvance ?? readerSettings.autoMarkUnknownAsKnownOnPageAdvance}
                onChange={e => {
                  handlePendingSettingChange({ autoMarkUnknownAsKnownOnPageAdvance: e.target.checked });
                }}
                className="mr-3 h-5 w-5 border-2 theme-border rounded"
                style={{ accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="auto-mark-unknown-as-known" className="font-bold theme-text select-none cursor-pointer">Auto-mark unknown words as known when advancing pages</label>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="auto-mark-as-learning-on-popup"
                type="checkbox"
                checked={pendingSettings?.autoMarkAsLearningOnPopupOpen ?? readerSettings.autoMarkAsLearningOnPopupOpen}
                onChange={e => {
                  handlePendingSettingChange({ autoMarkAsLearningOnPopupOpen: e.target.checked });
                }}
                className="mr-3 h-5 w-5 border-2 theme-border rounded"
                style={{ accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="auto-mark-as-learning-on-popup" className="font-bold theme-text select-none cursor-pointer">Auto-mark words as learning when opening popup</label>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="disable-word-definition-popup"
                type="checkbox"
                checked={pendingSettings?.disableWordDefinitionPopup ?? readerSettings.disableWordDefinitionPopup}
                onChange={e => {
                  handlePendingSettingChange({ disableWordDefinitionPopup: e.target.checked });
                }}
                className="mr-3 h-5 w-5 border-2 theme-border rounded"
                style={{ accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="disable-word-definition-popup" className="font-bold theme-text select-none cursor-pointer">Disable word-definition popup (on click/shift)</label>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="enable-swipe-navigation"
                type="checkbox"
                checked={pendingSettings?.enableSwipeNavigation ?? readerSettings.enableSwipeNavigation ?? true}
                onChange={e => handlePendingSettingChange({ enableSwipeNavigation: e.target.checked })}
                className="mr-3 h-5 w-5 border-2 theme-border rounded"
                style={{ accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="enable-swipe-navigation" className="font-bold theme-text select-none cursor-pointer">Enable swipe left/right for page navigation</label>
            </div>

            <div className="mb-6 flex items-center">
              <input
                id="auto-mark-page-complete"
                type="checkbox"
                checked={pendingSettings?.autoMarkPageComplete ?? readerSettings.autoMarkPageComplete ?? false}
                onChange={e => handlePendingSettingChange({ autoMarkPageComplete: e.target.checked })}
                className="mr-3 h-5 w-5 border-2 theme-border rounded"
                style={{ accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="auto-mark-page-complete" className="font-bold theme-text select-none cursor-pointer">Automatically mark page complete when going to next page</label>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="disable-clipboard-button"
                type="checkbox"
                checked={pendingSettings?.disableClipboardButton ?? readerSettings.disableClipboardButton ?? false}
                onChange={e => handlePendingSettingChange({ disableClipboardButton: e.target.checked })}
                className="mr-3 h-5 w-5 border-2 theme-border rounded"
                style={{ accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="disable-clipboard-button" className="font-bold theme-text select-none cursor-pointer">Hide clipboard button in reader</label>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="enable-markdown"
                type="checkbox"
                checked={pendingSettings?.enableMarkdown ?? readerSettings.enableMarkdown ?? false}
                onChange={e => handlePendingSettingChange({ enableMarkdown: e.target.checked })}
                className="mr-3 h-5 w-5 border-2 theme-border rounded"
                style={{ accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="enable-markdown" className="font-bold theme-text select-none cursor-pointer">Render page content as markdown</label>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="auto-play-word-on-popup"
                type="checkbox"
                checked={pendingSettings?.autoPlayWordOnPopup ?? readerSettings.autoPlayWordOnPopup ?? true}
                onChange={e => handlePendingSettingChange({ autoPlayWordOnPopup: e.target.checked })}
                className="mr-3 h-5 w-5 border-2 theme-border rounded"
                style={{ accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="auto-play-word-on-popup" className="font-bold theme-text select-none cursor-pointer">Auto-play word pronunciation when popup opens</label>
            </div>

            {/* Save/Cancel Buttons - Only show on settings tab */}
            {settingsTab === 'settings' && hasUnsavedSettings && (
              <div style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 100,
                display: 'flex',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{
                  pointerEvents: 'auto',
                  background: 'rgba(255,255,255,0.98)',
                  boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
                  borderTop: '1px solid #e5e7eb',
                  borderRadius: '0 0 1rem 1rem',
                  padding: '1rem 2rem',
                  maxWidth: 400,
                  width: '100%',
                  display: 'flex',
                  gap: '1rem',
                  justifyContent: 'center',
                }}>
                  <button
                    onClick={handleSaveSettings}
                    className="btn-primary flex-1"
                  >
                    Save Settings
                  </button>
                  <button
                    onClick={handleCancelSettings}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <div className="mb-6 flex items-center justify-center">
              <button
                className="btn-secondary w-full"
                onClick={() => {
                  // Get the current target language
                  const currentTargetLang = pendingSettings?.targetLanguage || readerSettings.targetLanguage;
                  
                  // Get the default voice for this language from the TTS speakers
                  const langData = (availableVoices as any)[currentTargetLang];
                  const defaultVoice = langData?.default || null;
                  
                  // Create reset settings with the proper default voice
                  const resetSettings = {
                    ...defaultReaderSettings,
                    targetLanguage: currentTargetLang, // Preserve current target language
                    ttsVoice: defaultVoice // Set the default voice for the current target language
                  };
                  
                  setPendingSettings(resetSettings);
                  setHasUnsavedSettings(true);
                }}
              >
                Reset to Defaults
              </button>
            </div>
              </>
            )}
            
            {/* Shortcuts Tab Content */}
            {settingsTab === 'shortcuts' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold theme-text mb-4">Reader Navigation</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <span className="theme-text">Previous page</span>
                      <kbd className="px-2 py-1 theme-bg-secondary theme-text rounded text-sm font-mono">←</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <span className="theme-text">Next page</span>
                      <kbd className="px-2 py-1 theme-bg-secondary theme-text rounded text-sm font-mono">→</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <span className="theme-text">Previous page (swipe)</span>
                      <kbd className="px-2 py-1 theme-bg-secondary theme-text rounded text-sm font-mono">← Swipe</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <span className="theme-text">Next page (swipe)</span>
                      <kbd className="px-2 py-1 theme-bg-secondary theme-text rounded text-sm font-mono">→ Swipe</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <span className="theme-text">Mark/Unmark page complete</span>
                      <kbd className="px-2 py-1 theme-bg-secondary theme-text rounded text-sm font-mono">Enter</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <span className="theme-text">Toggle invisible text</span>
                      <kbd className="px-2 py-1 theme-bg-secondary theme-text rounded text-sm font-mono">I</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <span className="theme-text">Toggle section sidebar</span>
                      <kbd className="px-2 py-1 theme-bg-secondary theme-text rounded text-sm font-mono">S</kbd>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-bold theme-text mb-4">Speech Player</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <span className="theme-text">Play/Pause</span>
                      <kbd className="px-2 py-1 theme-bg-secondary theme-text rounded text-sm font-mono">P</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <span className="theme-text">Play/Pause (alternative)</span>
                      <kbd className="px-2 py-1 theme-bg-secondary theme-text rounded text-sm font-mono">W</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <span className="theme-text">Previous sentence</span>
                      <kbd className="px-2 py-1 theme-bg-secondary theme-text rounded text-sm font-mono">A</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <span className="theme-text">Next sentence</span>
                      <kbd className="px-2 py-1 theme-bg-secondary theme-text rounded text-sm font-mono">D</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <span className="theme-text">Repeat current sentence</span>
                      <kbd className="px-2 py-1 theme-bg-secondary theme-text rounded text-sm font-mono">R</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <span className="theme-text">Hold W for invisible text</span>
                      <kbd className="px-2 py-1 theme-bg-secondary theme-text rounded text-sm font-mono">Hold W</kbd>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-bold theme-text mb-4">Word Interaction</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <span className="theme-text">Show word definition</span>
                      <kbd className="px-2 py-1 theme-bg-secondary theme-text rounded text-sm font-mono">Click</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <span className="theme-text">Show word definition (alternative)</span>
                      <kbd className="px-2 py-1 theme-bg-secondary theme-text rounded text-sm font-mono">Shift + Click</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <span className="theme-text">Mark word as known</span>
                      <kbd className="px-2 py-1 theme-bg-secondary theme-text rounded text-sm font-mono">1</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <span className="theme-text">Mark word as tracking</span>
                      <kbd className="px-2 py-1 theme-bg-secondary theme-text rounded text-sm font-mono">2</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <span className="theme-text">Mark word as ignored</span>
                      <kbd className="px-2 py-1 theme-bg-secondary theme-text rounded text-sm font-mono">3</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <span className="theme-text">Mark word as unknown</span>
                      <kbd className="px-2 py-1 theme-bg-secondary theme-text rounded text-sm font-mono">4</kbd>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-bold theme-text mb-4">Sentence Selection</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <span className="theme-text">Toggle sentence select mode</span>
                      <kbd className="px-2 py-1 theme-bg-secondary theme-text rounded text-sm font-mono">Click purple button</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b theme-border">
                      <span className="theme-text">Select sentence</span>
                      <kbd className="px-2 py-1 theme-bg-secondary theme-text rounded text-sm font-mono">Click sentence</kbd>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
      
     
    </div>
  );
} 