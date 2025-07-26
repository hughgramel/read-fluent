import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WordService } from '../wordService';
import { writeBatch, doc, setDoc } from 'firebase/firestore';

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  writeBatch: vi.fn(),
}));

describe('WordService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('batchUpdateWords', () => {
    it('should batch update multiple words to known status', async () => {
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn(),
      };
      
      (writeBatch as any).mockReturnValue(mockBatch);
      (doc as any).mockImplementation((db: any, ...pathSegments: any[]) => pathSegments.join('/'));
      
      const uid = 'test-user-id';
      const words = ['hola', 'mundo', 'español'];
      const type = 'known' as const;

      await WordService.batchUpdateWords(uid, words, type);

      // Verify writeBatch was called
      expect(writeBatch).toHaveBeenCalledTimes(1);
      
      // Verify setDoc was called for each word with merge: true
      expect(mockBatch.set).toHaveBeenCalledTimes(3);
      expect(mockBatch.set).toHaveBeenCalledWith('users/test-user-id/words/hola', { type: 'known' }, { merge: true });
      expect(mockBatch.set).toHaveBeenCalledWith('users/test-user-id/words/mundo', { type: 'known' }, { merge: true });
      expect(mockBatch.set).toHaveBeenCalledWith('users/test-user-id/words/español', { type: 'known' }, { merge: true });
      
      // Verify batch commit was called
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    it('should handle empty word array', async () => {
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn(),
      };
      
      (writeBatch as any).mockReturnValue(mockBatch);
      
      const uid = 'test-user-id';
      const words: string[] = [];
      const type = 'known' as const;

      await WordService.batchUpdateWords(uid, words, type);

      // Verify writeBatch was called
      expect(writeBatch).toHaveBeenCalledTimes(1);
      
      // Verify no setDoc calls for empty array
      expect(mockBatch.set).toHaveBeenCalledTimes(0);
      
      // Verify batch commit was called (even for empty array, we still commit)
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    it('should handle different word types', async () => {
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn(),
      };
      
      (writeBatch as any).mockReturnValue(mockBatch);
      (doc as any).mockImplementation((db: any, ...pathSegments: any[]) => pathSegments.join('/'));
      
      const uid = 'test-user-id';
      const words = ['hola', 'mundo'];
      const type = 'tracking' as const;

      await WordService.batchUpdateWords(uid, words, type);

      // Verify setDoc was called with correct type
      expect(mockBatch.set).toHaveBeenCalledWith('users/test-user-id/words/hola', { type: 'tracking' }, { merge: true });
      expect(mockBatch.set).toHaveBeenCalledWith('users/test-user-id/words/mundo', { type: 'tracking' }, { merge: true });
    });

    it('should filter out invalid words', async () => {
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn(),
      };
      
      (writeBatch as any).mockReturnValue(mockBatch);
      (doc as any).mockImplementation((db: any, ...pathSegments: any[]) => pathSegments.join('/'));
      
      const uid = 'test-user-id';
      const words = ['hola', '', '   ', null, undefined, 'mundo'] as any[];
      const type = 'known' as const;

      await WordService.batchUpdateWords(uid, words, type);

      // Verify only valid words were processed
      expect(mockBatch.set).toHaveBeenCalledTimes(2);
      expect(mockBatch.set).toHaveBeenCalledWith('users/test-user-id/words/hola', { type: 'known' }, { merge: true });
      expect(mockBatch.set).toHaveBeenCalledWith('users/test-user-id/words/mundo', { type: 'known' }, { merge: true });
      
      // Verify batch commit was called
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    it('should filter out numeric words', async () => {
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn(),
      };
      
      (writeBatch as any).mockReturnValue(mockBatch);
      (doc as any).mockImplementation((db: any, ...pathSegments: any[]) => pathSegments.join('/'));
      
      const uid = 'test-user-id';
      const words = ['hola', '123', '42.5', '-10', '0', 'mundo'];
      const type = 'known' as const;

      await WordService.batchUpdateWords(uid, words, type);

      // Verify only non-numeric words were processed
      expect(mockBatch.set).toHaveBeenCalledTimes(2);
      expect(mockBatch.set).toHaveBeenCalledWith('users/test-user-id/words/hola', { type: 'known' }, { merge: true });
      expect(mockBatch.set).toHaveBeenCalledWith('users/test-user-id/words/mundo', { type: 'known' }, { merge: true });
      
      // Verify batch commit was called
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateWords', () => {
    it('should batch update existing words', async () => {
      const mockBatch = {
        update: vi.fn(),
        commit: vi.fn(),
      };
      
      (writeBatch as any).mockReturnValue(mockBatch);
      (doc as any).mockImplementation((db: any, ...pathSegments: any[]) => pathSegments.join('/'));
      
      const uid = 'test-user-id';
      const words = ['hola', 'mundo'];
      const type = 'known' as const;

      await WordService.updateWords(uid, words, type);

      // Verify writeBatch was called
      expect(writeBatch).toHaveBeenCalledTimes(1);
      
      // Verify updateDoc was called for each word
      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.update).toHaveBeenCalledWith('users/test-user-id/words/hola', { type: 'known' });
      expect(mockBatch.update).toHaveBeenCalledWith('users/test-user-id/words/mundo', { type: 'known' });
      
      // Verify batch commit was called
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });
  });
}); 