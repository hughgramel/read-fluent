'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBooks, getBookJson, updateBookMetadata } from '@/services/epubService';
import { useAuth } from '@/hooks/useAuth';

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

  const section = book.sections[currentSection];

  return (
    <div className="min-h-screen bg-gray-50 [font-family:var(--font-mplus-rounded)]">
      <div className="bg-white border-b-2 border-gray-300 shadow-[0_6px_0px_#d1d5db] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={backToLibrary}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-base font-semibold text-[#0B1423] border-2 border-[#d1d5db] shadow-[0_4px_0px_#d1d5db] hover:bg-gray-50 active:translate-y-[1px] active:shadow-[0_2px_0px_#d1d5db] transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Library
          </button>
          <div className="text-center flex-1">
            <h1 className="font-semibold text-[#0B1423] text-lg">{book.title}</h1>
            <p className="text-sm text-gray-500">{book.author}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAutoScrolling(!isAutoScrolling)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-base font-semibold border-2 border-green-700 bg-green-500 text-white shadow-[0_4px_0_#166534] hover:bg-green-600 transition-all ${isAutoScrolling ? 'opacity-80' : ''}`}
              title={isAutoScrolling ? 'Pause auto-scroll' : 'Start auto-scroll'}
            >
              {isAutoScrolling ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {/* {isAutoScrolling ? 'Pause Auto-Scroll' : 'Start Auto-Scroll'} */}
            </button>
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
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-lg border-2 border-[#d1d5db] shadow-[0_6px_0px_#d1d5db] p-12 mb-12" style={{ fontFamily: 'var(--font-mplus-rounded)', fontSize: '1.1rem', maxWidth: '900px', margin: '0 auto' }}>
          <h2 className="text-3xl font-bold mb-8 text-[#0B1423]">{section.title}</h2>
          <div
            ref={contentRef}
            className="prose prose-lg max-w-none text-gray-800 leading-relaxed h-[calc(100vh-400px)] overflow-y-auto scroll-smooth"
            style={{ scrollBehavior: 'smooth' }}
          >
            {section.content.split('\n\n').map((paragraph, index) => (
              <p key={index} className="mb-6 text-lg">
                {paragraph}
              </p>
            ))}
            <div style={{ height: '200px' }} />
          </div>
        </div>
        <div className="flex justify-between items-center bg-white rounded-lg border-2 border-[#d1d5db] shadow-[0_4px_0px_#d1d5db] p-4">
          <button
            onClick={() => prevSection()}
            disabled={currentSection === 0}
            className="flex items-center gap-2 px-6 py-2 rounded-lg font-semibold border-2 border-[#4792ba] bg-[#67b9e7] text-white shadow-[0_4px_0_#4792ba] hover:bg-[#4792ba] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_0_#4792ba]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>
          <div className="text-center">
            <span className="text-gray-600 font-medium">
              Chapter {currentSection + 1} of {book.sections.length}
            </span>
            <div className="text-sm text-gray-500 mt-1">
              {book.sections[currentSection].title}
            </div>
          </div>
          <button
            onClick={() => nextSection()}
            disabled={currentSection === (book.sections.length || 0) - 1}
            className="flex items-center gap-2 px-6 py-2 rounded-lg font-semibold border-2 border-[#4792ba] bg-[#67b9e7] text-white shadow-[0_4px_0_#4792ba] hover:bg-[#4792ba] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_0_#4792ba]"
          >
            Next
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
} 