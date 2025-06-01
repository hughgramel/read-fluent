'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { uploadBookJson, saveBookMetadata, getBooks, getBookJson, deleteBook } from '@/services/epubService';
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
  storagePath?: string;
  downloadURL?: string;
}

interface ReadingProgress {
  bookId: string;
  currentSection: number;
  lastRead: string;
}

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [view, setView] = useState<'library' | 'reader'>('library');
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1); // Speed multiplier (1-5)
  const contentRef = useRef<HTMLDivElement>(null);
  const [dataModalBook, setDataModalBook] = useState<Book | null>(null);

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
            if (currentBook && currentSection < currentBook.sections.length - 1) {
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
  }, [isAutoScrolling, scrollSpeed, currentSection, currentBook]);

  useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = 0; }, [currentSection]);

  // Load books metadata from Firestore/Storage (not full content)
  useEffect(() => {
    if (!user?.uid) return;
    console.log('Current userId:', user.uid);
    getBooks(user.uid).then((metadatas) => {
      if (!metadatas || metadatas.length === 0) {
        setBooks([]);
        return;
      }
      // Only set metadata, not full book content
      setBooks(metadatas.map(meta => ({
        id: meta.bookId,
        title: meta.title,
        author: meta.author,
        description: '', // No description in metadata
        sections: [], // Not loaded yet
        totalWords: meta.totalWords,
        fileName: meta.fileName,
        dateAdded: meta.dateAdded,
        storagePath: meta.storagePath,
        downloadURL: meta.downloadURL,
      })));
    });
  }, [user]);

  // Save books to localStorage whenever books change
  useEffect(() => {
    localStorage.setItem('epub-reader-books', JSON.stringify(books));
  }, [books]);

  // Save reading progress whenever section changes
  useEffect(() => {
    if (currentBook && view === 'reader') {
      const progress: ReadingProgress = {
        bookId: currentBook.id,
        currentSection: currentSection,
        lastRead: new Date().toISOString()
      };
      const savedProgress = localStorage.getItem('epub-reader-progress');
      let allProgress: ReadingProgress[] = [];
      if (savedProgress) {
        allProgress = JSON.parse(savedProgress);
        allProgress = allProgress.filter(p => p.bookId !== currentBook.id);
      }
      allProgress.push(progress);
      localStorage.setItem('epub-reader-progress', JSON.stringify(allProgress));
    }
  }, [currentBook, currentSection, view]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.epub')) {
      await processEpubFile(file);
    } else {
      setError('Please select a valid EPUB file.');
    }
  };

  // Upload EPUB and store in Storage/Firestore
  const processEpubFile = async (file: File) => {
    if (!user?.uid) return;
    setIsUploading(true);
    setError('');
    try {
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(file);
      const containerFile = zip.file('META-INF/container.xml');
      if (!containerFile) throw new Error('Invalid EPUB: No container.xml found');
      const containerText = await containerFile.async('text');
      const parser = new DOMParser();
      const containerDoc = parser.parseFromString(containerText, 'text/xml');
      const opfPath = containerDoc.querySelector('rootfile')?.getAttribute('full-path');
      if (!opfPath) throw new Error('Invalid EPUB: No OPF path found');
      const opfFile = zip.file(opfPath);
      if (!opfFile) throw new Error('Invalid EPUB: OPF file not found');
      const opfText = await opfFile.async('text');
      const opfDoc = parser.parseFromString(opfText, 'text/xml');
      const title = opfDoc.querySelector('title')?.textContent || 'Unknown Title';
      const author = opfDoc.querySelector('creator')?.textContent || 'Unknown Author';
      const description = opfDoc.querySelector('description')?.textContent || 'No description available';
      const spine = Array.from(opfDoc.querySelectorAll('spine itemref')).map(item => item.getAttribute('idref')).filter(Boolean);
      const sections: BookSection[] = [];
      let totalWords = 0;
      for (const itemId of spine) {
        const manifestItem = opfDoc.querySelector(`manifest item[id="${itemId}"]`);
        if (!manifestItem) continue;
        const href = manifestItem.getAttribute('href');
        if (!href) continue;
        const fullPath = opfPath.substring(0, opfPath.lastIndexOf('/') + 1) + href;
        const sectionFile = zip.file(fullPath);
        if (sectionFile) {
          const sectionHtml = await sectionFile.async('text');
          const sectionDoc = parser.parseFromString(sectionHtml, 'text/html');
          const textContent = sectionDoc.body?.textContent || '';
          const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
          const sectionTitle = sectionDoc.querySelector('title')?.textContent || sectionDoc.querySelector('h1, h2, h3')?.textContent || `Chapter ${sections.length + 1}`;
          if (itemId) {
            sections.push({
              title: sectionTitle.trim(),
              content: textContent,
              wordCount: wordCount,
              id: itemId
            });
            totalWords += wordCount;
          }
        }
      }
      const bookId = Date.now().toString();
      const newBook: Book = {
        id: bookId,
        title,
        author,
        description,
        sections,
        totalWords,
        fileName: file.name,
        dateAdded: new Date().toISOString()
      };
      const { storagePath, downloadURL } = await uploadBookJson(user.uid, bookId, newBook);
      const savedMeta = await saveBookMetadata(user.uid, bookId, {
        title: newBook.title,
        author: newBook.author,
        fileName: newBook.fileName,
        totalWords: newBook.totalWords,
        storagePath,
        downloadURL,
        currentSection: 0, // Start at section 0
      });
      // Add the new book metadata to the shelf immediately
      setBooks(prevBooks => [
        ...prevBooks,
        {
          id: bookId,
          title: newBook.title,
          author: newBook.author,
          description: '',
          sections: [],
          totalWords: newBook.totalWords,
          fileName: newBook.fileName,
          dateAdded: newBook.dateAdded,
          storagePath,
          downloadURL,
        }
      ]);
      setIsUploading(false);
    } catch (error) {
      console.error('Error processing EPUB:', error);
      setError(`Error processing EPUB: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsUploading(false);
    }
  };

  // On 'Read', fetch book JSON if not in localStorage, then navigate
  const openBook = async (book: Book) => {
    const localKey = `epub-book-${book.id}`;
    let bookObj = null;
    const cached = localStorage.getItem(localKey);
    if (cached) {
      try {
        bookObj = JSON.parse(cached);
        console.log('Loaded book from localStorage:', localKey, bookObj);
      } catch { bookObj = null; }
    }
    if (!bookObj && book.downloadURL) {
      try {
        console.log('Fetching book from storage:', book.downloadURL);
        const fetched = await getBookJson(book.downloadURL);
        console.log('Fetched book JSON:', fetched);
        if (fetched && fetched.sections && Array.isArray(fetched.sections)) {
          bookObj = fetched;
          localStorage.setItem(localKey, JSON.stringify(bookObj));
          console.log('Saved book to localStorage:', localKey);
        } else {
          setError('Book data from storage is invalid.');
          return;
        }
      } catch (e) {
        setError('Failed to load book from storage.');
        console.error('Failed to fetch book JSON:', e);
        return;
      }
    }
    if (!bookObj) {
      setError('Book could not be loaded.');
      return;
    }
    // Check for saved progress
    const savedProgress = localStorage.getItem('epub-reader-progress');
    let startSection = 0;
    if (savedProgress) {
      const allProgress = JSON.parse(savedProgress);
      const bookProgress = allProgress.find((p: ReadingProgress) => p.bookId === book.id);
      if (bookProgress) {
        startSection = bookProgress.currentSection;
      }
    }
    router.push(`/reader?book=${book.id}&section=${startSection}`);
  };

  const deleteBookHandler = async (bookId: string, storagePath?: string) => {
    if (!user?.uid || !storagePath) return;
    // Remove from localStorage
    localStorage.removeItem(`epub-book-${bookId}`);
    // Remove reading progress for this book
    const savedProgress = localStorage.getItem('epub-reader-progress');
    if (savedProgress) {
      let allProgress: ReadingProgress[] = JSON.parse(savedProgress);
      allProgress = allProgress.filter(p => p.bookId !== bookId);
      localStorage.setItem('epub-reader-progress', JSON.stringify(allProgress));
    }
    await deleteBook(bookId, storagePath);
    // Refetch metadata and update dashboard
    getBooks(user.uid).then((metadatas) => {
      if (!metadatas || metadatas.length === 0) {
        setBooks([]);
        return;
      }
      setBooks(metadatas.map(meta => ({
        id: meta.bookId,
        title: meta.title,
        author: meta.author,
        description: '',
        sections: [],
        totalWords: meta.totalWords,
        fileName: meta.fileName,
        dateAdded: meta.dateAdded,
        storagePath: meta.storagePath,
        downloadURL: meta.downloadURL,
      })));
    });
  };

  const nextSection = (fromAutoScroll = false) => {
    if (currentBook && currentSection < currentBook.sections.length - 1) {
      const newSection = currentSection + 1;
      setCurrentSection(newSection);
      if (currentBook) {
        router.push(`/?book=${currentBook.id}&section=${newSection}`);
      }
      if (fromAutoScroll && contentRef.current) {
        setTimeout(() => { if (contentRef.current) contentRef.current.scrollTop = 0; }, 0);
      }
    }
  };

  const prevSection = () => {
    if (currentSection > 0 && currentBook) {
      const newSection = currentSection - 1;
      setCurrentSection(newSection);
      router.push(`/?book=${currentBook.id}&section=${newSection}`);
    }
  };

  const backToLibrary = () => {
    setView('library');
    setCurrentBook(null);
    router.push('/');
  };

  // Helper: Determine book status
  function getBookStatus(book: Book): 'currentlyReading' | 'notStarted' | 'completed' {
    const savedProgress = localStorage.getItem('epub-reader-progress');
    if (savedProgress) {
      const allProgress: ReadingProgress[] = JSON.parse(savedProgress);
      const bookProgress = allProgress.find((p) => p.bookId === book.id);
      if (bookProgress) {
        if (bookProgress.currentSection === 0) return 'currentlyReading';
        if (bookProgress.currentSection >= book.sections.length - 1) return 'completed';
        return 'currentlyReading';
      }
    }
    return 'notStarted';
  }

  // Group books
  const currentlyReading = books.filter((b) => getBookStatus(b) === 'currentlyReading');
  const notStarted = books.filter((b) => getBookStatus(b) === 'notStarted');
  const completed = books.filter((b) => getBookStatus(b) === 'completed');

  // Book Card
  function BookCard({ book }: { book: Book }) {
    return (
      <div className="bg-white rounded-xl border-2 border-gray-300 shadow-[0_4px_0px_#d1d5db] hover:shadow-[0_8px_0px_#d1d5db] transition-shadow flex flex-col [font-family:var(--font-mplus-rounded)] w-full max-w-sm mx-auto aspect-[1/0.7]">
        <div className="p-2 flex-1 flex flex-col justify-between gap-0.5">
          <button
            onClick={() => deleteBookHandler(book.id, book.storagePath)}
            className="text-gray-400 hover:text-red-500 text-lg self-end mb-0"
          >
            ×
          </button>
          <h3 className="font-bold text-[#0B1423] mb-0.5 line-clamp-2 text-base text-center">{book.title}</h3>
          <p className="text-gray-600 text-xs mb-0.5 text-center">{book.author} | {book.totalWords.toLocaleString()} words</p>
          {/* Dummy data row */}
          <div className="flex justify-center gap-1 mb-1 text-xs font-semibold">
            <span className="text-green-600">94.6% Known</span>
            <span className="text-purple-500">3.5% Tracking</span>
            <span className="text-red-500">1.8% Unknown</span>
          </div>
          <div className="flex gap-4 mt-0 px-2 pb-4">
            <button
              onClick={() => openBook(book)}
              className="flex-1 inline-flex items-center justify-center rounded-lg bg-green-500 px-0 py-2 text-base font-semibold text-white border-2 border-green-700 shadow-[0_4px_0_#166534] hover:bg-green-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_0_#166534] transition-all min-w-0"
            >
              Read
            </button>
            <button
              onClick={() => setDataModalBook(book)}
              className="flex-1 inline-flex items-center justify-center rounded-lg bg-white px-0 py-2 text-base font-semibold text-[#0B1423] border-2 border-gray-300 shadow-[0_4px_0px_#d1d5db] hover:bg-gray-50 active:translate-y-[1px] active:shadow-[0_2px_0px_#d1d5db] transition-all min-w-0"
            >
              Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Modal for Data
  function DataModal() {
    if (!dataModalBook) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm">
        <div className="bg-white rounded-lg p-8 border-2 border-gray-300 shadow-[0_8px_0px_#d1d5db] max-w-md w-full relative [font-family:var(--font-mplus-rounded)]">
          <button
            onClick={() => setDataModalBook(null)}
            className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-2xl"
          >
            ×
          </button>
          <h2 className="text-2xl font-bold mb-4 text-[#0B1423]">Book Data</h2>
          <div className="text-gray-700 text-base space-y-2">
            <div><b>Title:</b> {dataModalBook.title}</div>
            <div><b>Author:</b> {dataModalBook.author}</div>
            <div><b>File:</b> {dataModalBook.fileName}</div>
            <div><b>Date Added:</b> {new Date(dataModalBook.dateAdded).toLocaleString()}</div>
            {/* Add more analytics here later */}
          </div>
        </div>
      </div>
    );
  }

  // --- Render ---
  if (view === 'reader' && currentBook) {
    // For now, just show a placeholder for the reader content
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <div className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
            <button
              onClick={backToLibrary}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors text-base font-semibold px-4 py-2 rounded-lg bg-gray-100 hover:bg-blue-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Library
            </button>
            <div className="text-center">
              <h1 className="font-semibold text-gray-900 text-lg">{currentBook.title}</h1>
              <p className="text-sm text-gray-500">{currentBook.author}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
                <button
                  onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                  className={`p-2 rounded-lg transition-all duration-200 ${isAutoScrolling ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'}`}
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
                </button>
                {isAutoScrolling && (
                  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-1 shadow-sm">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={scrollSpeed}
                      onChange={(e) => setScrollSpeed(Number(e.target.value))}
                      className="w-24 accent-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-600 min-w-[2rem] text-center">
                      {scrollSpeed}x
                    </span>
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {currentSection + 1} / {currentBook.sections.length}
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="bg-white rounded-lg shadow-sm p-12 mb-6" style={{ fontFamily: 'var(--font-mplus-rounded)', fontSize: '1.1rem', maxWidth: '700px', margin: '0 auto' }}>
            <h2 className="text-3xl font-bold mb-8 text-gray-900">{currentBook.sections[currentSection].title}</h2>
            <div
              ref={contentRef}
              className="prose prose-lg max-w-none text-gray-800 leading-relaxed h-[calc(100vh-400px)] overflow-y-auto scroll-smooth"
              style={{ scrollBehavior: 'smooth' }}
            >
              {currentBook.sections[currentSection].content.split('\n\n').map((paragraph, index) => (
                <p key={index} className="mb-6 text-lg">
                  {paragraph}
                </p>
              ))}
              <div style={{ height: '200px' }} />
            </div>
          </div>
          <div className="flex justify-between items-center bg-white rounded-lg shadow-sm p-4">
            <button
              onClick={() => prevSection()}
              disabled={currentSection === 0}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            <div className="text-center">
              <span className="text-gray-600 font-medium">
                Chapter {currentSection + 1} of {currentBook.sections.length}
              </span>
              <div className="text-sm text-gray-500 mt-1">
                {currentBook.sections[currentSection].title}
              </div>
            </div>
            <button
              onClick={() => nextSection()}
              disabled={currentSection === (currentBook.sections.length || 0) - 1}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
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

  // Library view
  return (
    <div className="min-h-screen bg-gray-50 [font-family:var(--font-mplus-rounded)]">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#0B1423] flex items-center gap-[0.2]">📚 My Library</h1>
          <button
            className="px-4 py-2 bg-[#67b9e7] text-white rounded-lg hover:bg-[#4792ba] transition-colors text-base font-semibold shadow-[0_4px_0_#4792ba] border-2 border-[#4792ba]"
            disabled={isUploading}
            onClick={() => document.getElementById('epub-upload-input')?.click()}
          >
            {isUploading ? 'Uploading...' : 'Upload EPUB'}
          </button>
          <input
            id="epub-upload-input"
            type="file"
            accept=".epub"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
        </div>
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        {/* Currently Reading */}
        <SectionRow title="Currently Reading" books={currentlyReading} />
        {/* Not Started */}
        <SectionRow title="Not Started" books={notStarted} />
        {/* Completed */}
        <SectionRow title="Completed" books={completed} />
        <DataModal />
      </div>
    </div>
  );

  // SectionRow component
  function SectionRow({ title, books }: { title: string; books: Book[] }) {
    return (
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-[#0B1423] mb-4 [font-family:var(--font-mplus-rounded)] underline underline-offset-4">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[180px]">
          {books.length > 0 ? books.map((book) => (
            <BookCard key={book.id} book={book} />
          )) : (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex items-center justify-center text-gray-300 italic h-32 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
              No books in this shelf yet.
            </div>
          )}
        </div>
      </div>
    );
  }
}
