'use client';

import { useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useReaderState } from '@/hooks/useReaderState';
import { useReaderKeyboard } from '@/hooks/useReaderKeyboard';
import { ReaderHeader } from '@/components/reader/ReaderHeader';
import { ReaderSidebar } from '@/components/reader/ReaderSidebar';
import { ReaderContent } from '@/components/reader/ReaderContent';
import { ReaderSettings } from '@/components/reader/ReaderSettings';
import { ReaderPopups } from '@/components/reader/ReaderPopups';
import { EpubHtmlStyles } from '@/components/EpubHtmlStyles';
import { getReaderContainerClass, getReaderContainerStyle } from '@/components/reader/ReaderUtils';
// @ts-ignore
import SpeechPlayerImport from '../../../components/SpeechPlayer.jsx';
const SpeechPlayer: any = SpeechPlayerImport;

export default function ReaderPage() {
  const { user } = useAuth();
  const speechPlayerRef = useRef(null);

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
    currentlyHighlightedSentence,
    savedSentencesSet,
    showWordsReadPopup,
    showUnmarkedPopup,
    showCopyConfirm,
    showSentenceSaved,
    
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
  });

  // Apply theme to html[data-theme]
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', readerSettings.theme);
  }, [readerSettings.theme]);

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

  // Function to handle when current reading sentence ends
  const onCurrentReadingSentenceEnd = (sentenceIndex: number) => {
    setActiveSentenceIndex(null);
    setActiveWordIndex(null);
  };

  // Handle sentence hover
  const handleSentenceHover = (sentenceIndex: number | null) => {
    setCurrentlyHighlightedSentence(sentenceIndex);
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

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}>
      <EpubHtmlStyles />
      
      {/* Header */}
      <ReaderHeader
        book={book}
        currentSection={currentSection}
        currentSectionIndex={currentSectionIndex}
        globalPageNumber={globalPageNumber}
        totalPages={totalPages}
        isPageRead={isPageRead}
        isMobile={isMobile}
        showHeader={showHeader}
        isSpeechPlayerActive={isSpeechPlayerActive}
        showSectionSidebar={showSectionSidebar}
        onBackToLibrary={backToLibrary}
        onToggleHeader={() => setShowHeader(prev => !prev)}
        onToggleSectionSidebar={() => setShowSectionSidebar(v => !v)}
        onToggleSpeechPlayer={() => setIsSpeechPlayerActive(!isSpeechPlayerActive)}
        onPrevPage={prevPage}
        onNextPage={nextPage}
        onMarkPageComplete={handleMarkPageComplete}
        onUnmarkPageComplete={handleUnmarkPageComplete}
        onShowSettings={() => setShowSettings(true)}
        onFullscreen={handleFullscreen}
      />

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
            <div className={getReaderContainerClass(readerSettings.readerContainerStyle)} style={{
              ...getReaderContainerStyle(readerSettings.readerContainerStyle, readerSettings.readerFont, readerSettings.readerWidth, isMobile),
              margin: '0 auto',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              color: readerSettings.invisibleText && !readerSettings.disableSentenceHighlighting && !readerSettings.disableWordHighlighting ? 'rgba(0,0,0,0.001)' : '#232946',
              maxWidth: isMobile ? '95vw' : readerSettings.readerWidth,
              width: isMobile ? '100%' : readerSettings.readerWidth,
              padding: isMobile ? '1.25rem 0.5rem' : '1.5rem',
              boxSizing: 'border-box',
              overflowX: isMobile ? 'hidden' : undefined,
            }}>
              {/* Page content */}
              <ReaderContent
                flatSentences={currentPageSentences}
                readerFont={readerSettings.readerFont}
                readerFontSize={readerSettings.readerFontSize}
                readerWidth={readerSettings.readerWidth}
                lineSpacing={readerSettings.lineSpacing}
                isMobile={isMobile}
                invisibleText={readerSettings.invisibleText}
                disableSentenceSpans={readerSettings.disableSentenceSpans}
                disableWordSpans={readerSettings.disableWordSpans}
                disableWordHighlighting={readerSettings.disableWordHighlighting}
                disableSentenceHighlighting={readerSettings.disableSentenceHighlighting}
                highlightSentenceOnHover={readerSettings.highlightSentenceOnHover}
                showCurrentWordWhenInvisible={readerSettings.showCurrentWordWhenInvisible}
                isWHeld={isWHeld}
                activeSentenceIndex={activeSentenceIndex}
                activeWordIndex={activeWordIndex}
                currentlyHighlightedSentence={currentlyHighlightedSentence}
                isSentenceSelectMode={isSentenceSelectMode}
                savedSentencesSet={savedSentencesSet}
                onSentenceClick={handleSentenceClick}
                onSentenceHover={handleSentenceHover}
                onCopyText={handleCopyText}
                showCopyConfirm={showCopyConfirm}
              />
            </div>
          </div>
        </div>
      </div>

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
          speakingRate={readerSettings.ttsSpeed}
          voiceName={readerSettings.ttsVoice}
          onProgress={setActiveSentenceIndex}
          onCurrentReadingSentenceEnd={onCurrentReadingSentenceEnd}
          onSelectModeToggle={setIsSentenceSelectMode}
          forceStartAt={forcedSpeechStartIndex}
          onForceStartProcessed={() => setForcedSpeechStartIndex(null)}
        />
      )}

      {/* Settings Modal */}
      <ReaderSettings
        showSettings={showSettings}
        settings={readerSettings}
        availableVoices={availableVoices}
        isFetchingVoices={isFetchingVoices}
        onClose={() => setShowSettings(false)}
        onSavePreferences={savePreferences}
        onFetchVoices={fetchVoices}
      />

      {/* Floating Popups */}
      <ReaderPopups
        showWordsReadPopup={showWordsReadPopup}
        showUnmarkedPopup={showUnmarkedPopup}
        showCopyConfirm={showCopyConfirm}
        showSentenceSaved={showSentenceSaved}
      />
    </div>
  );
} 