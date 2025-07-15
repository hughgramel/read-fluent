'use client';

import { useRef, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useReaderState } from '@/hooks/useReaderState';
import { useReaderKeyboard } from '@/hooks/useReaderKeyboard';
import { useTheme } from '@/contexts/ThemeContext';
import { ReaderHeader } from '@/components/reader/ReaderHeader';
import { ReaderSidebar } from '@/components/reader/ReaderSidebar';
import { ReaderContent } from '@/components/reader/ReaderContent';
import { ReaderSettings } from '@/components/reader/ReaderSettings';
import { ReaderPopups } from '@/components/reader/ReaderPopups';
import { EpubHtmlStyles } from '@/components/EpubHtmlStyles';
import { WordDefinitionPopup } from '@/components/reader/WordDefinitionPopup';
import { getReaderContainerClass, getReaderContainerStyle, getSectionTitle } from '@/components/reader/ReaderUtils';
import { ReaderSettings as ReaderSettingsType } from '@/components/reader/ReaderTypes';
import { ArrowLeft, List, Settings, Maximize2, XCircle, CheckCircle } from 'lucide-react';
// @ts-ignore
import SpeechPlayerImport from '../../../components/SpeechPlayer.jsx';
import React from 'react';
const SpeechPlayer: any = SpeechPlayerImport;

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
            <div className="text-sm text-gray-500">Try refreshing the page or disabling browser extensions that modify the DOM.</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ReaderPage() {
  const { user } = useAuth();
  const { currentTheme } = useTheme();
  const speechPlayerRef = useRef(null);
  const [pendingSettings, setPendingSettings] = useState<ReaderSettingsType | null>(null);
  const [hasUnsavedSettings, setHasUnsavedSettings] = useState(false);

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
  } = useReaderState(user);

  // Keyboard navigation
  useReaderKeyboard({
    onPrevPage: prevPage,
    onNextPage: nextPage,
    onMarkPageComplete: handleMarkPageComplete,
    onUnmarkPageComplete: handleUnmarkPageComplete,
    onToggleInvisibleText: () => savePreferences({ invisibleText: !readerSettings.invisibleText }),
    onToggleSectionSidebar: () => setShowSectionSidebar(v => !v),
    onRepeatSentence: () => {
      // @ts-ignore
      if (speechPlayerRef.current && typeof speechPlayerRef.current.repeatCurrentSentence === 'function') {
        // @ts-ignore
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

  // Handle sentence hover
  const handleSentenceHover = (sentenceIndex: number | null) => {
    setCurrentlyHighlightedSentence(sentenceIndex);
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

  // Handle pending settings changes
  const handlePendingSettingChange = (newSettings: Partial<ReaderSettingsType>) => {
    if (pendingSettings) {
      setPendingSettings({ ...pendingSettings, ...newSettings });
      setHasUnsavedSettings(true);
    }
  };

  // Save pending settings
  const handleSaveSettings = async () => {
    if (pendingSettings) {
      await savePreferences(pendingSettings);
      setHasUnsavedSettings(false);
      setShowSettings(false);
    }
  };

  // Cancel pending settings
  const handleCancelSettings = () => {
    setPendingSettings(readerSettings);
    setHasUnsavedSettings(false);
    setShowSettings(false);
  };

  // Prevent popup from opening if TTS or sentence select mode is active
  const handleWordDefinitionHoverWrapper = (word: string | null, event?: React.MouseEvent, key?: string) => {
    if (isSpeechPlayerActive || isSentenceSelectMode) return;
    handleWordDefinitionHover(word, event, key);
  };


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
      <div className="min-h-screen flex items-center justify-center text-gray-600 text-xl">
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
                onClick={prevPage} 
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
                onClick={nextPage} 
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
        <div className="flex w-full px-0 py-12" style={{ margin: '0 auto' }}>
          
          {/* Section Sidebar */}
          {showSectionSidebar && (
            <ReaderSidebar
              book={book}
              sectionPages={sectionPages}
              currentSectionIndex={currentSectionIndex}
              readPagesBySection={readPagesBySection}
              showSectionWordCount={showSectionWordCount}
              onGoToPage={goToPage}
              onToggleSectionWordCount={setShowSectionWordCount}
            />
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
          >
            <div className="flex flex-col items-center justify-start w-full" style={{ minHeight: 'calc(100vh - 260px)', height: '100%' }}>
              <div className={getReaderContainerClass(effectiveSettings.readerContainerStyle)} style={{
                ...getReaderContainerStyle(effectiveSettings.readerContainerStyle, effectiveSettings.readerFont, effectiveSettings.readerWidth, isMobile),
                margin: '0 auto',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                color: effectiveSettings.invisibleText && !effectiveSettings.disableSentenceHighlighting && !effectiveSettings.disableWordHighlighting ? 'rgba(0,0,0,0.001)' : '#232946',
                maxWidth: isMobile ? '95vw' : effectiveSettings.readerWidth,
                width: isMobile ? '100%' : effectiveSettings.readerWidth,
                padding: isMobile ? '1.25rem 0.5rem' : '1.5rem',
                boxSizing: 'border-box',
                overflowX: isMobile ? 'hidden' : undefined,
              }}>
                {/* Page content */}
                <ReaderContent
                  flatSentences={currentPageSentences}
                  readerFont={effectiveSettings.readerFont}
                  readerFontSize={effectiveSettings.readerFontSize}
                  readerWidth={effectiveSettings.readerWidth}
                  lineSpacing={effectiveSettings.lineSpacing}
                  isMobile={isMobile}
                  invisibleText={effectiveSettings.invisibleText}
                  disableSentenceSpans={effectiveSettings.disableSentenceSpans}
                  disableWordSpans={effectiveSettings.disableWordSpans}
                  disableWordHighlighting={effectiveSettings.disableWordHighlighting}
                  disableSentenceHighlighting={effectiveSettings.disableSentenceHighlighting}
                  highlightSentenceOnHover={effectiveSettings.highlightSentenceOnHover}
                  showCurrentWordWhenInvisible={effectiveSettings.showCurrentWordWhenInvisible}
                  isWHeld={isWHeld}
                  activeSentenceIndex={activeSentenceIndex}
                  activeWordIndex={activeWordIndex}
                  currentlyHighlightedSentence={currentlyHighlightedSentence}
                  isSentenceSelectMode={isSentenceSelectMode}
                  onSentenceClick={handleSentenceClick}
                  onSentenceHover={handleSentenceHover}
                  onCopyText={handleCopyText}
                  showCopyConfirm={showCopyConfirm}
                  enableHighlightWords={effectiveSettings.enableHighlightWords}
                  getWordStatus={getWordStatus}
                  hoveredWord={hoveredWord}
                  onWordHover={handleWordHover}
                  onWordDefinitionHover={handleWordDefinitionHoverWrapper}
                  onWordDefinitionLongPress={handleWordDefinitionLongPress}
                  onWordDefinitionMouseUp={handleWordDefinitionMouseUp}
                  getWordKey={getWordKey}
                />
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
              maxWidth: 400,
              maxHeight: '90vh',
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
            <h2 className="text-2xl font-extrabold mb-4 theme-text tracking-tight text-center">Reader Settings</h2>
                          <div className="mb-6">
                <label className="block font-bold mb-2 theme-text">Font Size ({pendingSettings?.readerFontSize || readerSettings.readerFontSize}px)</label>
              <input
                type="range"
                min={14}
                max={28}
                step={1}
                value={pendingSettings?.readerFontSize || readerSettings.readerFontSize}
                onChange={e => { handlePendingSettingChange({ readerFontSize: Number(e.target.value) }); }}
                className="w-full accent-[#2563eb]"
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
              <label className="block font-bold mb-2 theme-text">Font Family</label>
              <select
                value={pendingSettings?.readerFont || readerSettings.readerFont}
                onChange={e => { handlePendingSettingChange({ readerFont: e.target.value }); }}
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
              const currentFontSize = pendingSettings?.readerFontSize || readerSettings.readerFontSize;
              const currentFont = pendingSettings?.readerFont || readerSettings.readerFont;
              const currentWidth = pendingSettings?.readerWidth || readerSettings.readerWidth;
              // Log font size and width for the settings example text
              console.log('Settings example text font size:', currentFontSize, 'and width:', currentWidth);
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
              <label className="block font-bold mb-2 theme-text">Sentences per Page</label>
              <input
                type="number"
                min={10}
                max={200}
                step={1}
                value={pendingSettings?.sentencesPerPage || readerSettings.sentencesPerPage}
                onChange={e => {
                  handlePendingSettingChange({ sentencesPerPage: Number(e.target.value) });
                }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
            </div>
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
                className="w-full accent-[#2563eb]"
              />
            </div>

            <div className="mb-6">
              <label className="block font-bold mb-2 theme-text">Voice Option</label>
              <div className="flex gap-2 items-center">
                <select
                  value={pendingSettings?.ttsVoice || readerSettings.ttsVoice}
                  onChange={e => {
                    handlePendingSettingChange({ ttsVoice: e.target.value });
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
                checked={pendingSettings?.disableWordHighlighting ?? readerSettings.disableWordHighlighting}
                onChange={e => {
                  handlePendingSettingChange({ disableWordHighlighting: e.target.checked });
                }}
                className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
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
                className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
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
                className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
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
                className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
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
                className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
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
                checked={pendingSettings?.disableWordSpans ?? readerSettings.disableWordSpans}
                onChange={e => {
                  handlePendingSettingChange({ disableWordSpans: e.target.checked });
                }}
                className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
              />
              <label htmlFor="disable-word-spans" className="font-bold theme-text select-none cursor-pointer">Disable word-level spans (only wrap sentences)</label>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="disable-sentence-spans"
                type="checkbox"
                checked={pendingSettings?.disableSentenceSpans ?? readerSettings.disableSentenceSpans}
                onChange={e => {
                  handlePendingSettingChange({ disableSentenceSpans: e.target.checked });
                }}
                className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
              />
              <label htmlFor="disable-sentence-spans" className="font-bold theme-text select-none cursor-pointer">Disable sentence-level spans (merge all text on page)</label>
            </div>
            <div className="mb-6 flex items-center">
              <input
                id="show-audio-bar-on-start"
                type="checkbox"
                checked={pendingSettings?.showAudioBarOnStart ?? readerSettings.showAudioBarOnStart}
                onChange={e => {
                  handlePendingSettingChange({ showAudioBarOnStart: e.target.checked });
                }}
                className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
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
                className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
              />
              <label htmlFor="enable-highlight-words" className="font-bold theme-text select-none cursor-pointer">Enable highlight words</label>
            </div>

            {/* Save/Cancel Buttons */}
            {hasUnsavedSettings && (
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
      
      {/* Word Definition Popup */}
      <WordDefinitionPopup
        word={wordDefinitionPopup.word}
        position={wordDefinitionPopup.position}
        isVisible={wordDefinitionPopup.isVisible}
        onClose={closeWordDefinitionPopup}
        onMouseEnter={handleDefinitionPopupMouseEnter}
        onMouseLeave={handleDefinitionPopupMouseLeave}
      />
    </div>
  );
} 