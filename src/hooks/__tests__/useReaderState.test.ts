import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useReaderState } from '../useReaderState';

// Mock the dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/services/epubService', () => ({
  getBooks: vi.fn(() => Promise.resolve([{
    bookId: 'test-book',
    title: 'Test Book',
    downloadURL: 'test-url',
  }])),
  getBookJson: vi.fn(() => Promise.resolve({
    sections: [
      {
        id: 'section-1',
        title: 'Section 1',
        content: 'This is section 1 content. It has multiple sentences. Each sentence should be processed correctly.',
      },
      {
        id: 'section-2', 
        title: 'Section 2',
        content: 'This is section 2 content. It also has multiple sentences.',
      }
    ],
    wordsPerPage: 10,
  })),
  updateBookMetadata: vi.fn(),
}));

vi.mock('@/services/userService', () => ({
  UserService: {
    getUserPreferences: vi.fn(() => Promise.resolve({})),
  },
}));

vi.mock('@/services/wordService', () => ({
  WordService: {
    getWords: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock('@/services/readingSessionService', () => ({
  ReadingSessionService: {
    getBookSessions: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock('@/services/sentenceService', () => ({
  SentenceService: {
    getSentences: vi.fn(() => Promise.resolve([])),
  },
}));

describe('useReaderState - Navigation Logic', () => {
  const mockUser = { uid: 'test-user' };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  it('should navigate to first page when no pages are read', async () => {
    const { result } = renderHook(() => useReaderState(mockUser));

    await waitFor(() => {
      expect(result.current.book).toBeTruthy();
    });

    await waitFor(() => {
      expect(result.current.currentSectionIndex).toBe(0);
      expect(result.current.currentPageIndex).toBe(0);
    });
  });

  it('should navigate to page after last read page', async () => {
    // Mock reading sessions to simulate some pages being read
    const { ReadingSessionService } = await import('@/services/readingSessionService');
    vi.mocked(ReadingSessionService.getBookSessions).mockResolvedValue([
      { 
        sectionId: '0-0', 
        wordCount: 5,
        bookTitle: 'Test Book',
        sectionTitle: 'Section 1',
        timestamp: new Date(),
        userId: 'test-user'
      }, // Section 0, Page 0 is read
      { 
        sectionId: '0-1', 
        wordCount: 5,
        bookTitle: 'Test Book',
        sectionTitle: 'Section 1',
        timestamp: new Date(),
        userId: 'test-user'
      }, // Section 0, Page 1 is read
      { 
        sectionId: '1-0', 
        wordCount: 5,
        bookTitle: 'Test Book',
        sectionTitle: 'Section 2',
        timestamp: new Date(),
        userId: 'test-user'
      }, // Section 1, Page 0 is read
    ]);

    const { result } = renderHook(() => useReaderState(mockUser));

    await waitFor(() => {
      expect(result.current.book).toBeTruthy();
    });

    await waitFor(() => {
      // Should navigate to Section 1, Page 1 (after the last read page)
      expect(result.current.currentSectionIndex).toBe(1);
      expect(result.current.currentPageIndex).toBe(1);
    });
  });

  it('should navigate to next section when current section is complete', async () => {
    // Mock reading sessions to simulate all pages in section 0 being read
    const { ReadingSessionService } = await import('@/services/readingSessionService');
    vi.mocked(ReadingSessionService.getBookSessions).mockResolvedValue([
      { 
        sectionId: '0-0', 
        wordCount: 5,
        bookTitle: 'Test Book',
        sectionTitle: 'Section 1',
        timestamp: new Date(),
        userId: 'test-user'
      }, // Section 0, Page 0 is read
      { 
        sectionId: '0-1', 
        wordCount: 5,
        bookTitle: 'Test Book',
        sectionTitle: 'Section 1',
        timestamp: new Date(),
        userId: 'test-user'
      }, // Section 0, Page 1 is read
      { 
        sectionId: '0-2', 
        wordCount: 5,
        bookTitle: 'Test Book',
        sectionTitle: 'Section 1',
        timestamp: new Date(),
        userId: 'test-user'
      }, // Section 0, Page 2 is read (last page of section)
    ]);

    const { result } = renderHook(() => useReaderState(mockUser));

    await waitFor(() => {
      expect(result.current.book).toBeTruthy();
    });

    await waitFor(() => {
      // Should navigate to Section 1, Page 0 (next section)
      expect(result.current.currentSectionIndex).toBe(1);
      expect(result.current.currentPageIndex).toBe(0);
    });
  });

  it('should stay on last page when all pages are read', async () => {
    // Mock reading sessions to simulate all pages being read
    const { ReadingSessionService } = await import('@/services/readingSessionService');
    vi.mocked(ReadingSessionService.getBookSessions).mockResolvedValue([
      { 
        sectionId: '0-0', 
        wordCount: 5,
        bookTitle: 'Test Book',
        sectionTitle: 'Section 1',
        timestamp: new Date(),
        userId: 'test-user'
      },
      { 
        sectionId: '0-1', 
        wordCount: 5,
        bookTitle: 'Test Book',
        sectionTitle: 'Section 1',
        timestamp: new Date(),
        userId: 'test-user'
      },
      { 
        sectionId: '1-0', 
        wordCount: 5,
        bookTitle: 'Test Book',
        sectionTitle: 'Section 2',
        timestamp: new Date(),
        userId: 'test-user'
      },
      { 
        sectionId: '1-1', 
        wordCount: 5,
        bookTitle: 'Test Book',
        sectionTitle: 'Section 2',
        timestamp: new Date(),
        userId: 'test-user'
      }, // Last page of last section
    ]);

    const { result } = renderHook(() => useReaderState(mockUser));

    await waitFor(() => {
      expect(result.current.book).toBeTruthy();
    });

    await waitFor(() => {
      // Should stay on the last page
      expect(result.current.currentSectionIndex).toBe(1);
      expect(result.current.currentPageIndex).toBe(1);
    });
  });
}); 