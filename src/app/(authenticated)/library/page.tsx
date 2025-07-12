'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { uploadBookJson, saveBookMetadata, getBooks, getBookJson, deleteBook, updateBookMetadata, archiveBook, getArchivedBooks, deleteArchivedBook, ArchivedBookMetadata } from '@/services/epubService';
import { useAuth } from '@/hooks/useAuth';
import { UserService } from '@/services/userService';
import { FiTrash2, FiBarChart2, FiCheckCircle, FiPlus, FiArchive } from 'react-icons/fi';
import { uploadFileAndGetUrl } from '@/lib/firebase';
import '@fontsource/inter';
import { ReadingSessionService, ReadingSession } from '@/services/readingSessionService';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/contexts/I18nContext';

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
  completed?: boolean;
  css: string;
  cover: string;
}

interface ReadingProgress {
  bookId: string;
  currentSection: number;
  lastRead: string;
}

// Minimal type for archived book cards
interface ArchivedBookCard {
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
  const [mdFile, setMdFile] = useState<File | null>(null);
  const [mdError, setMdError] = useState('');
  const [mdLoading, setMdLoading] = useState(false);
  const [archivedBooks, setArchivedBooks] = useState<ArchivedBookCard[]>([]);
  const [batchMdLoading, setBatchMdLoading] = useState(false);
  const [batchMdError, setBatchMdError] = useState('');
  const { t } = useTranslation(['library', 'common']);

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
        completed: meta.completed || false,
        css: '', // No CSS in metadata
        cover: '', // No cover in metadata
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
    ReadingSessionService.getUserSessions(user.uid).then(sessions => {
      const wordsRead: { [key: string]: number } = {};
      sessions.forEach(session => {
        wordsRead[String(session.bookId)] = (wordsRead[String(session.bookId)] || 0) + session.wordCount;
      });
      setBookWordsRead(wordsRead);
      setSessions(sessions);
    });
  }, [user]);

  // On mount, load daily goal from Firebase
  useEffect(() => {
    if (!user?.uid) return;
    UserService.getDailyGoal(user.uid).then(goal => {
      setDailyGoal(goal);
      setGoalInput(String(goal));
    }).catch(err => {
      console.error('Failed to load daily goal:', err);
      // Fallback to default
      setDailyGoal(1500);
      setGoalInput('1500');
    });
  }, [user]);

  // Fetch archived books on mount
  useEffect(() => {
    if (!user?.uid) return;
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
  }, [user]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.epub')) {
      await processEpubFile(file);
    } else {
      setError('Please select a valid EPUB file.');
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
      const title = opfDoc.querySelector('title')?.textContent || 'Unknown Title';
      const author = opfDoc.querySelector('creator')?.textContent || 'Unknown Author';
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
            const sentenceRegex = /(?<!\b[A-Z][a-z]\.|Sr\.|Sra\.|Dr\.|Dra\.|etc\.|No\.|N\u00ba)\s*(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ])/g;
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
        title: bookTitle,
        author,
        description,
        sections,
        totalWords,
        fileName: file.name,
        dateAdded: new Date().toISOString(),
        css: bookCss,
        cover: coverUrl,
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
          cover: '',
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
    // Refetch metadata and update library
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
        css: '', // No CSS in metadata
        cover: '', // No cover in metadata
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

  // Toggle Completed handler
  const toggleCompleted = async (book: Book) => {
    if (!user?.uid) return;
    const newCompleted = !book.completed;
    await updateBookMetadata(user.uid, book.id, { completed: newCompleted });
    // Update local state
    setBooks(prevBooks => prevBooks.map(b => b.id === book.id ? { ...b, completed: newCompleted } : b));
  };

  // Helper: Determine book status
  function getBookStatus(book: Book): 'active' | 'notStarted' | 'completed' {
    if (book.completed) return 'completed';
    const savedProgress = localStorage.getItem('epub-reader-progress');
    if (savedProgress) {
      const allProgress: ReadingProgress[] = JSON.parse(savedProgress);
      const bookProgress = allProgress.find((p) => p.bookId === book.id);
      if (bookProgress) {
        // Any progress, even at last section, is 'active' unless completed flag is set
        return 'active';
      }
    }
    return 'notStarted';
  }

  // Group books
  const activeBooks = books.filter((b) => getBookStatus(b) === 'active');
  const notStarted = books.filter((b) => getBookStatus(b) === 'notStarted');
  const completed = books.filter((b) => getBookStatus(b) === 'completed');

  // Helper: get today's date string (YYYY-MM-DD)
  function getToday() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
  // Helper: get words read today (fix: compare only date part of each session's timestamp)
  const todayStr = getToday();
  console.log('Today string:', todayStr);
  // Helper: compare two dates by local year, month, and day
  function isSameLocalDay(dateA: Date, dateB: Date) {
    return (
      dateA.getFullYear() === dateB.getFullYear() &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getDate() === dateB.getDate()
    );
  }
  const today = new Date();
  const sessionsToday = sessions
    ? sessions.filter((s, idx) => {
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
        const isToday = isSameLocalDay(sessionDate, today);
        console.log(`[Session ${idx}] timestamp:`, s.timestamp, '| parsed:', sessionDate, '| isToday (local):', isToday);
        return isToday;
      })
    : [];
  const wordsReadToday = sessionsToday.reduce((sum, s) => sum + (s.wordCount || 0), 0);
  console.log('Filtered sessions for today:', sessionsToday);
  console.log('wordsReadToday (sum):', wordsReadToday, 'dailyGoal:', dailyGoal);

  // Add handler for text book creation
  const handleCreateTextBook = async () => {
    setTextError('');
    if (!textTitle.trim() || !textAuthor.trim() || !textContent.trim()) {
      setTextError('Please fill in all fields.');
      return;
    }
    if (!user?.uid) {
      setTextError('You must be signed in.');
      return;
    }
    setTextLoading(true);
    try {
      // Create a single-section book
      const bookId = Date.now().toString();
      const newBook = {
        id: bookId,
        title: textTitle.trim(),
        author: textAuthor.trim(),
        description: '',
        sections: [{
          title: textTitle.trim(),
          content: textContent.trim(),
          wordCount: textContent.trim().split(/\s+/).filter(Boolean).length,
          id: '1',
        }],
        totalWords: textContent.trim().split(/\s+/).filter(Boolean).length,
        fileName: `${textTitle.trim().replace(/\s+/g, '_')}.txt`,
        dateAdded: new Date().toISOString(),
        css: '',
        cover: '',
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
      });
      // Add to local state
      setBooks(prevBooks => [
        ...prevBooks,
        {
          ...newBook,
          storagePath,
          downloadURL,
          completed: false,
        }
      ]);
      setShowTextModal(false);
      setTextTitle('');
      setTextAuthor('');
      setTextContent('');
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
        });
        // Add to local state
        setBooks(prevBooks => [
          ...prevBooks,
          {
            ...newBook,
            storagePath,
            downloadURL,
            completed: false,
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
          cover: '',
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

  // BookCard
  function BookCard({ book, archived }: { book: Book | ArchivedBookCard; archived?: boolean }) {
    const knownPct = 94.6;
    const trackingPct = 3.5;
    const unknownPct = 1.8;
    const completed = (book as Book).completed;
    // For archived, use book.wordsRead; for Book, use bookWordsRead
    const wordsRead = archived ? (book as ArchivedBookCard).wordsRead : bookWordsRead[String(book.id)] || 0;
    const progressPct = book.totalWords > 0 ? Math.min(100, (wordsRead / book.totalWords) * 100) : 0;
    return (
      <div
        className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col w-full max-w-[250px] min-h-[250px] aspect-[3/4] cursor-pointer transition-all duration-200 hover:shadow-lg group"
        style={{ fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif', minHeight: 320, padding: 0, opacity: archived ? 0.7 : 1 }}
        onClick={archived ? undefined : () => openBook(book as Book)}
        tabIndex={0}
        role="button"
        aria-label={`Read ${book.title}`}
      >
        <div className="flex justify-end p-2 gap-2">
          {archived ? (
          <button
              onClick={e => { e.stopPropagation(); deleteArchivedBookHandler(book.id); }}
              className="text-gray-300 hover:text-red-500 text-lg p-1 rounded transition-colors"
              title="Delete archived book"
              tabIndex={-1}
              style={{ background: 'none', border: 'none' }}
            >
              <FiTrash2 className="w-5 h-5" />
            </button>
          ) : (
            <>
              <button
                onClick={e => { e.stopPropagation(); archiveBookHandler(book as Book); }}
                className="text-gray-300 hover:text-yellow-500 text-lg p-1 rounded transition-colors"
                title="Archive book"
                tabIndex={-1}
                style={{ background: 'none', border: 'none' }}
              >
                <FiArchive className="w-5 h-5" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); deleteBookHandler(book.id, (book as Book).storagePath); }}
            className="text-gray-300 hover:text-red-500 text-lg p-1 rounded transition-colors"
            title="Delete book"
            tabIndex={-1}
            style={{ background: 'none', border: 'none' }}
          >
            <FiTrash2 className="w-5 h-5" />
          </button>
            </>
          )}
        </div>
        <div className="flex-1 flex flex-col justify-between px-6 pb-6 pt-0 gap-2">
          <h3 className="font-bold text-[#232946] text-lg leading-tight mb-0.5 line-clamp-2 text-left" style={{ letterSpacing: '-0.01em', fontWeight: 700 }}>{book.title}</h3>
          {/* Reading Progress Bar */}
          <div className="w-full mb-1">
            <div className="relative h-2.5 rounded-full bg-gray-200 overflow-hidden">
              <div className="absolute left-0 top-0 h-full bg-[#2563eb] transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex justify-between text-xs mt-1 text-[#6b7280]">
              <span>{book.author}</span>
              <span className="text-right">{(wordsRead ?? 0).toLocaleString()} / {(book.totalWords ?? 0).toLocaleString()} words</span>
            </div>
          </div>
          {/* Comprehension Progress Bar */}
          <div className="w-full mt-1 mb-1">
            <div className="relative h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="absolute left-0 top-0 h-full bg-[#28a745]" style={{ width: `${knownPct}%`, borderRadius: '999px 0 0 999px' }} />
              <div className="absolute left-0 top-0 h-full bg-[#a0aec0]" style={{ width: `${100 - unknownPct}%`, opacity: 0.3 }} />
              <div className="absolute left-0 top-0 h-full bg-[#2563eb]" style={{ width: `${trackingPct + knownPct}%`, opacity: 0.18 }} />
            </div>
            <div className="flex justify-between text-xs mt-1 text-[#6b7280]">
              <span>{knownPct}% Known</span>
              <span>{unknownPct}% Unknown</span>
            </div>
          </div>
          {/* Actions */}
          {!archived && (
          <div className="flex gap-2 mt-2">
            <button
                onClick={e => { e.stopPropagation(); setDataModalBook(book as Book); }}
              className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-[#2563eb] text-[#2563eb] bg-white hover:bg-[#f0f6ff] font-semibold py-1.5 px-2 text-sm transition-colors"
              tabIndex={-1}
            >
              <FiBarChart2 className="w-4 h-4" /> Data
            </button>
            <button
                onClick={e => { e.stopPropagation(); toggleCompleted(book as Book); }}
                className={`flex-1 flex items-center justify-center gap-1 rounded-lg border ${(book as Book).completed ? 'border-gray-300 text-gray-400 bg-gray-100' : 'border-[#2563eb] text-[#2563eb] bg-white hover:bg-[#f0f6ff]'} font-semibold py-1.5 px-2 text-sm transition-colors`}
              tabIndex={-1}
            >
                <FiCheckCircle className="w-4 h-4" /> {(book as Book).completed ? 'Uncomplete' : 'Complete'}
            </button>
          </div>
          )}
        </div>
      </div>
    );
  }

  // Modal for Data
  function DataModal() {
    if (!dataModalBook) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-xl max-w-md w-full relative" style={{ fontFamily: 'Inter, sans-serif' }}>
          <button
            onClick={() => setDataModalBook(null)}
            className="absolute top-3 right-3 text-gray-400 hover:text-[#2563eb] text-2xl font-bold transition-colors"
            style={{ background: 'none', border: 'none', lineHeight: 1 }}
            aria-label="Close"
          >
            ×
          </button>
          <h2 className="text-2xl font-extrabold mb-4 text-[#222] tracking-tight text-center">Book Data</h2>
          <div className="text-gray-700 text-base space-y-3 px-2">
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
    <div className="min-h-screen" style={{ background: '#f7f8fa', fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}>
      <div
        className="pr-8 pb-10 transition-all duration-300"
        style={{
          marginLeft: sidebarExpanded ? 80 : 32,
          paddingTop: 24,
          transition: 'margin-left 0.3s cubic-bezier(.4,0,.2,1)',
          maxWidth: 1200,
        }}
      >
        <div className="flex justify-between items-center mb-10">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-extrabold text-[#232946] tracking-tight" style={{ letterSpacing: '-0.01em', fontWeight: 800, lineHeight: 1.1 }}>My Library</h1>
            <div style={{ height: 4, width: 48, background: '#2563eb', borderRadius: 2 }} />
          </div>
          <div className="flex items-center gap-3">
            {/* Add Text Button */}
            <button
              className="flex items-center justify-center rounded-full bg-[#2563eb] hover:bg-[#1749b1] text-white w-11 h-11 shadow-sm transition-colors border-none focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40"
              style={{ fontSize: 24, marginRight: 0 }}
              title="Add Text Book"
              onClick={() => setShowTextModal(true)}
            >
              <FiPlus />
            </button>
            {/* Upload EPUB Button */}
          <button
            className="px-7 py-2 rounded-full bg-[#2563eb] text-white font-bold shadow-sm hover:bg-[#1749b1] transition-colors text-base border-none focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40"
            disabled={isUploading}
            onClick={() => document.getElementById('epub-upload-input')?.click()}
            style={{ fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif', boxShadow: '0 2px 8px 0 rgba(37,99,235,0.06)' }}
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
        </div>
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
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
            style={{ background: 'rgba(0,0,0,0.10)', backdropFilter: 'blur(1.5px)' }}
            onClick={() => setShowTextModal(true)}
          >
            <div
              className="bg-white rounded-2xl p-12 border border-gray-200 shadow-xl max-w-2xl w-full relative"
              style={{ fontFamily: 'Inter, sans-serif', color: 'black', minWidth: 400 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowTextModal(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-[#2563eb] text-2xl font-bold transition-colors"
                style={{ background: 'none', border: 'none', lineHeight: 1 }}
                aria-label="Close"
              >
                ×
              </button>
              <h2 className="text-2xl font-extrabold mb-4 text-[#222] tracking-tight text-center">Add Text Book</h2>
              <div className="text-gray-700 text-base space-y-3 px-2">
                <div className="flex flex-col mb-2">
                  <label className="font-semibold mb-1">Title</label>
                  <input
                    type="text"
                    value={textTitle}
                    onChange={e => setTextTitle(e.target.value)}
                    className="border border-gray-300 rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                    style={{ color: 'black' }}
                  />
                </div>
                <div className="flex flex-col mb-2">
                  <label className="font-semibold mb-1">Author</label>
                  <input
                    type="text"
                    value={textAuthor}
                    onChange={e => setTextAuthor(e.target.value)}
                    className="border border-gray-300 rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                    style={{ color: 'black' }}
                  />
                </div>
                <div className="flex flex-col mb-2">
                  <label className="font-semibold mb-1">Text Content</label>
                  <textarea
                    value={textContent}
                    onChange={e => setTextContent(e.target.value)}
                    rows={16}
                    className="border border-gray-300 rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                    style={{ color: 'black', minHeight: 220 }}
                  />
                </div>
                <div className="flex flex-col mb-2">
                  <label className="font-semibold mb-1">Or upload .txt file</label>
                  <label htmlFor="text-upload-input" className="inline-block w-fit px-6 py-2 rounded-lg bg-[#2563eb] text-white font-semibold shadow-sm hover:bg-[#1749b1] transition-colors cursor-pointer text-base mb-2">
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
                  <label className="font-semibold mb-1">Or upload .md file</label>
                  <div className="flex flex-row gap-2">
                    <label htmlFor="md-upload-input" className="inline-block w-fit px-6 py-2 rounded-lg bg-[#2563eb] text-white font-semibold shadow-sm hover:bg-[#1749b1] transition-colors cursor-pointer text-base mb-2">
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
                      className="px-6 py-2 rounded-lg bg-[#2563eb] text-white font-semibold shadow-sm hover:bg-[#1749b1] transition-colors text-base mb-2"
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
                  className="w-full mt-4 py-3 px-4 rounded-lg bg-[#2563eb] text-white font-bold text-base shadow-sm hover:bg-[#1749b1] transition-colors border-none focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40"
                  disabled={textLoading}
                >
                  {textLoading ? 'Adding...' : 'Add Book'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
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
    // In SectionRow, render cards in a horizontal scrollable carousel on mobile, grid on desktop
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640;
    return (
      <div className="mb-16">
        <div className="flex items-center gap-4 mb-6 mt-12">
          <h2 className="text-xl font-bold text-[#2563eb] tracking-tight" style={{ fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif', letterSpacing: '-0.01em', fontWeight: 700 }}>{shelfMap[title] || title}</h2>
          <div className="flex-1 border-t border-gray-200" />
        </div>
        {isMobile ? (
          <div className="flex overflow-x-auto gap-4 snap-x snap-mandatory pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
            {books.length > 0 ? books.map((book) => (
              <div key={book.id} className="snap-center flex-shrink-0 w-[90vw] max-w-xs">
                <BookCard book={book} archived={archived} />
              </div>
            )) : (
              <div className="col-span-full flex flex-col items-center justify-center text-gray-300 italic h-32 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 min-w-[90vw] max-w-xs">
                <span className="text-base text-gray-400">No books in this shelf yet.</span>
              </div>
            )}
          </div>
        ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-6 min-h-[180px]">
          {books.length > 0 ? books.map((book) => (
              <BookCard key={book.id} book={book} archived={archived} />
          )) : (
            <div className="col-span-full flex flex-col items-center justify-center text-gray-300 italic h-32 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
              <span className="text-base text-gray-400">No books in this shelf yet.</span>
            </div>
          )}
        </div>
        )}
      </div>
    );
  }
}
