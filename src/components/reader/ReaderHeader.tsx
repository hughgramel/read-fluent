import React from 'react';
import { ArrowLeft, Settings, Maximize2, List, CheckCircle, XCircle } from 'lucide-react';
import { Book, BookSection } from './ReaderTypes';
import { getSectionTitle } from './ReaderUtils';

interface ReaderHeaderProps {
  book: Book;
  currentSection: BookSection | undefined;
  currentSectionIndex: number;
  globalPageNumber: number;
  totalPages: number;
  isPageRead: boolean;
  isMobile: boolean;
  showHeader: boolean;
  isSpeechPlayerActive: boolean;
  showSectionSidebar: boolean;
  onBackToLibrary: () => void;
  onToggleHeader: () => void;
  onToggleSectionSidebar: () => void;
  onToggleSpeechPlayer: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onMarkPageComplete: () => void;
  onUnmarkPageComplete: () => void;
  onShowSettings: () => void;
  onFullscreen: () => void;
}

export function ReaderHeader({
  book,
  currentSection,
  currentSectionIndex,
  globalPageNumber,
  totalPages,
  isPageRead,
  isMobile,
  showHeader,
  isSpeechPlayerActive,
  showSectionSidebar,
  onBackToLibrary,
  onToggleHeader,
  onToggleSectionSidebar,
  onToggleSpeechPlayer,
  onPrevPage,
  onNextPage,
  onMarkPageComplete,
  onUnmarkPageComplete,
  onShowSettings,
  onFullscreen,
}: ReaderHeaderProps) {
  return (
    <>
      {/* Mobile: Dropdown icon is in the bar when header is visible, floating when hidden */}
      {isMobile ? (
        <div className="fixed top-0 left-0 w-full z-50 pointer-events-none" style={{ height: '56px' }}>
          <div className="relative w-full h-full flex items-center justify-end pr-2">
            <button
              onClick={onToggleHeader}
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
          onClick={onToggleHeader}
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
                onClick={onBackToLibrary} 
                className={`flex items-center justify-center ${isMobile ? 'w-8 h-8 min-w-0 min-h-0 p-0' : 'gap-2 px-4 py-2'} font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors ${isMobile ? '' : 'text-base'}`}
                style={isMobile ? { width: 32, height: 32, minWidth: 28, minHeight: 28 } : {}}
              >
                <ArrowLeft className={isMobile ? 'w-4 h-4' : 'w-6 h-6'} />
              </button>
              <button 
                onClick={onToggleSectionSidebar} 
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
                  onClick={onToggleSpeechPlayer}
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
                onClick={onPrevPage} 
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
                onClick={onNextPage} 
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
                onClick={onShowSettings}
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
                  onClick={onFullscreen}
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
                  onClick={onToggleSpeechPlayer}
                  className="flex items-center gap-2 px-4 py-2 font-bold text-white bg-[#2563eb] rounded-full shadow-sm hover:bg-[#1749b1] focus:bg-[#1749b1] border-none transition-colors text-base"
                  title={isSpeechPlayerActive ? 'Hide Speech Player' : 'Show Speech Player'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  {isSpeechPlayerActive ? '' : ''}
                </button>
              )}
              
              {/* Complete/Uncomplete button */}
              {isMobile ? (
                isPageRead ? (
                  <button onClick={onUnmarkPageComplete} className="flex items-center justify-center w-8 h-8 min-w-0 min-h-0 p-0 rounded bg-green-500 text-white" title="Uncomplete">
                    <XCircle className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={onMarkPageComplete} className="flex items-center justify-center w-8 h-8 min-w-0 min-h-0 p-0 rounded bg-blue-500 text-white" title="Complete">
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )
              ) : (
                isPageRead ? (
                  <button onClick={onUnmarkPageComplete} className="rounded bg-green-500 text-white font-bold whitespace-nowrap px-4 py-2">Uncomplete</button>
                ) : (
                  <button onClick={onMarkPageComplete} className="rounded bg-blue-500 text-white font-bold whitespace-nowrap px-4 py-2">Complete</button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
} 