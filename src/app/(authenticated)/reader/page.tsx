'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBooks, getBookJson, updateBookMetadata } from '@/services/epubService';
import { useAuth } from '@/hooks/useAuth';
import { UserService } from '@/services/userService';

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

  // Load book from Firebase Storage
  useEffect(() => {
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
      const baseSpeed = 30;
      const interval = 16;
      const pixelsPerInterval = (baseSpeed * scrollSpeed * interval) / 1000;
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
    router.push('/dashboard');
  };

  // Save reading progress to Firestore metadata and localStorage
  useEffect(() => {
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
        }
      });
    }
  }, [user]);

  // Save preferences when changed
  const savePreferences = async (font: string, width: number, fontSize: number) => {
    if (user?.uid) {
      await UserService.updateUserPreferences(user.uid, { readerFont: font, readerWidth: width, readerFontSize: fontSize });
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

  return (
    <div className="min-h-screen bg-gray-50 [font-family:var(--font-mplus-rounded)] relative">
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
        <div className="bg-white border-b-2 border-gray-300 shadow-[0_6px_0px_#d1d5db] fixed top-0 left-0 w-full z-20" style={{ minHeight: isMobile ? '56px' : '64px', paddingTop: 0, paddingBottom: 0 }}>
          {isMobile ? (
            <div className="w-full px-2 flex items-center justify-between relative" style={{ minHeight: '56px', height: '56px' }}>
              {/* Left: Back button */}
              <div className="flex items-center h-full">
                <button
                  onClick={backToLibrary}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white font-semibold text-[#0B1423] border-2 border-[#d1d5db] shadow-[0_4px_0px_#d1d5db] hover:bg-gray-50 active:translate-y-[1px] active:shadow-[0_2px_0px_#d1d5db] transition-all w-8 h-8 p-0 text-base"
                  style={{ minWidth: 32, minHeight: 32, width: 32, height: 32 }}
                  aria-label="Back to Library"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
              </div>
              {/* Center: Section navigation */}
              <div className="flex items-center gap-2 h-full">
                <button
                  onClick={() => prevSection()}
                  disabled={currentSection === 0}
                  className="flex items-center justify-center gap-2 rounded-lg font-semibold border-2 border-[#4792ba] bg-[#67b9e7] text-white shadow-[0_4px_0_#4792ba] hover:bg-[#4792ba] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed w-8 h-8 p-0 text-base"
                  style={{ minWidth: 32, minHeight: 32, width: 32, height: 32 }}
                  aria-label="Previous Section"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-[#0B1423] font-bold text-sm flex items-center justify-center" style={{ minWidth: '48px', textAlign: 'center', height: '32px', lineHeight: '32px' }}>{section.title}</span>
                <button
                  onClick={() => nextSection()}
                  disabled={currentSection === (book.sections.length || 0) - 1}
                  className="flex items-center justify-center gap-2 rounded-lg font-semibold border-2 border-[#4792ba] bg-[#67b9e7] text-white shadow-[0_4px_0_#4792ba] hover:bg-[#4792ba] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed w-8 h-8 p-0 text-base"
                  style={{ minWidth: 32, minHeight: 32, width: 32, height: 32 }}
                  aria-label="Next Section"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              {/* Right: Controls, now to the left of the dropdown icon */}
              <div className="flex items-center gap-1 h-full pr-10"> {/* pr-10 to make space for dropdown icon */}
                <button
                  onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold border-2 border-green-700 bg-green-500 text-white shadow-[0_4px_0_#166534] hover:bg-green-600 transition-all ${isAutoScrolling ? 'opacity-80' : ''} w-8 h-8 p-0 text-base`}
                  style={{ minWidth: 32, minHeight: 32, width: 32, height: 32 }}
                  title={isAutoScrolling ? 'Pause auto-scroll' : 'Start auto-scroll'}
                  aria-label="Toggle Auto-Scroll"
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
                <button
                  onClick={() => {
                    const next = scrollSpeed >= 5 ? 0.5 : +(scrollSpeed + 0.5).toFixed(1);
                    setScrollSpeed(next);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-0 py-0 text-xs font-semibold border-2 border-green-700 bg-white text-green-700 shadow-[0_4px_0_#166534] hover:bg-green-50 transition-all w-8 h-8"
                  style={{ minWidth: 32, minHeight: 32, width: 32, height: 32 }}
                  title="Change scroll speed"
                  aria-label="Change Scroll Speed"
                >
                  {scrollSpeed.toFixed(1)}x
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-0 py-0 text-base font-semibold border-2 border-gray-300 bg-white text-[#0B1423] hover:bg-gray-100 transition-all w-8 h-8"
                  style={{ minWidth: 32, minHeight: 32, width: 32, height: 32 }}
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
                  className={`inline-flex items-center justify-center gap-2 rounded-lg bg-white font-semibold text-[#0B1423] border-2 border-[#d1d5db] shadow-[0_4px_0px_#d1d5db] hover:bg-gray-50 active:translate-y-[1px] active:shadow-[0_2px_0px_#d1d5db] transition-all ${isMobile ? 'w-8 h-8 p-0 text-base' : 'px-5 py-3 text-lg'}`}
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
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-3 text-lg font-semibold text-[#0B1423] border-2 border-[#d1d5db] shadow-[0_4px_0px_#d1d5db] hover:bg-gray-50 active:translate-y-[1px] active:shadow-[0_2px_0px_#d1d5db] transition-all ml-2"
                    title="Show/Hide sections"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                )}
              </div>
              {/* Section navigation (centered) */}
              <div className="flex items-center gap-4 mx-auto" style={{ position: 'relative', left: 0, right: 0 }}>
                <button
                  onClick={() => prevSection()}
                  disabled={currentSection === 0}
                  className={`flex items-center justify-center gap-2 rounded-lg font-semibold border-2 border-[#4792ba] bg-[#67b9e7] text-white shadow-[0_4px_0_#4792ba] hover:bg-[#4792ba] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed ${isMobile ? 'w-8 h-8 p-0 text-base' : 'px-5 py-3 text-lg'}`}
                  style={isMobile ? { minWidth: 32, minHeight: 32, width: 32, height: 32 } : {}}
                >
                  <svg className={isMobile ? 'w-4 h-4' : 'w-6 h-6'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className={`text-[#0B1423] font-bold ${isMobile ? 'text-sm' : 'text-xl'}`} style={{ minWidth: isMobile ? '48px' : '140px', textAlign: 'center' }}>{section.title}</span>
                <button
                  onClick={() => nextSection()}
                  disabled={currentSection === (book.sections.length || 0) - 1}
                  className={`flex items-center justify-center gap-2 rounded-lg font-semibold border-2 border-[#4792ba] bg-[#67b9e7] text-white shadow-[0_4px_0_#4792ba] hover:bg-[#4792ba] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed ${isMobile ? 'w-8 h-8 p-0 text-base' : 'px-5 py-3 text-lg'}`}
                  style={isMobile ? { minWidth: 32, minHeight: 32, width: 32, height: 32 } : {}}
                >
                  <svg className={isMobile ? 'w-4 h-4' : 'w-6 h-6'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              {/* Right controls (move left, not fully flush right) */}
              <div className="absolute right-32 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {/* Auto-scroll */}
                <button
                  onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold border-2 border-green-700 bg-green-500 text-white shadow-[0_4px_0_#166534] hover:bg-green-600 transition-all ${isAutoScrolling ? 'opacity-80' : ''} ${isMobile ? 'w-8 h-8 p-0 text-base' : 'px-4 py-3 text-lg'}`}
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
                    className="inline-flex items-center gap-2 rounded-lg px-4 py-3 text-lg font-semibold border-2 border-green-700 bg-white text-green-700 shadow-[0_4px_0_#166534] hover:bg-green-50 transition-all"
                    title="Change scroll speed"
                  >
                    {scrollSpeed.toFixed(1)}x
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-1 shadow-sm border-2 border-[#d1d5db] ml-2">
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.1"
                      value={scrollSpeed}
                      onChange={(e) => setScrollSpeed(Number(e.target.value))}
                      className="w-24 accent-green-600"
                    />
                    <span className="text-sm font-medium text-gray-600 min-w-[2rem] text-center">
                      {scrollSpeed.toFixed(1)}x
                    </span>
                  </div>
                )}
                {/* Fullscreen */}
                {!isMobile && (<button
                  onClick={handleFullscreen}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-3 text-lg font-semibold border-2 border-gray-300 bg-white text-[#0B1423] hover:bg-gray-100 transition-all"
                  title="Toggle Fullscreen"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M4 4h6M4 4v6M20 20h-6M20 20v-6M4 20v-6M4 20h6M20 4h-6M20 4v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>)}
                {/* Settings: cog on desktop, emoji on mobile */}
                <button
                  onClick={() => setShowSettings(true)}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-3 text-lg font-semibold border-2 border-gray-300 bg-white text-[#0B1423] hover:bg-gray-100 transition-all"
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
            className="bg-white w-64 max-w-full z-10 rounded-xl pb-6 transition-all duration-300"
            style={{
              position: 'fixed',
              top: '54%',
              left: showSidebar ? '2rem' : '-20rem',
              opacity: showSidebar ? 1 : 0,
              height: '70vh',
              minHeight: '400px',
              boxShadow: '0 6px 0 #d1d5db',
              borderRight: '2px solid #e5e7eb',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 10,
              transform: 'translateY(-50%)',
              pointerEvents: showSidebar ? 'auto' : 'none',
            }}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
              <span className="font-bold text-lg text-[#0B1423]">Sections</span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {book.sections.map((s, idx) => (
                <button
                  key={s.id || idx}
                  onClick={() => { setCurrentSection(idx); router.replace(`/reader?book=${book.id}&section=${idx}`); }}
                  className={`block w-full text-left px-3 py-2 rounded-lg mb-1 font-medium border ${idx === currentSection ? 'bg-blue-100 text-blue-700 border-blue-400' : 'bg-white text-[#0B1423] border-transparent hover:bg-gray-100'}`}
                >
                  {s.title}
                </button>
              ))}
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
          <div className="bg-white rounded-lg border-2 border-[#d1d5db] shadow-[0_6px_0px_#d1d5db] p-12 mb-12" style={{ fontFamily: 'var(--font-mplus-rounded)', fontSize: '1.1rem', maxWidth: isMobile ? '100vw' : readerWidth, margin: '0 auto', width: '100%', padding: isMobile ? '1.5rem 0.5rem' : undefined }}>
            <div
              ref={contentRef}
              className="prose prose-lg max-w-none text-gray-800 leading-relaxed overflow-y-auto scroll-smooth"
              style={{ scrollBehavior: 'smooth', fontFamily: readerFont, fontSize: readerFontSize, margin: '0 auto', height: 'calc(100vh - 260px)' }}
            >
              {section.content.split('\n\n').map((paragraph, index) => (
                <p key={index} className="mb-6 text-lg">
                  {paragraph}
                </p>
              ))}
              <div style={{ height: '200px' }} />
            </div>
          </div>
        </div>
      </div>
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-lg p-8 border-2 border-gray-300 shadow-lg max-w-md w-full relative">
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-2xl"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-4 text-[#0B1423]">Reader Settings</h2>
            <div className="mb-6">
              <label className="block font-semibold mb-2 text-black">Font</label>
              <select
                value={readerFont}
                onChange={e => { setReaderFont(e.target.value); savePreferences(e.target.value, readerWidth, readerFontSize); }}
                className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-[#4792ba] focus:ring-2 focus:ring-[#a8dcfd] outline-none transition-all text-black"
              >
                <option value="serif">Serif</option>
                <option value="sans-serif">Sans Serif</option>
                <option value="Merriweather, serif">Merriweather</option>
                <option value="EB Garamond, serif">EB Garamond</option>
                <option value="Playfair Display, serif">Playfair Display</option>
              </select>
            </div>
            <div className="mb-6">
              <label className="block font-semibold mb-2 text-black">Font Size ({readerFontSize}px)</label>
              <input
                type="range"
                min={14}
                max={28}
                step={1}
                value={readerFontSize}
                onChange={e => { setReaderFontSize(Number(e.target.value)); savePreferences(readerFont, readerWidth, Number(e.target.value)); }}
                className="w-full accent-blue-600"
              />
            </div>
            <div className="mb-6">
              <label className="block font-semibold mb-2 text-black">Text Width ({readerWidth}px)</label>
              <input
                type="range"
                min={600}
                max={1000}
                step={10}
                value={readerWidth}
                onChange={e => { setReaderWidth(Number(e.target.value)); savePreferences(readerFont, Number(e.target.value), readerFontSize); }}
                className="w-full accent-blue-600"
              />
            </div>
            {/* Single example text, black color, all settings applied */}
            <div className="mt-4 p-2 border rounded bg-gray-50 text-black" style={{ fontFamily: readerFont, fontSize: readerFontSize, maxWidth: readerWidth }}>
              Example: El rápido zorro marrón salta sobre el perro perezoso.
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 