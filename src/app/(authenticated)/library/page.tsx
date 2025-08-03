'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { uploadBookJson, saveBookMetadata, getBooks, getBookJson, deleteBook, updateBookMetadata, archiveBook, getArchivedBooks, deleteArchivedBook, ArchivedBookMetadata } from '@/services/epubService';
import { ContentGenerationService, GenerateContentParams } from '@/services/contentGenerationService';
import { useAuth } from '@/hooks/useAuth';
import { UserService } from '@/services/userService';
import { FiTrash2, FiBarChart2, FiCheckCircle, FiPlus, FiArchive } from 'react-icons/fi';
import { uploadFileAndGetUrl } from '@/lib/firebase';
import '@fontsource/inter';
import { ReadingSessionService, ReadingSession } from '@/services/readingSessionService';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { WordService } from '@/services/wordService';
import { cleanWord } from '@/components/reader/ReaderUtils';
import BookCard from './BookCard';

// Types
interface BookSection {
  title: string;
  content: string;
  wordCount: number;
  id: string;
}

export interface Book {
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
  completed?: boolean;
  css: string;
  cover: string;
  wordsRead?: number;
  wordsPerPage?: number; // Words per page for pagination (250-500, default 250)
}

interface ReadingProgress {
  bookId: string;
  currentSection: number;
  lastRead: string;
}

// Minimal type for archived book cards
export interface ArchivedBookCard {
  id: string;
  title: string;
  author: string;
  totalWords: number;
  dateStarted: string;
  dateEnded: string;
  completed: boolean;
  wordsRead: number;
}

export default function library() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user } = useAuth();
  const [theme, setTheme] = useState('light'); // Add theme state
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
  // Sidebar width constants (should match Sidebar.tsx)
  const SIDEBAR_COLLAPSED_WIDTH = 80;
  const SIDEBAR_EXPANDED_WIDTH = 240;
  // Track sidebar state for margin adjustment
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [bookWordsRead, setBookWordsRead] = useState<{ [key: string]: number }>({});
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [dailyGoal, setDailyGoal] = useState(1500);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState<string>('1500');
  const [showTextModal, setShowTextModal] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [textAuthor, setTextAuthor] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textError, setTextError] = useState('');
  const [textLoading, setTextLoading] = useState(false);
  const [textFile, setTextFile] = useState<File | null>(null);
  const [epubFile, setEpubFile] = useState<File | null>(null);
  const [epubMetadata, setEpubMetadata] = useState<{ title: string; author: string } | null>(null);
  const [mdFile, setMdFile] = useState<File | null>(null);
  const [mdError, setMdError] = useState('');
  const [mdLoading, setMdLoading] = useState(false);
  const [archivedBooks, setArchivedBooks] = useState<ArchivedBookCard[]>([]);
  const [batchMdLoading, setBatchMdLoading] = useState(false);
  const [batchMdError, setBatchMdError] = useState('');
  // Add state for comprehension reports
  const [comprehensionReports, setComprehensionReports] = useState<{ [bookId: string]: any }>({});
  const [comprehensionModalBook, setComprehensionModalBook] = useState<Book | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  // Add state for userWords
  const [userWords, setUserWords] = useState<{ [word: string]: 'known' | 'tracking' | 'ignored' | 'unknown' }>({});
  // Add state for modal tabs
  const [modalTab, setModalTab] = useState<'add-text' | 'generate'>('add-text');
  
  // Add state for generate options
  const [generateLanguage, setGenerateLanguage] = useState('es');
  const [generateGenre, setGenerateGenre] = useState('story');
  const [generateTopic, setGenerateTopic] = useState('');
  const [generateDifficulty, setGenerateDifficulty] = useState('beginner');
  const [generateDelfLevel, setGenerateDelfLevel] = useState('a1');
  const [generateLength, setGenerateLength] = useState(1000);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);
  
  // Add state for target languages
  const [targetLanguages, setTargetLanguages] = useState<{ code: string; name: string }[]>([]);
  
  // Add state for words per page setting
  const [wordsPerPage, setWordsPerPage] = useState(250);
  
  // Add state for processing popup
  const [showProcessingPopup, setShowProcessingPopup] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'processing' | 'complete'>('processing');

  // Loading states
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingUserWords, setIsLoadingUserWords] = useState(false);
  const [isLoadingArchivedBooks, setIsLoadingArchivedBooks] = useState(false);
  const [isLoadingComprehensionReports, setIsLoadingComprehensionReports] = useState(false);
  const [isLoadingDailyGoal, setIsLoadingDailyGoal] = useState(false);
  const [isLoadingTargetLanguages, setIsLoadingTargetLanguages] = useState(false);
  const [navigatingBookId, setNavigatingBookId] = useState<string | null>(null);

  // Memoized helper functions
  const getBookStatus = useCallback((book: Book): 'active' | 'notStarted' | 'completed' => {
    if (book.completed) return 'completed';
    const savedProgress = localStorage.getItem('epub-reader-progress');
    if (savedProgress) {
      const allProgress: ReadingProgress[] = JSON.parse(savedProgress);
      const bookProgress = allProgress.find((p) => p.bookId === book.id);
      if (bookProgress) {
        return 'active';
      }
    }
    return 'notStarted';
  }, []);

  const isSameLocalDay = useCallback((dateA: Date, dateB: Date) => {
    return (
      dateA.getFullYear() === dateB.getFullYear() &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getDate() === dateB.getDate()
    );
  }, []);

  // Memoized book groupings
  const { activeBooks, notStarted, completed, toReadBooks, currentlyReadingBooks } = useMemo(() => {
    const active = books.filter((b) => b.wordsRead && b.wordsRead > 0 && !b.completed);
    const notStartedBooks = books.filter((b) => b.wordsRead === 0);
    const completedBooks = books.filter((b) => getBookStatus(b) === 'completed');
    const toRead = books.filter(book => !book.wordsRead || book.wordsRead === 0);
    const currentlyReading = books.filter(book => book.wordsRead && book.wordsRead > 0 && !book.completed);
    
    return {
      activeBooks: active,
      notStarted: notStartedBooks,
      completed: completedBooks,
      toReadBooks: toRead,
      currentlyReadingBooks: currentlyReading
    };
  }, [books, getBookStatus]);

  // Memoized today's sessions calculation
  const { sessionsToday, wordsReadToday } = useMemo(() => {
    const today = new Date();
    const todaySessions = sessions
      ? sessions.filter((s) => {
          if (!s.timestamp) return false;
          let sessionDate: Date;
          if (typeof s.timestamp === 'string') {
            sessionDate = new Date(s.timestamp);
          } else if (s.timestamp instanceof Date) {
            sessionDate = s.timestamp;
          } else if (typeof s.timestamp === 'object' && s.timestamp !== null && typeof (s.timestamp as any).toDate === 'function') {
            sessionDate = (s.timestamp as any).toDate();
          } else {
            return false;
          }
          return isSameLocalDay(sessionDate, today);
        })
      : [];
    
    const wordsToday = todaySessions.reduce((sum, s) => sum + (s.wordCount || 0), 0);
    
    return {
      sessionsToday: todaySessions,
      wordsReadToday: wordsToday
    };
  }, [sessions, isSameLocalDay]);

  // Memoized fetch comprehension report function
  const fetchComprehensionReport = useCallback(async (bookId: string) => {
    if (!user?.uid) return;
    const reportRef = doc(collection(db, 'users', user.uid, 'comprehensionReports'), bookId);
    const reportSnap = await getDoc(reportRef);
    if (reportSnap.exists()) {
      setComprehensionReports(prev => ({ ...prev, [bookId]: reportSnap.data() }));
    }
  }, [user?.uid]);

  // Memoized fetch all comprehension reports
  const fetchAllComprehensionReports = useCallback(async () => {
    if (!user?.uid || books.length === 0) return;
    setIsLoadingComprehensionReports(true);
    try {
      const promises = books.map(book => fetchComprehensionReport(book.id));
      await Promise.all(promises);
    } finally {
      setIsLoadingComprehensionReports(false);
    }
  }, [user?.uid, books.length, fetchComprehensionReport]);

  // Check if all data is loaded
  const isDataLoaded = useMemo(() => {
    return !isLoadingBooks && !isLoadingSessions && !isLoadingUserWords && 
           !isLoadingArchivedBooks && !isLoadingComprehensionReports && 
           !isLoadingDailyGoal && !isLoadingTargetLanguages;
  }, [
    isLoadingBooks, isLoadingSessions, isLoadingUserWords, 
    isLoadingArchivedBooks, isLoadingComprehensionReports, 
    isLoadingDailyGoal, isLoadingTargetLanguages
  ]);

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

  useEffect(() => { 
    // Only scroll to top when in reader view, not when navigating to reader page
    if (contentRef.current && view === 'reader') {
      contentRef.current.scrollTop = 0;
    }
  }, [currentSection, view]);

  // Load target languages
  useEffect(() => {
    setIsLoadingTargetLanguages(true);
    fetch('/target-languages.json')
      .then(res => res.json())
      .then(setTargetLanguages)
      .catch(() => setTargetLanguages([]))
      .finally(() => setIsLoadingTargetLanguages(false));
  }, []);

  // Load books metadata from Firestore/Storage (not full content)
  useEffect(() => {
    if (!user?.uid) return;
    setIsLoadingBooks(true);
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
        completed: meta.completed || false,
        css: '', // No CSS in metadata
        cover: '', // No cover in metadata
        wordsRead: meta.wordsRead || 0, // Always include wordsRead
        wordsPerPage: wordsPerPage, // Use user-selected words per page
      })));
    }).finally(() => setIsLoadingBooks(false));
  }, [user, wordsPerPage]);

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

  // Listen for sidebar hover/pin events (using a custom event for demo)
  useEffect(() => {
    function handleSidebarEvent(e: any) {
      if (e.detail && typeof e.detail.expanded === 'boolean') {
        setSidebarExpanded(e.detail.expanded);
      }
    }
    window.addEventListener('sidebar-toggle', handleSidebarEvent);
    return () => window.removeEventListener('sidebar-toggle', handleSidebarEvent);
  }, []);

  // On mount, fetch reading sessions and compute words read per book
  useEffect(() => {
    if (!user?.uid) return;
    setIsLoadingSessions(true);
    ReadingSessionService.getUserSessions(user.uid).then(sessions => {
      const wordsRead: { [key: string]: number } = {};
      sessions.forEach(session => {
        wordsRead[String(session.bookId)] = (wordsRead[String(session.bookId)] || 0) + session.wordCount;
      });
      setBookWordsRead(wordsRead);
      setSessions(sessions);
    }).finally(() => setIsLoadingSessions(false));
  }, [user]);

  // On mount, load daily goal from Firebase
  useEffect(() => {
    if (!user?.uid) return;
    setIsLoadingDailyGoal(true);
    UserService.getDailyGoal(user.uid).then(goal => {
      setDailyGoal(goal);
      setGoalInput(String(goal));
    }).catch(err => {
      console.error('Failed to load daily goal:', err);
      // Fallback to default
      setDailyGoal(1500);
      setGoalInput('1500');
    }).finally(() => setIsLoadingDailyGoal(false));
  }, [user]);

  // Fetch archived books on mount
  useEffect(() => {
    if (!user?.uid) return;
    setIsLoadingArchivedBooks(true);
    getArchivedBooks(user.uid).then((archs: ArchivedBookMetadata[]) => {
      setArchivedBooks(archs.map(a => ({
        id: a.id || a.bookId,
        title: a.title,
        author: a.author,
        totalWords: a.totalWords,
        dateStarted: a.dateStarted,
        dateEnded: a.dateEnded,
        completed: a.completed,
        wordsRead: a.wordsRead,
      })));
    }).finally(() => setIsLoadingArchivedBooks(false));
  }, [user]);

  // Load user words on mount
  useEffect(() => {
    if (!user?.uid) return;
    setIsLoadingUserWords(true);
    WordService.getWords(user.uid).then(ws => {
      const map: { [word: string]: 'known' | 'tracking' | 'ignored' | 'unknown' } = {};
      ws.forEach(w => { map[cleanWord(w.word)] = w.type; });
      setUserWords(map);
    }).finally(() => setIsLoadingUserWords(false));
  }, [user]);

  // Fetch all comprehension reports for all books on mount
  useEffect(() => {
    fetchAllComprehensionReports();
  }, [fetchAllComprehensionReports]);

  // Add handler for text book creation
  const handleCreateTextBook = async () => {
    setTextError('');
    
    // Check if we have an EPUB file selected
    if (epubFile) {
      if (!textTitle.trim()) {
        setTextError('Please enter a title.');
        return;
      }
      if (!user?.uid) {
        setTextError('You must be signed in.');
        return;
      }
      setTextLoading(true);
      setShowTextModal(false); // Close the modal
      setShowProcessingPopup(true); // Show processing popup
      setProcessingStatus('processing');
      try {
        // Process the EPUB file
        await processEpubFile(epubFile);
        setProcessingStatus('complete');
        setTimeout(() => {
          setShowProcessingPopup(false);
        }, 2000); // Show "Complete!" for 2 seconds
        setTextLoading(false);
        return;
      } catch (error) {
        setTextError('Failed to process EPUB file.');
        setShowProcessingPopup(false);
        setTextLoading(false);
        return;
      }
    }
    
    // Handle text content
    if (!textTitle.trim() || !textContent.trim()) {
      setTextError('Please fill in all fields.');
      return;
    }
    // If author is empty, use 'N/A'
    const authorValue = textAuthor.trim() ? textAuthor.trim() : 'N/A';
    if (!user?.uid) {
      setTextError('You must be signed in.');
      return;
    }
    setTextLoading(true);
    try {
      // Split textContent into sections at each line starting with '## '
      const lines = textContent.split(/\r?\n/);
      let sections: { title: string; content: string; wordCount: number; id: string }[] = [];
      let currentSectionTitle = textTitle.trim();
      let currentSectionContent: string[] = [];
      let sectionCount = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('## ')) {
          // Save previous section
          if (currentSectionContent.length > 0 || sectionCount === 0) {
            sections.push({
              title: currentSectionTitle,
              content: currentSectionContent.join('\n').trim(),
              wordCount: currentSectionContent.join(' ').split(/\s+/).filter(Boolean).length,
              id: (sectionCount + 1).toString(),
            });
            sectionCount++;
          }
          currentSectionTitle = line.replace(/^## /, '').trim();
          currentSectionContent = [];
        } else {
          currentSectionContent.push(line);
        }
      }
      // Push last section
      if (currentSectionContent.length > 0 || sectionCount === 0) {
        sections.push({
          title: currentSectionTitle,
          content: currentSectionContent.join('\n').trim(),
          wordCount: currentSectionContent.join(' ').split(/\s+/).filter(Boolean).length,
          id: (sectionCount + 1).toString(),
        });
      }
      if (sections.length === 0) {
        setTextError('No sections found in text.');
        setTextLoading(false);
        return;
      }
      // Create a Book object
      const bookId = Date.now().toString();
      const newBook = {
        id: bookId,
        title: textTitle.trim(),
        author: authorValue,
        description: '',
        sections,
        totalWords: sections.reduce((sum, s) => sum + s.wordCount, 0),
        fileName: `${textTitle.trim().replace(/\s+/g, '_')}.txt`,
        dateAdded: new Date().toISOString(),
        css: '',
        cover: '',
        wordsRead: 0,
        wordsPerPage: wordsPerPage, // Use user-selected words per page
      };
      // Upload JSON to storage
      const { storagePath, downloadURL } = await uploadBookJson(user.uid, bookId, newBook as any);
      // Save metadata
      await saveBookMetadata(user.uid, bookId, {
        title: newBook.title,
        author: newBook.author,
        fileName: newBook.fileName,
        totalWords: newBook.totalWords,
        storagePath,
        downloadURL,
        currentSection: 0,
        wordsRead: newBook.wordsRead || 0,
      });
      // Add to local state
      setBooks(prevBooks => [
        ...prevBooks,
        {
          ...newBook,
          storagePath,
          downloadURL,
          completed: false,
          wordsRead: 0,
        }
      ]);
      setShowTextModal(false);
      setTextTitle('');
      setTextAuthor('');
      setTextContent('');
      setEpubFile(null);
      setEpubMetadata(null);
    } catch (err) {
      setTextError('Failed to create book.');
    } finally {
      setTextLoading(false);
    }
  };

  // Add handler for .txt file upload in the popup
  const handleTextFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.txt')) {
      setTextFile(file);
      setEpubFile(null); // Clear EPUB file when text file is selected
      setEpubMetadata(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        setTextContent(e.target?.result as string || '');
      };
      reader.readAsText(file);
    } else {
      setTextError('Please select a valid .txt file.');
    }
  };

  // Handler for .md file upload and parsing
  const handleMdFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setMdError('');
    const file = event.target.files?.[0];
    if (!file || !file.name.endsWith('.md')) {
      setMdError('Please select a valid .md file.');
      return;
    }
    if (!user?.uid) {
      setMdError('You must be signed in.');
      return;
    }
    setMdFile(file);
    setEpubFile(null); // Clear EPUB file when MD file is selected
    setEpubMetadata(null);
    setMdLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string || '';
        // Parse Markdown
        const cleanText = text.replace(/&ZeroWidthSpace;|\u200B|&#8203;/g, ' ');
        const lines = cleanText.split(/\r?\n/);
        let bookTitle = '';
        let sections: { title: string; content: string; wordCount: number; id: string }[] = [];
        let currentSectionTitle = '';
        let currentSectionContent: string[] = [];
        let foundH1 = false;
        let sectionCount = 0;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!foundH1 && line.trim().startsWith('# ')) {
            bookTitle = line.replace(/^# /, '').trim();
            currentSectionTitle = bookTitle;
            foundH1 = true;
            continue;
          }
          if (foundH1 && line.trim().startsWith('## ')) {
            // Save previous section
            if (currentSectionContent.length > 0 || sectionCount === 0) {
              sections.push({
                title: currentSectionTitle,
                content: currentSectionContent.join('\n').trim(),
                wordCount: currentSectionContent.join(' ').split(/\s+/).filter(Boolean).length,
                id: (sectionCount + 1).toString(),
              });
              sectionCount++;
            }
            currentSectionTitle = line.replace(/^## /, '').trim();
            currentSectionContent = [];
          } else if (foundH1) {
            currentSectionContent.push(line);
          }
        }
        // Push last section
        if (foundH1 && (currentSectionContent.length > 0 || sectionCount === 0)) {
          sections.push({
            title: currentSectionTitle,
            content: currentSectionContent.join('\n').trim(),
            wordCount: currentSectionContent.join(' ').split(/\s+/).filter(Boolean).length,
            id: (sectionCount + 1).toString(),
          });
        }
        if (!foundH1) {
          setMdError('Markdown file must start with a # Title.');
          setMdLoading(false);
          return;
        }
        if (sections.length === 0) {
          setMdError('No sections found in Markdown.');
          setMdLoading(false);
          return;
        }
        // Create Book object
        const bookId = Date.now().toString();
        const newBook = {
          id: bookId,
          title: bookTitle,
          author: textAuthor.trim() || 'Unknown Author',
          description: '',
          sections,
          totalWords: sections.reduce((sum, s) => sum + s.wordCount, 0),
          fileName: `${bookTitle.replace(/\s+/g, '_')}.md`,
          dateAdded: new Date().toISOString(),
          css: '',
          cover: '',
          wordsRead: 0,
          wordsPerPage: wordsPerPage, // Use user-selected words per page
        };
        // Upload JSON to storage
        const { storagePath, downloadURL } = await uploadBookJson(user.uid, bookId, newBook as any);
        // Save metadata
        await saveBookMetadata(user.uid, bookId, {
          title: newBook.title,
          author: newBook.author,
          fileName: newBook.fileName,
          totalWords: newBook.totalWords,
          storagePath,
          downloadURL,
          currentSection: 0,
          wordsRead: newBook.wordsRead || 0,
        });
        // Add to local state
        setBooks(prevBooks => [
          ...prevBooks,
          {
            ...newBook,
            storagePath,
            downloadURL,
            completed: false,
            wordsRead: 0,
          }
        ]);
        setShowTextModal(false);
        setMdFile(null);
        setMdError('');
        setTextTitle('');
        setTextAuthor('');
        setTextContent('');
      };
      reader.readAsText(file);
    } catch (err) {
      setMdError('Failed to process .md file.');
    } finally {
      setMdLoading(false);
    }
  };

  // Handler for batch .md file upload
  const handleBatchMdFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setBatchMdError('');
    const files = event.target.files;
    if (!files || files.length === 0) return;
    if (files.length > 5) {
      setBatchMdError('You can upload a maximum of 5 files at once.');
      return;
    }
    if (!user?.uid) {
      setBatchMdError('You must be signed in.');
      return;
    }
    setBatchMdLoading(true);
    let uploaded = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.endsWith('.md')) continue;
      try {
        const text = await file.text();
        // Parse Markdown (reuse logic from handleMdFileSelect)
        const cleanText = text.replace(/&ZeroWidthSpace;|\u200B|&#8203;/g, ' ');
        const lines = cleanText.split(/\r?\n/);
        let bookTitle = '';
        let sections: { title: string; content: string; wordCount: number; id: string }[] = [];
        let currentSectionTitle = '';
        let currentSectionContent: string[] = [];
        let foundH1 = false;
        let sectionCount = 0;
        for (let j = 0; j < lines.length; j++) {
          const line = lines[j];
          if (!foundH1 && line.trim().startsWith('# ')) {
            bookTitle = line.replace(/^# /, '').trim();
            currentSectionTitle = bookTitle;
            foundH1 = true;
            continue;
          }
          if (foundH1 && line.trim().startsWith('## ')) {
            if (currentSectionContent.length > 0 || sectionCount === 0) {
              sections.push({
                title: currentSectionTitle,
                content: currentSectionContent.join('\n').trim(),
                wordCount: currentSectionContent.join(' ').split(/\s+/).filter(Boolean).length,
                id: (sectionCount + 1).toString(),
              });
              sectionCount++;
            }
            currentSectionTitle = line.replace(/^## /, '').trim();
            currentSectionContent = [];
          } else if (foundH1) {
            currentSectionContent.push(line);
          }
        }
        if (foundH1 && (currentSectionContent.length > 0 || sectionCount === 0)) {
          sections.push({
            title: currentSectionTitle,
            content: currentSectionContent.join('\n').trim(),
            wordCount: currentSectionContent.join(' ').split(/\s+/).filter(Boolean).length,
            id: (sectionCount + 1).toString(),
          });
        }
        if (!foundH1 || sections.length === 0) {
          continue;
        }
        // Create Book object
        const bookId = Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8);
        const newBook = {
          id: bookId,
          title: bookTitle,
          author: textAuthor.trim() || 'Unknown Author',
          description: '',
          sections,
          totalWords: sections.reduce((sum, s) => sum + s.wordCount, 0),
          fileName: `${bookTitle.replace(/\s+/g, '_')}.md`,
          dateAdded: new Date().toISOString(),
          css: '',
          cover: '',
          wordsRead: 0,
          wordsPerPage: wordsPerPage, // Use user-selected words per page
        };
        // Upload JSON to storage
        const { storagePath, downloadURL } = await uploadBookJson(user.uid, bookId, newBook as any);
        // Save metadata
        await saveBookMetadata(user.uid, bookId, {
          title: newBook.title,
          author: newBook.author,
          fileName: newBook.fileName,
          totalWords: newBook.totalWords,
          storagePath,
          downloadURL,
          currentSection: 0,
          wordsRead: newBook.wordsRead || 0,
        });
        uploaded++;
      } catch (err) {
        // skip file on error
        continue;
      }
    }
    setBatchMdLoading(false);
    if (uploaded > 0) {
      // Refetch books
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
          completed: meta.completed || false,
          css: '',
          cover: '', // No cover in metadata
          wordsRead: 0,
          wordsPerPage: wordsPerPage, // Use user-selected words per page
        })));
      });
    }
    (event.target as HTMLInputElement).value = '';
  };

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showTextModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showTextModal]);

  // Close modal on Escape key
  useEffect(() => {
    if (!showTextModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowTextModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTextModal]);

  // Archive handler
  const archiveBookHandler = async (book: Book): Promise<void> => {
    if (!user?.uid) return;
    // Calculate words read
    const wordsRead = sessions.filter(s => s.bookId === book.id).reduce((sum, s) => sum + s.wordCount, 0);
    // Date ended: now
    const dateEnded = new Date().toISOString();
    // Archive
    await archiveBook(user.uid, book.id, {
      title: book.title,
      author: book.author,
      totalWords: book.totalWords,
      dateStarted: book.dateAdded,
      dateEnded,
      completed: !!book.completed,
      wordsRead,
    });
    // Remove from localStorage
    localStorage.removeItem(`epub-book-${book.id}`);
    // Remove reading progress for this book
    const savedProgress = localStorage.getItem('epub-reader-progress');
    if (savedProgress) {
      let allProgress: ReadingProgress[] = JSON.parse(savedProgress);
      allProgress = allProgress.filter((p: ReadingProgress) => p.bookId !== book.id);
      localStorage.setItem('epub-reader-progress', JSON.stringify(allProgress));
    }
    // Delete book
    if (book.storagePath) await deleteBook(book.id, book.storagePath);
    // Update state
    setBooks(prev => prev.filter(b => b.id !== book.id));
    // Refetch archived
    getArchivedBooks(user.uid).then((archs: ArchivedBookMetadata[]) => {
      setArchivedBooks(archs.map(a => ({
        id: a.id || a.bookId,
        title: a.title,
        author: a.author,
        totalWords: a.totalWords,
        dateStarted: a.dateStarted,
        dateEnded: a.dateEnded,
        completed: a.completed,
        wordsRead: a.wordsRead,
      })));
    });
  };

  // Delete archived book handler
  const deleteArchivedBookHandler = async (archivedId: string): Promise<void> => {
    await deleteArchivedBook(archivedId);
    setArchivedBooks(prev => prev.filter(b => b.id !== archivedId));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.epub')) {
      await extractEpubMetadata(file);
    } else {
      setError('Please select a valid EPUB file.');
    }
  };

  // Extract EPUB metadata without processing the full file
  const extractEpubMetadata = async (file: File) => {
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
      
      setEpubFile(file);
      setEpubMetadata({ title, author });
      setTextTitle(title);
      setTextAuthor(author);
      setTextFile(null); // Clear text file when EPUB is selected
      setMdFile(null); // Clear MD file when EPUB is selected
    } catch (error) {
      console.error('Error extracting EPUB metadata:', error);
      setError(`Error reading EPUB file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Helper to normalize paths like OEBPS/Text/../Images/T_Page_027.jpg => OEBPS/Images/T_Page_027.jpg
  function normalizePath(path: string): string {
    const parts: string[] = [];
    path.split('/').forEach(part => {
      if (part === '..') {
        parts.pop();
      } else if (part !== '.' && part !== '') {
        parts.push(part);
      }
    });
    return parts.join('/');
  }

  // Helper to safely get innerText
  function getInnerText(el: Element | null): string {
    return (el && 'innerText' in el) ? (el as HTMLElement).innerText : '';
  }

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
      // Use title and author from form instead of EPUB metadata
      const title = textTitle.trim() || opfDoc.querySelector('title')?.textContent || 'Unknown Title';
      const author = textAuthor.trim() || opfDoc.querySelector('creator')?.textContent || 'Unknown Author';
      const description = opfDoc.querySelector('description')?.textContent || 'No description available';
      const spine = Array.from(opfDoc.querySelectorAll('spine itemref')).map(item => item.getAttribute('idref')).filter(Boolean);
      const sections: BookSection[] = [];
      let totalWords = 0;
      const bookId = Date.now().toString();
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
          // --- Image handling ---
          const imgElements = sectionDoc.querySelectorAll('img');
          for (const img of imgElements) {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('data:') && !src.startsWith('http')) {
              // Resolve relative path
              let imgPath = src;
              if (!/^https?:\/\//.test(src)) {
                // Relative to section file
                const basePath = fullPath.substring(0, fullPath.lastIndexOf('/') + 1);
                imgPath = basePath + src;
              }
              const normalizedImgPath = normalizePath(imgPath);
              const imgFile = zip.file(normalizedImgPath);
              if (imgFile) {
                const ext = normalizedImgPath.split('.').pop()?.toLowerCase() || 'png';
                const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : ext === 'gif' ? 'image/gif' : 'image/png';
                const imgData = await imgFile.async('uint8array');
                const firebasePath = `books/${bookId}/images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                const url = await uploadFileAndGetUrl(firebasePath, new Blob([imgData], { type: mime }));
                img.setAttribute('src', url);
              } else {
                console.warn('Image not found in EPUB zip:', normalizedImgPath);
              }
            }
          }
          // --- SVG <image> handling ---
          const svgImageElements = sectionDoc.querySelectorAll('image');
          for (const svgImg of svgImageElements) {
            // Try both xlink:href and href
            let href = svgImg.getAttribute('xlink:href') || svgImg.getAttribute('href');
            if (href && !href.startsWith('data:') && !href.startsWith('http')) {
              let imgPath = href;
              if (!/^https?:\/\//.test(href)) {
                const basePath = fullPath.substring(0, fullPath.lastIndexOf('/') + 1);
                imgPath = basePath + href;
              }
              const normalizedImgPath = normalizePath(imgPath);
              const imgFile = zip.file(normalizedImgPath);
              if (imgFile) {
                const ext = normalizedImgPath.split('.').pop()?.toLowerCase() || 'png';
                const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : ext === 'gif' ? 'image/gif' : 'image/png';
                const imgData = await imgFile.async('uint8array');
                const firebasePath = `books/${bookId}/images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                const url = await uploadFileAndGetUrl(firebasePath, new Blob([imgData], { type: mime }));
                svgImg.setAttribute('xlink:href', url);
                svgImg.setAttribute('href', url); // for compatibility
              } else {
                console.warn('SVG image not found in EPUB zip:', normalizedImgPath);
              }
            }
          }
          // Section title: concatenate multiple <a> elements (e.g., chapter number and title)
          let sectionTitle = '';
          // 1. Concatenate <a> elements in main heading container (e.g., <p class*='capitulo'> or first <p> with <a>)
          let headingContainer: Element | null = sectionDoc.querySelector('p.capitulo') || sectionDoc.querySelector('p[class*="capitulo"]');
          if (!headingContainer) {
            // Fallback: first <p> with at least one <a>
            headingContainer = Array.from(sectionDoc.querySelectorAll('p')).find(p => p.querySelector('a')) || null;
          }
          if (headingContainer) {
            const aEls = Array.from(headingContainer.querySelectorAll('a'));
            if (aEls.length > 0) {
              sectionTitle = aEls.map(a => getInnerText(a).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
            }
          }
          // If still not found, try previous logic
          if (!sectionTitle) {
            // <span> with class containing 'numero' and next <a> with <br>
            const headingSpan = sectionDoc.querySelector('span[class*="numero"]');
            if (headingSpan && headingSpan.textContent && headingSpan.textContent.trim().length > 0) {
              sectionTitle = headingSpan.textContent.trim();
              const nextA = headingSpan.parentElement?.querySelector('a');
              if (nextA && nextA.innerHTML.includes('<br')) {
                sectionTitle += ': ' + getInnerText(nextA).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
              }
            }
          }
          if (!sectionTitle) {
            // <a> with <br> (chapter title)
            const aWithBr = sectionDoc.querySelector('a[href][innerHTML*="<br"]');
            if (aWithBr && getInnerText(aWithBr) && getInnerText(aWithBr).trim().length > 0) {
              sectionTitle = getInnerText(aWithBr).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            }
          }
          // 2. <p> with class containing 'titulo'
          if (!sectionTitle) {
            const tituloP = sectionDoc.querySelector('p[class*="titulo"]');
            if (tituloP && tituloP.textContent && tituloP.textContent.trim().length > 0) {
              sectionTitle = tituloP.textContent.trim();
            }
          }
          // 3. <h1>
          if (!sectionTitle) {
            const firstH1 = sectionDoc.querySelector('h1');
            if (firstH1 && firstH1.textContent && firstH1.textContent.trim().length > 0) {
              sectionTitle = firstH1.textContent.trim();
            }
          }
          // 4. <h2>
          if (!sectionTitle) {
            const firstH2 = sectionDoc.querySelector('h2');
            if (firstH2 && firstH2.textContent && firstH2.textContent.trim().length > 0) {
              sectionTitle = firstH2.textContent.trim();
            }
          }
          // 5. <p>
          if (!sectionTitle) {
            sectionTitle = '';
          }
          // Content: always include all <p> tags (and optionally <h1>, <h2>, <h3>) in order
          let blocks: string[] = [];
          const blockTags = ['h1', 'h2', 'h3', 'p'];
          blockTags.forEach(tag => {
            sectionDoc.querySelectorAll(tag).forEach(el => {
              if (el.textContent && el.textContent.trim().length > 0) {
                blocks.push(el.textContent.trim());
              }
            });
          });
          // Add any direct text nodes under <body> (not inside a block)
          if (sectionDoc.body) {
            Array.from(sectionDoc.body.childNodes).forEach(node => {
              if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.trim().length > 0) {
                blocks.push(node.textContent.trim());
              }
            });
          }
          const improvedContent = blocks.join('\n\n');
          function splitSentences(text: string): string[] {
            // First split by paragraphs (double newlines)
            const paragraphs = text.split(/\n\n+/g).map(p => p.trim()).filter(Boolean);
            // Improved regex: avoid splitting after common abbreviations, split on punctuation followed by a capital letter
            const sentenceRegex = /(?<!\b[A-Z][a-z]\.|Sr\.|Sra\.|Dr\.|Dra\.|etc\.|No\.|N\u00ba)\s*(?<=[.!?])\s*(?=[A-ZÁÉÍÓÚÑ]|\[)/g;
            // Split each paragraph into sentences, then flatten
            return paragraphs.flatMap(paragraph => paragraph.split(sentenceRegex).map((s: string) => s.trim()).filter(Boolean));
          }
          // Print the first sentence after splitting for verification
          const sentences = splitSentences(improvedContent);
          const firstSentence = sentences[0] || '';
          if (sections.length === 2) {
            console.log('--- Section 3 RAW CONTENT ---');
            console.log(improvedContent);
            console.log('--- Section 3 SPLIT SENTENCES ---');
            sentences.forEach((s: string, i: number) => console.log(`Sentence ${i + 1}:`, s));
            if (sentences.length > 0) {
              console.log('Section 3 FIRST SENTENCE:', sentences[0]);
            }
          }
          const sectionData = {
            title: sectionTitle.trim(),
            content: improvedContent,
            wordCount: improvedContent.split(/\s+/).filter(Boolean).length,
            id: itemId || `${sections.length + 1}`
          };
          // Print section details to console
          console.log(`=== Section ${sections.length + 1} ===`);
          console.log('Title:', sectionData.title);
          console.log('ID:', sectionData.id);
          console.log('Word Count:', sectionData.wordCount);
          console.log('Content Preview:', sectionData.content.substring(0, 200) + (sectionData.content.length > 200 ? '...' : ''));
          console.log('Full Content Length:', sectionData.content.length);
          console.log('First Sentence:', firstSentence);
          console.log('========================');
          sections.push(sectionData);
          totalWords += sectionData.wordCount;
        }
      }
      // --- Extract all CSS files referenced in the manifest ---
      const cssFiles = Array.from(opfDoc.querySelectorAll('manifest item')).filter(item => {
        const mediaType = item.getAttribute('media-type');
        return mediaType && mediaType.includes('css');
      });
      let bookCss = '';
      for (const cssItem of cssFiles) {
        const cssHref = cssItem.getAttribute('href');
        if (cssHref) {
          const cssPath = opfPath.substring(0, opfPath.lastIndexOf('/') + 1) + cssHref;
          const cssFile = zip.file(cssPath);
          if (cssFile) {
            const cssText = await cssFile.async('text');
            bookCss += '\n' + cssText;
          }
        }
      }
      // --- Title extraction: prefer <dc:title> from metadata, fallback to first h1/h2 in first section ---
      let bookTitle = '';
      const dcTitle = opfDoc.querySelector('metadata > title, metadata > dc\\:title');
      if (dcTitle && dcTitle.textContent) {
        bookTitle = dcTitle.textContent.trim();
      }
      // Fallback: try first h1/h2 in first section
      if (!bookTitle && sections.length > 0) {
        const firstSection = sections[0].content;
        const m = firstSection.match(/<h1[^>]*>(.*?)<\/h1>|<h2[^>]*>(.*?)<\/h2>/i);
        if (m) bookTitle = m[1] || m[2] || '';
      }
      if (!bookTitle) bookTitle = title;

      // --- Cover image extraction ---
      let coverUrl = '';
      // Try to find manifest item with id='cover' or media-type image/*
      let coverItem = opfDoc.querySelector('manifest item[id*=cover i][media-type^="image/"]');
      if (!coverItem) {
        // Fallback: first image in manifest
        coverItem = opfDoc.querySelector('manifest item[media-type^="image/"]');
      }
      if (coverItem) {
        const coverHref = coverItem.getAttribute('href');
        if (coverHref) {
          const coverPath = opfPath.substring(0, opfPath.lastIndexOf('/') + 1) + coverHref;
          const coverFile = zip.file(coverPath);
          if (coverFile) {
            const ext = coverPath.split('.').pop()?.toLowerCase() || 'png';
            const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : ext === 'gif' ? 'image/gif' : 'image/png';
            const coverData = await coverFile.async('uint8array');
            const firebasePath = `books/${bookId}/cover.${ext}`;
            coverUrl = await uploadFileAndGetUrl(firebasePath, new Blob([coverData], { type: mime }));
          }
        }
      }
      const newBook: Book = {
        id: bookId,
        title: title, // Use the title from form or EPUB metadata
        author,
        description,
        sections,
        totalWords,
        fileName: file.name,
        dateAdded: new Date().toISOString(),
        css: bookCss,
        cover: coverUrl,
        wordsRead: 0,
        wordsPerPage: wordsPerPage, // Use user-selected words per page
      };
      const { storagePath, downloadURL } = await uploadBookJson(user.uid, bookId, newBook as unknown as Record<string, unknown>);
      const savedMeta = await saveBookMetadata(user.uid, bookId, {
        title: newBook.title,
        author: newBook.author,
        fileName: newBook.fileName,
        totalWords: newBook.totalWords,
        storagePath,
        downloadURL,
        currentSection: 0, // Start at section 0
        wordsRead: newBook.wordsRead || 0,
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
          completed: false,
          css: newBook.css,
          cover: newBook.cover,
          wordsRead: 0,
          wordsPerPage: newBook.wordsPerPage,
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
    // Set loading state for this specific book
    setNavigatingBookId(book.id);
    
    try {
      // Check for saved progress and calculate the correct starting page
      const savedProgress = localStorage.getItem(`reader-last-pos-${book.id}`);
      let startSection = 0;
      let startPage = 0;
      
      if (savedProgress) {
        try {
          const { sectionIndex, pageIndex } = JSON.parse(savedProgress);
          startSection = sectionIndex || 0;
          startPage = pageIndex || 0;
        } catch (e) {
          console.warn('Failed to parse saved progress:', e);
        }
      }
      
      // Store userWords in localStorage for the reader page to use immediately
      if (Object.keys(userWords).length > 0) {
        localStorage.setItem('reader-userWords', JSON.stringify(userWords));
      }
      
      // Navigate to reader with the correct page immediately
      // Don't wait for async operations that could cause page jumps
      router.push(`/reader?book=${book.id}&page=${startSection}-${startPage}`, { scroll: false });
      
      // Clear navigation state after a short delay to ensure navigation completes
      setTimeout(() => {
        setNavigatingBookId(null);
      }, 100);
    } catch (error) {
      console.error('Error opening book:', error);
      setNavigatingBookId(null);
    }
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
    // Remove only the deleted book from the books array
    setBooks(prevBooks => prevBooks.filter(b => b.id !== bookId));
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

  // Toggle Completed handler
  const toggleCompleted = async (book: Book) => {
    if (!user?.uid) return;
    const newCompleted = !book.completed;
    await updateBookMetadata(user.uid, book.id, { completed: newCompleted, wordsRead: book.wordsRead || 0 });
    // Update local state
    setBooks(prevBooks => prevBooks.map(b => b.id === book.id ? { ...b, completed: newCompleted } : b));
  };

  // Generate content handler
  const onGenerate = async () => {
    if (!user?.uid) {
      setGenerateError('You must be logged in to generate content.');
      return;
    }

    if (!generateTopic.trim()) {
      setGenerateError('Please enter a topic for your content.');
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const params: GenerateContentParams = {
        language: generateLanguage,
        genre: generateGenre,
        topic: generateTopic.trim(),
        difficulty: generateDifficulty,
        delfLevel: generateDelfLevel,
        length: generateLength
      };

      // Generate content using AI
      const generatedContent = await ContentGenerationService.generateContent(params);
      
      // Save the generated book to the database
      const bookId = await ContentGenerationService.saveGeneratedBook(user.uid, generatedContent, params);
      
      // Refresh the books list
      const updatedBooks = await getBooks(user.uid);
      setBooks(updatedBooks.map(meta => ({
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
        completed: meta.completed || false,
        css: '',
        cover: '', // No cover in metadata
        wordsRead: meta.wordsRead || 0,
        wordsPerPage: 250, // Default words per page
      })));

      // Close the modal and show success message
      setShowTextModal(false);
      setModalTab('add-text');
      setGenerateTopic('');
      setGenerateSuccess(`"${generatedContent.title}" has been generated and added to your library!`);
      
      // Clear success message after 5 seconds
      setTimeout(() => setGenerateSuccess(null), 5000);
      
      console.log('Content generated successfully:', bookId);
      
    } catch (error) {
      console.error('Generation error:', error);
      setGenerateError(error instanceof Error ? error.message : 'Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Analyze comprehension for a book
  const analyzeComprehension = async (book: Book) => {
    setAnalyzing(true);
    setAnalyzeError('');
    try {
      // Fetch book content (sections)
      let allText = '';
      if (book.sections && book.sections.length > 0) {
        allText = book.sections.map(s => s.content).join(' ');
      } else if (book.downloadURL) {
        // Fetch from storage if not loaded
        const fetched = await getBookJson(book.downloadURL);
        if (fetched && fetched.sections && Array.isArray(fetched.sections)) {
          allText = fetched.sections.map((s: any) => s.content).join(' ');
        }
      }
      if (!allText) throw new Error('No book content found.');
      // Tokenize words: only alphabetic, case-insensitive, remove punctuation
      const words = (allText.match(/[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]+/g) || []).map(w => w.toLowerCase());
      const freqMap: { [word: string]: number } = {};
      words.forEach(w => {
        freqMap[w] = (freqMap[w] || 0) + 1;
      });
      // Use userWords for status
      const knownWords: string[] = [];
      const trackingWords: string[] = [];
      const ignoredWords: string[] = [];
      const unknownWords: string[] = [];
      Object.keys(freqMap).forEach(w => {
        const status = userWords[cleanWord(w)] || 'unknown';
        if (status === 'known') knownWords.push(w);
        else if (status === 'tracking') trackingWords.push(w);
        else if (status === 'ignored') ignoredWords.push(w);
        else unknownWords.push(w);
      });
      // Print word status for each word
      words.forEach(w => {
        const status = userWords[cleanWord(w)] || 'unknown';
        console.log(`ANALYZE WORD: ${w} | ${status}`);
      });
      // Print counts and percentages
      const total = words.length;
      const knownCount = words.filter(w => userWords[cleanWord(w)] === 'known').length;
      const trackingCount = words.filter(w => userWords[cleanWord(w)] === 'tracking').length;
      const ignoredCount = words.filter(w => userWords[cleanWord(w)] === 'ignored').length;
      const unknownCount = words.filter(w => !userWords[cleanWord(w)]).length;
      console.log('--- COMPREHENSION DEBUG ---');
      console.log('Total words:', total);
      console.log('Known:', knownCount, `(${((knownCount/total)*100).toFixed(2)}%)`);
      console.log('Tracking:', trackingCount, `(${((trackingCount/total)*100).toFixed(2)}%)`);
      console.log('Ignored:', ignoredCount, `(${((ignoredCount/total)*100).toFixed(2)}%)`);
      console.log('Unknown:', unknownCount, `(${((unknownCount/total)*100).toFixed(2)}%)`);
      console.log('--------------------------');
      const report = {
        totalWords: words.length,
        uniqueWords: Object.keys(freqMap).length,
        known: knownWords.length,
        tracking: trackingWords.length,
        ignored: ignoredWords.length,
        unknown: unknownWords.length,
        freqMap,
        knownWords,
        trackingWords,
        ignoredWords,
        unknownWords,
        analyzedAt: new Date().toISOString(),
      };
      // Save to Firestore
      if (user?.uid) {
        const reportRef = doc(collection(db, 'users', user.uid, 'comprehensionReports'), book.id);
        await setDoc(reportRef, report);
      }
      setComprehensionReports(prev => ({ ...prev, [book.id]: report }));
    } catch (err: any) {
      setAnalyzeError(err.message || 'Failed to analyze.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Modal for Data
  function DataModal() {
    if (!dataModalBook) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
        <div className="card-themed p-8 max-w-md w-full relative" style={{ fontFamily: 'var(--font-family)' }}>
          <button
            onClick={() => setDataModalBook(null)}
            className="absolute top-3 right-3 theme-text-secondary hover:theme-primary text-2xl font-bold transition-colors"
            style={{ background: 'none', border: 'none', lineHeight: 1 }}
            aria-label="Close"
          >
            ×
          </button>
          <h2 className="text-2xl font-extrabold mb-4 theme-text tracking-tight text-center">Book Data</h2>
          <div className="theme-text-secondary text-base space-y-3 px-2">
            <div className="flex justify-between"><span className="font-semibold">Title:</span> <span>{dataModalBook.title}</span></div>
            <div className="flex justify-between"><span className="font-semibold">Author:</span> <span>{dataModalBook.author}</span></div>
            <div className="flex justify-between"><span className="font-semibold">File:</span> <span>{dataModalBook.fileName}</span></div>
            <div className="flex justify-between"><span className="font-semibold">Date Added:</span> <span>{new Date(dataModalBook.dateAdded).toLocaleString()}</span></div>
            {/* Add more analytics here later */}
          </div>
        </div>
      </div>
    );
  }

  // Comprehension Modal
  function ComprehensionModal() {
    if (!comprehensionModalBook) return null;
    const report = comprehensionReports[comprehensionModalBook.id];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
        <div className="card-themed p-8 max-w-lg w-full relative" style={{ fontFamily: 'var(--font-family)' }}>
          <button
            onClick={() => setComprehensionModalBook(null)}
            className="absolute top-3 right-3 theme-text-secondary hover:theme-primary text-2xl font-bold transition-colors"
            style={{ background: 'none', border: 'none', lineHeight: 1 }}
            aria-label="Close"
          >
            ×
          </button>
          <h2 className="text-2xl font-extrabold mb-4 theme-text tracking-tight text-center">Comprehension Report</h2>
          <div className="theme-text-secondary text-base space-y-3 px-2">
            <div className="flex justify-between"><span className="font-semibold">Title:</span> <span>{comprehensionModalBook.title}</span></div>
            <div className="flex justify-between"><span className="font-semibold">Author:</span> <span>{comprehensionModalBook.author}</span></div>
            <div className="flex justify-between"><span className="font-semibold">Total Words:</span> <span>{comprehensionModalBook.totalWords}</span></div>
            {report ? (
              <>
                <div className="flex justify-between"><span className="font-semibold">Unique Words:</span> <span>{report.uniqueWords}</span></div>
                <div className="flex justify-between"><span className="font-semibold">Known:</span> <span>{report.known}</span></div>
                <div className="flex justify-between"><span className="font-semibold">Unknown:</span> <span>{report.unknown}</span></div>
                <div className="flex justify-between"><span className="font-semibold">Ignored:</span> <span>{report.ignored}</span></div>
                <div className="flex justify-between"><span className="font-semibold">Analyzed At:</span> <span>{new Date(report.analyzedAt).toLocaleString()}</span></div>
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Top 10 Words</h3>
                  <ul className="text-sm max-h-32 overflow-y-auto">
                    {(Object.entries(report.freqMap) as [string, number][]) 
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 10)
                      .map(([word, count]) => (
                        <li key={word}>{word}: {count}</li>
                      ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="italic text-gray-500">No comprehension report yet. Click below to analyze.</div>
            )}
            {analyzeError && <div className="text-red-600 text-sm mb-2">{analyzeError}</div>}
            <button
              onClick={() => analyzeComprehension(comprehensionModalBook)}
              className="btn-primary w-full mt-4 py-3 px-4 rounded-lg font-bold text-base shadow-sm transition-colors border-none focus:outline-none focus:ring-2"
              disabled={analyzing}
            >
              {analyzing ? 'Analyzing...' : (report ? 'Re-analyze Comprehension' : 'Analyze Comprehension')}
            </button>
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
              <div dangerouslySetInnerHTML={{ __html: currentBook.sections[currentSection].content }} />
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
                {currentSection + 1} of {currentBook.sections.length}
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
    <div data-theme={theme} style={{ minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Theme selector for demo */}
      <div
        className="pr-8 pb-10 transition-all duration-300 sm:pb-10 pb-4"
        style={{
          marginLeft: sidebarExpanded ? 80 : 32,
          paddingTop: 24,
          transition: 'margin-left 0.3s cubic-bezier(.4,0,.2,1)',
          maxWidth: 1200,
        }}
      >
        <div className="flex justify-between items-center mb-10">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-extrabold theme-text tracking-tight" style={{ letterSpacing: '-0.01em', fontWeight: 800, lineHeight: 1.1 }}>My Library</h1>
            <div style={{ height: 4, width: 48, background: 'var(--primary-color)', borderRadius: 2 }} />
          </div>
          <div className="flex items-center gap-3">
            {/* Add Text Button */}
            <button
              className="flex items-center gap-2 btn-primary px-4 py-2 rounded-lg font-semibold shadow-sm transition-colors border-none focus:outline-none focus:ring-2"
              title="Add Text Book"
              onClick={() => {
                setModalTab('add-text');
                setShowTextModal(true);
              }}
            >
              <FiPlus className="w-5 h-5" />
              <span className="hidden sm:inline">Add</span>
            </button>
            {/* Generate Content Button */}
            <button
              className="flex items-center gap-2 btn-primary px-4 py-2 rounded-lg font-semibold shadow-sm transition-colors border-none focus:outline-none focus:ring-2"
              title="Generate Content"
              onClick={() => {
                setModalTab('generate');
                setShowTextModal(true);
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="hidden sm:inline">Generate</span>
            </button>
            {/* Upload EPUB Button */}
            
          </div>
        </div>
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        {generateSuccess && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {generateSuccess}
          </div>
        )}
        {/* Book sections and modals remain below, but Daily Goals section is removed */}
        <SectionRow title="Active" books={activeBooks} />
        <SectionRow title="Not Started" books={notStarted} />
        <SectionRow title="Completed" books={completed} />
        <SectionRow title="Archived" books={archivedBooks} archived />
        <DataModal />
        {showTextModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setShowTextModal(false)}
          >
            <div
              className="card-themed sm:p-12 p-4 sm:max-w-2xl max-w-sm w-[98vw] max-h-[85vh] overflow-y-auto"
              style={{ fontFamily: 'var(--font-family)', color: 'var(--text-color)', minWidth: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowTextModal(false)}
                className="absolute top-2 right-2 theme-text-secondary hover:theme-primary text-xl sm:text-2xl font-bold transition-colors p-1 sm:p-2"
                style={{ background: 'none', border: 'none', lineHeight: 1 }}
                aria-label="Close"
              >
                ×
              </button>
              
              {/* Tabs */}
              <div className="flex mb-6">
                <button
                  onClick={() => setModalTab('add-text')}
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                    modalTab === 'add-text'
                      ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                      : 'border-transparent theme-text-secondary hover:theme-text'
                  }`}
                >
                  Add Text
                </button>
                <button
                  onClick={() => setModalTab('generate')}
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                    modalTab === 'generate'
                      ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                      : 'border-transparent theme-text-secondary hover:theme-text'
                  }`}
                >
                  Generate
                </button>
              </div>
              
              {/* Tab Content */}
              {modalTab === 'add-text' && (
                <div className="theme-text-secondary text-sm sm:text-base space-y-2 sm:space-y-3 px-1 sm:px-2">
                  <div className="flex flex-col mb-2">
                    <label className="font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Title</label>
                    <input
                      type="text"
                      value={textTitle}
                      onChange={e => {
                        setTextTitle(e.target.value);
                      }}
                      className="input-themed text-sm sm:text-base p-2 sm:p-3 rounded-md sm:rounded-lg"
                    />
                  </div>
                  <div className="flex flex-col mb-2">
                    <label className="font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Author</label>
                    <input
                      type="text"
                      value={textAuthor}
                      onChange={e => {
                        setTextAuthor(e.target.value);
                      }}
                      className="input-themed text-sm sm:text-base p-2 sm:p-3 rounded-md sm:rounded-lg"
                    />
                  </div>
                  <div className="flex flex-col mb-2">
                    <label className="font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Words per Page ({wordsPerPage})</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="150"
                        max="500"
                        step="25"
                        value={wordsPerPage}
                        onChange={e => setWordsPerPage(Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <input
                        type="number"
                        min="150"
                        max="500"
                        step="25"
                        value={wordsPerPage}
                        onChange={e => setWordsPerPage(Number(e.target.value))}
                        className="w-20 text-center input-themed text-sm p-2 rounded-md"
                      />
                    </div>
                    <div className="text-xs theme-text-secondary mt-1">
                      Range: 150-500 words (default: 250)
                    </div>
                  </div>
                  {!epubFile && (
                    <div className="flex flex-col mb-2">
                      <label className="font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Text Content</label>
                      <textarea
                        value={textContent}
                        onChange={e => {
                          setTextContent(e.target.value);
                          if (e.target.value.trim()) {
                            setEpubFile(null);
                            setEpubMetadata(null);
                          }
                        }}
                        rows={3}
                        className="input-themed text-sm sm:text-base p-2 sm:p-3 rounded-md sm:rounded-lg sm:min-h-[160px] min-h-[60px] max-h-[100px]"
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  )}
                  <div className="flex flex-col mb-2">
                    <label className="font-semibold mb-1">Or upload .txt file</label>
                    <label htmlFor="text-upload-input" className="btn-primary inline-block w-fit px-4 sm:px-6 py-2 rounded-md sm:rounded-lg font-semibold shadow-sm transition-colors cursor-pointer text-base sm:text-base text-sm mb-2">
                      Choose .txt File
                      <input
                        id="text-upload-input"
                        type="file"
                        accept=".txt"
                        onChange={handleTextFileSelect}
                        className="hidden"
                      />
                    </label>
                    {textFile && <div className="text-sm text-gray-700 mt-1">Selected: <span className="font-medium">{textFile.name}</span></div>}
                  </div>

                  <div className="flex flex-col mb-2">
                    <label className="font-semibold mb-1">Or upload .epub file</label>
                    <label htmlFor="epub-upload-input" className="btn-primary inline-block w-fit px-4 sm:px-6 py-2 rounded-md sm:rounded-lg font-semibold shadow-sm transition-colors cursor-pointer text-base sm:text-base text-sm mb-2">
                      <span>Choose .epub File</span>
                      <input
                        id="epub-upload-input"
                        type="file"
                        accept=".epub"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </label>
                    {epubFile && (
                      <div className="text-sm text-gray-700 mt-1">
                        Selected: <span className="font-medium">{epubFile.name}</span>
                        {epubMetadata && (
                          <div className="text-xs text-gray-500 mt-1">
                            Title: {epubMetadata.title} | Author: {epubMetadata.author}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  



                  <div className="flex flex-col mb-2">
                    <label className="font-semibold mb-1">Or upload .md file</label>
                    <div className="flex flex-row gap-2">
                      <label htmlFor="md-upload-input" className="btn-primary inline-block w-fit px-4 sm:px-6 py-2 rounded-md sm:rounded-lg font-semibold shadow-sm transition-colors cursor-pointer text-base sm:text-base text-sm mb-2">
                        Choose .md File
                        <input
                          id="md-upload-input"
                          type="file"
                          accept=".md"
                          onChange={handleMdFileSelect}
                          className="hidden"
                        />
                      </label>
                      <button
                        className="btn-primary px-4 sm:px-6 py-2 rounded-md sm:rounded-lg font-semibold shadow-sm transition-colors text-base sm:text-base text-sm mb-2"
                        disabled={batchMdLoading}
                        onClick={() => document.getElementById('batch-md-upload-input')?.click()}
                        type="button"
                      >
                        {batchMdLoading ? 'Uploading...' : 'Batch Upload (max 5)'}
                      </button>
                      <input
                        id="batch-md-upload-input"
                        type="file"
                        accept=".md"
                        multiple
                        onChange={handleBatchMdFileSelect}
                        className="hidden"
                        disabled={batchMdLoading}
                      />
                    </div>
                    <span className="text-xs text-gray-500 mt-1">You can select up to 5 .md files at once.</span>
                    {batchMdError && <div className="text-red-600 text-xs mt-1">{batchMdError}</div>}
                    {mdFile && <div className="text-sm text-gray-700 mt-1">Selected: <span className="font-medium">{mdFile.name}</span></div>}
                    {mdError && <div className="text-red-600 text-sm mb-2">{mdError}</div>}
                    {mdLoading && <div className="text-blue-600 text-sm mb-2">Processing .md file...</div>}
                  </div>
                  {textError && <div className="text-red-600 text-sm mb-2">{textError}</div>}
                  <button
                    onClick={handleCreateTextBook}
                    className="btn-primary w-full mt-4 py-2 sm:py-3 px-3 sm:px-4 rounded-md sm:rounded-lg font-bold text-base sm:text-base text-sm shadow-sm transition-colors border-none focus:outline-none focus:ring-2"
                    disabled={textLoading}
                  >
                    {textLoading ? 'Adding...' : 'Add Book'}
                  </button>
                </div>
              )}
              
              {modalTab === 'generate' && (
                <div className="theme-text-secondary text-sm sm:text-base space-y-3 sm:space-y-4 px-1 sm:px-2">
                  <div className="flex flex-col mb-4">
                    <label className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">Language</label>
                    <select
                      value={generateLanguage}
                      onChange={e => setGenerateLanguage(e.target.value)}
                      className="w-full theme-border rounded px-2 sm:px-3 py-1 sm:py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] theme-bg theme-text border-2"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      {targetLanguages.map((lang) => (
                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col mb-4">
                    <label className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">Genre</label>
                    <select
                      value={generateGenre}
                      onChange={e => setGenerateGenre(e.target.value)}
                      className="w-full theme-border rounded px-2 sm:px-3 py-1 sm:py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] theme-bg theme-text border-2"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <option value="story">Story</option>
                      <option value="news">News Report</option>
                      <option value="article">Article</option>
                      <option value="essay">Essay</option>
                      <option value="speech">Speech</option>
                      <option value="dialogue">Dialogue</option>
                      <option value="biography">Biography</option>
                    </select>
                  </div>

                  <div className="flex flex-col mb-4">
                    <label className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">Topic</label>
                    <input
                      type="text"
                      value={generateTopic}
                      onChange={e => setGenerateTopic(e.target.value)}
                      placeholder="Enter a topic for your content (e.g., 'A day at the beach', 'Climate change', 'Traveling to Paris')"
                      className="w-full theme-border rounded px-2 sm:px-3 py-1 sm:py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] theme-bg theme-text border-2"
                      style={{ borderColor: 'var(--border-color)' }}
                    />
                  </div>

                  <div className="flex flex-col mb-4">
                    <label className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">Difficulty Level</label>
                    <select
                      value={generateDifficulty}
                      onChange={e => {
                        const difficulty = e.target.value;
                        setGenerateDifficulty(difficulty);
                        // Auto-set DELF level based on difficulty
                        if (difficulty === 'beginner') {
                          setGenerateDelfLevel('a1');
                        } else if (difficulty === 'intermediate') {
                          setGenerateDelfLevel('b1');
                        } else if (difficulty === 'advanced') {
                          setGenerateDelfLevel('c1');
                        }
                      }}
                      className="w-full theme-border rounded px-2 sm:px-3 py-1 sm:py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] theme-bg theme-text border-2"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>

                  <div className="flex flex-col mb-4">
                    <label className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">DELF Level (Optional)</label>
                    <select
                      value={generateDelfLevel}
                      onChange={e => setGenerateDelfLevel(e.target.value)}
                      className="w-full theme-border rounded px-2 sm:px-3 py-1 sm:py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] theme-bg theme-text border-2"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      {generateDifficulty === 'beginner' && (
                        <>
                          <option value="a1">A1 (Beginner)</option>
                          <option value="a2">A2 (Elementary)</option>
                        </>
                      )}
                      {generateDifficulty === 'intermediate' && (
                        <>
                          <option value="b1">B1 (Intermediate)</option>
                          <option value="b2">B2 (Upper Intermediate)</option>
                        </>
                      )}
                      {generateDifficulty === 'advanced' && (
                        <>
                          <option value="c1">C1 (Advanced)</option>
                          <option value="c2">C2 (Mastery)</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="flex flex-col mb-6">
                    <label className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">Length ({generateLength} words)</label>
                    <input
                      type="range"
                      min={500}
                      max={3000}
                      step={100}
                      value={generateLength}
                      onChange={e => setGenerateLength(Number(e.target.value))}
                      className="w-full"
                      style={{ accentColor: 'var(--primary-color)' }}
                    />
                    <div className="flex justify-between text-sm theme-text-secondary mt-1">
                      <span>500 words</span>
                      <span>1500 words</span>
                      <span>3000 words</span>
                    </div>
                  </div>

                  {generateError && (
                    <div className="text-red-500 text-sm mt-2 p-2 bg-red-50 rounded border border-red-200">
                      {generateError}
                    </div>
                  )}

                  <button
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className={`w-full mt-4 py-3 px-4 rounded-lg font-bold text-base shadow-sm transition-colors border-none focus:outline-none focus:ring-2 ${
                      isGenerating 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'btn-primary'
                    }`}
                  >
                    {isGenerating ? 'Generating Content...' : 'Generate Content'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Processing Popup */}
      {showProcessingPopup && (
        <div className="fixed z-50 bottom-4 right-4 sm:bottom-4 sm:right-4 sm:left-auto left-1/2 transform -translate-x-1/2 sm:transform-none">
          <div className="card-themed rounded-lg shadow-lg p-4 flex items-center gap-3">
            {processingStatus === 'processing' ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: 'var(--primary-color)' }}></div>
                <span className="text-sm font-medium theme-text">Processing EPUB...</span>
              </>
            ) : (
              <>
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--primary-color)' }}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm font-medium theme-text">Complete!</span>
              </>
            )}
          </div>
        </div>
      )}
      
      <ComprehensionModal />
    </div>
  );

  // SectionRow component
  function SectionRow({ title, books, archived }: { title: string; books: (Book | ArchivedBookCard)[]; archived?: boolean }) {
    const shelfMap: { [key: string]: string } = {
      'Active': 'Currently Reading',
      'Not Started': 'To Read',
      'Completed': 'Finished',
      'Archived': 'Archived',
    };
    
    // Show skeleton loaders if books are still loading AND this section has no books
    // This prevents showing skeletons for sections that already have books loaded
    const showSkeletons = isLoadingBooks && books.length === 0;
    
    return (
      <div className="mb-16">
        <div className="flex items-center gap-4 mb-6 mt-12">
          <h2 className="text-xl font-bold theme-primary tracking-tight" style={{ fontFamily: 'var(--font-family)', letterSpacing: '-0.01em', fontWeight: 700 }}>{shelfMap[title] || title}</h2>
          <div className="flex-1 border-t theme-border" />
        </div>
        
        {/* Mobile layout */}
        <div className="flex overflow-x-auto gap-4 snap-x snap-mandatory pb-2 px-2 sm:hidden" style={{ WebkitOverflowScrolling: 'touch', maxWidth: '100vw', width: '100vw' }}>
          {showSkeletons ? (
            // Skeleton loaders for mobile
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={`skeleton-${idx}`} className="snap-center flex-shrink-0" style={{ width: '60vw', maxWidth: 200, minWidth: 140, marginRight: idx === 2 ? 0 : 12, marginLeft: idx === 0 ? 0 : 0 }}>
                <div className="card-themed-primary flex flex-col w-full aspect-[3/4] animate-pulse">
                  <div className="flex justify-end p-2">
                    <div className="w-6 h-6 bg-gray-200 rounded"></div>
                  </div>
                  <div className="flex-1 flex flex-col justify-between px-6 pb-6 pt-0 gap-2">
                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="h-2 bg-gray-200 rounded mb-1"></div>
                    <div className="h-2 bg-gray-200 rounded mb-1"></div>
                    <div className="h-2 bg-gray-200 rounded mb-1"></div>
                    <div className="h-2 bg-gray-200 rounded mb-1"></div>
                    <div className="flex gap-2 mt-2">
                      <div className="flex-1 h-10 bg-gray-200 rounded"></div>
                      <div className="flex-1 h-10 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : books.length > 0 ? books.map((book, idx) => (
              <div key={book.id} className="snap-center flex-shrink-0" style={{ width: '60vw', maxWidth: 200, minWidth: 140, marginRight: idx === books.length - 1 ? 0 : 12, marginLeft: idx === 0 ? 0 : 0 }}>
              <BookCard 
                book={book} 
                archived={archived} 
                openBook={openBook} 
                bookWordsRead={bookWordsRead} 
                comprehensionReports={comprehensionReports} 
                setComprehensionModalBook={setComprehensionModalBook} 
                fetchComprehensionReport={fetchComprehensionReport} 
                setDataModalBook={setDataModalBook} 
                toggleCompleted={toggleCompleted} 
                archiveBookHandler={archiveBookHandler} 
                deleteBookHandler={deleteBookHandler} 
                deleteArchivedBookHandler={deleteArchivedBookHandler}
                isNavigatingToBook={navigatingBookId === book.id}
                isLoadingComprehensionReports={isLoadingComprehensionReports}
                isLoadingSessions={isLoadingSessions}
              />
              </div>
            )) : (
              <div className="col-span-full flex flex-col items-center justify-center italic h-32 border-2 border-dashed theme-border rounded-xl" style={{ background: 'var(--card-background)', padding: '1.5rem', minWidth: '90vw', maxWidth: '20rem' }}>
                <span className="text-base theme-text-secondary">No books in this shelf yet.</span>
              </div>
            )}
          </div>
        
        {/* Desktop layout */}
        <div className="hidden sm:flex flex-wrap gap-x-4 gap-y-6 min-h-[180px]">
          {showSkeletons ? (
            // Skeleton loaders for desktop
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={`skeleton-${idx}`} className="card-themed-primary flex flex-col w-full aspect-[3/4] animate-pulse" style={{ maxWidth: '250px', minWidth: '180px' }}>
                <div className="flex justify-end p-2">
                  <div className="w-6 h-6 bg-gray-200 rounded"></div>
                </div>
                <div className="flex-1 flex flex-col justify-between px-6 pb-6 pt-0 gap-2">
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-2 bg-gray-200 rounded mb-1"></div>
                  <div className="h-2 bg-gray-200 rounded mb-1"></div>
                  <div className="h-2 bg-gray-200 rounded mb-1"></div>
                  <div className="h-2 bg-gray-200 rounded mb-1"></div>
                  <div className="flex gap-2 mt-2">
                    <div className="flex-1 h-10 bg-gray-200 rounded"></div>
                    <div className="flex-1 h-10 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))
          ) : books.length > 0 ? books.map((book) => (
              <BookCard 
                key={book.id} 
                book={book} 
                archived={archived} 
                openBook={openBook} 
                bookWordsRead={bookWordsRead} 
                comprehensionReports={comprehensionReports} 
                setComprehensionModalBook={setComprehensionModalBook} 
                fetchComprehensionReport={fetchComprehensionReport} 
                setDataModalBook={setDataModalBook} 
                toggleCompleted={toggleCompleted} 
                archiveBookHandler={archiveBookHandler} 
                deleteBookHandler={deleteBookHandler} 
                deleteArchivedBookHandler={deleteArchivedBookHandler}
                isNavigatingToBook={navigatingBookId === book.id}
                isLoadingComprehensionReports={isLoadingComprehensionReports}
                isLoadingSessions={isLoadingSessions}
              />
          )) : (
            <div className="col-span-full flex flex-col items-center justify-center italic h-32 border-2 border-dashed theme-border rounded-xl" style={{ background: 'var(--card-background)', padding: '1.5rem' }}>
              <span className="text-base theme-text-secondary">No books in this shelf yet.</span>
            </div>
          )}
        </div>
      </div>
    );
  }
}
