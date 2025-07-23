import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  query,
  where,
  orderBy,
  writeBatch,
  runTransaction,
  Timestamp
} from 'firebase/firestore';
import { DeckService } from '../deckService';
import { 
  Deck, 
  DeckSettings, 
  DailyStats, 
  CreateDeckInput, 
  UpdateDeckInput,
  CardServiceError 
} from '../../types/spaced-repetition';
import { DEFAULT_DECK_SETTINGS } from '../../constants/spaced-repetition';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  writeBatch: vi.fn(),
  runTransaction: vi.fn(),
  Timestamp: {
    now: vi.fn(),
    fromDate: vi.fn()
  }
}));

describe('DeckService', () => {
  const mockUserId = 'test-user-123';
  const mockDeckId = 'test-deck-456';
  
  const mockCreateDeckInput: CreateDeckInput = {
    userId: mockUserId,
    name: 'Test Deck',
    description: 'A test deck for learning',
    settings: {
      newCardsPerDay: 15,
      cardsPerBatch: 3,
      graduationThreshold: 2
    }
  };
  
  const mockDeck: Deck = {
    id: mockDeckId,
    userId: mockUserId,
    name: 'Test Deck',
    description: 'A test deck for learning',
    settings: {
      newCardsPerDay: 15,
      cardsPerBatch: 3,
      graduationThreshold: 2
    },
    dailyStats: {
      date: '2024-01-15',
      newCardsStudied: 5,
      reviewsCompleted: 10
    },
    createdAt: new Date('2024-01-01'),
    lastStudied: new Date('2024-01-15'),
    totalCards: 25
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Timestamp methods
    (Timestamp.now as any).mockReturnValue({ 
      toDate: () => new Date('2024-01-15T10:00:00Z') 
    });
    (Timestamp.fromDate as any).mockImplementation((date: Date) => ({
      toDate: () => date
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createDeck', () => {
    it('should create a new deck with default settings', async () => {
      const mockDocRef = { id: mockDeckId };
      (doc as any).mockReturnValue(mockDocRef);
      (setDoc as any).mockResolvedValue(undefined);

      const deckData: CreateDeckInput = {
        userId: mockUserId,
        name: 'New Deck'
      };

      const result = await DeckService.createDeck(deckData);

      expect(result).toBe(mockDeckId);
      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          id: mockDeckId,
          userId: mockUserId,
          name: 'New Deck',
          settings: DEFAULT_DECK_SETTINGS,
          dailyStats: expect.objectContaining({
            date: expect.any(String),
            newCardsStudied: 0,
            reviewsCompleted: 0
          }),
          totalCards: 0
        })
      );
    });

    it('should create a deck with custom settings', async () => {
      const mockDocRef = { id: mockDeckId };
      (doc as any).mockReturnValue(mockDocRef);
      (setDoc as any).mockResolvedValue(undefined);

      const result = await DeckService.createDeck(mockCreateDeckInput);

      expect(result).toBe(mockDeckId);
      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          settings: mockCreateDeckInput.settings
        })
      );
    });

    it('should throw validation error for invalid deck data', async () => {
      const invalidDeckData: CreateDeckInput = {
        userId: '',
        name: ''
      };

      await expect(DeckService.createDeck(invalidDeckData)).rejects.toThrow(CardServiceError);
    });

    it('should throw validation error for deck name too long', async () => {
      const invalidDeckData: CreateDeckInput = {
        userId: mockUserId,
        name: 'a'.repeat(101) // Exceeds MAX_DECK_NAME_LENGTH
      };

      await expect(DeckService.createDeck(invalidDeckData)).rejects.toThrow(CardServiceError);
    });

    it('should handle Firebase errors', async () => {
      (doc as any).mockReturnValue({ id: mockDeckId });
      (setDoc as any).mockRejectedValue(new Error('Firebase error'));

      await expect(DeckService.createDeck(mockCreateDeckInput)).rejects.toThrow(CardServiceError);
    });
  });

  describe('getDeck', () => {
    it('should retrieve an existing deck', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          ...mockDeck,
          createdAt: { toDate: () => mockDeck.createdAt },
          lastStudied: { toDate: () => mockDeck.lastStudied }
        })
      };
      
      (getDoc as any).mockResolvedValue(mockDocSnap);

      const result = await DeckService.getDeck(mockUserId, mockDeckId);

      expect(result).toEqual(mockDeck);
    });

    it('should return null for non-existent deck', async () => {
      const mockDocSnap = {
        exists: () => false
      };
      
      (getDoc as any).mockResolvedValue(mockDocSnap);

      const result = await DeckService.getDeck(mockUserId, mockDeckId);

      expect(result).toBeNull();
    });

    it('should handle Firebase errors', async () => {
      (getDoc as any).mockRejectedValue(new Error('Firebase error'));

      await expect(DeckService.getDeck(mockUserId, mockDeckId)).rejects.toThrow(CardServiceError);
    });
  });

  describe('getUserDecks', () => {
    it('should retrieve all user decks', async () => {
      const mockQuerySnapshot = {
        forEach: vi.fn((callback) => {
          callback({
            data: () => ({
              ...mockDeck,
              createdAt: { toDate: () => mockDeck.createdAt },
              lastStudied: { toDate: () => mockDeck.lastStudied }
            })
          });
        })
      };
      
      (getDocs as any).mockResolvedValue(mockQuerySnapshot);

      const result = await DeckService.getUserDecks(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockDeck);
    });

    it('should return empty array for user with no decks', async () => {
      const mockQuerySnapshot = {
        forEach: vi.fn()
      };
      
      (getDocs as any).mockResolvedValue(mockQuerySnapshot);

      const result = await DeckService.getUserDecks(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('updateDeckSettings', () => {
    it('should update deck settings', async () => {
      const mockDocRef = { id: mockDeckId };
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          ...mockDeck,
          createdAt: { toDate: () => mockDeck.createdAt },
          lastStudied: { toDate: () => mockDeck.lastStudied }
        })
      };
      
      (doc as any).mockReturnValue(mockDocRef);
      (getDoc as any).mockResolvedValue(mockDocSnap);
      (updateDoc as any).mockResolvedValue(undefined);

      const newSettings: Partial<DeckSettings> = {
        newCardsPerDay: 25,
        cardsPerBatch: 8
      };

      await DeckService.updateDeckSettings(mockUserId, mockDeckId, newSettings);

      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        {
          settings: {
            ...mockDeck.settings,
            ...newSettings
          }
        }
      );
    });

    it('should throw error for non-existent deck', async () => {
      const mockDocRef = { id: mockDeckId };
      const mockDocSnap = {
        exists: () => false
      };
      
      (doc as any).mockReturnValue(mockDocRef);
      (getDoc as any).mockResolvedValue(mockDocSnap);

      const newSettings: Partial<DeckSettings> = {
        newCardsPerDay: 25
      };

      await expect(
        DeckService.updateDeckSettings(mockUserId, mockDeckId, newSettings)
      ).rejects.toThrow(CardServiceError);
    });

    it('should validate settings values', async () => {
      const invalidSettings: Partial<DeckSettings> = {
        newCardsPerDay: 150 // Exceeds MAX_NEW_CARDS_PER_DAY
      };

      await expect(
        DeckService.updateDeckSettings(mockUserId, mockDeckId, invalidSettings)
      ).rejects.toThrow(CardServiceError);
    });
  });

  describe('updateDeck', () => {
    it('should update deck information', async () => {
      const mockDocRef = { id: mockDeckId };
      const mockDocSnap = {
        exists: () => true
      };
      
      (doc as any).mockReturnValue(mockDocRef);
      (getDoc as any).mockResolvedValue(mockDocSnap);
      (updateDoc as any).mockResolvedValue(undefined);

      const updates: UpdateDeckInput = {
        name: 'Updated Deck Name',
        description: 'Updated description'
      };

      await DeckService.updateDeck(mockUserId, mockDeckId, updates);

      expect(updateDoc).toHaveBeenCalledWith(mockDocRef, updates);
    });

    it('should throw error for non-existent deck', async () => {
      const mockDocRef = { id: mockDeckId };
      const mockDocSnap = {
        exists: () => false
      };
      
      (doc as any).mockReturnValue(mockDocRef);
      (getDoc as any).mockResolvedValue(mockDocSnap);

      const updates: UpdateDeckInput = {
        name: 'Updated Name'
      };

      await expect(
        DeckService.updateDeck(mockUserId, mockDeckId, updates)
      ).rejects.toThrow(CardServiceError);
    });

    it('should validate update data', async () => {
      const invalidUpdates: UpdateDeckInput = {
        name: '' // Empty name
      };

      await expect(
        DeckService.updateDeck(mockUserId, mockDeckId, invalidUpdates)
      ).rejects.toThrow(CardServiceError);
    });
  });

  describe('deleteDeck', () => {
    it('should delete deck and associated cards', async () => {
      const mockDocSnap = {
        exists: () => true
      };
      
      const mockCardsSnapshot = {
        forEach: vi.fn((callback) => {
          callback({ ref: 'card-ref-1' });
          callback({ ref: 'card-ref-2' });
        })
      };

      const mockTransaction = {
        delete: vi.fn()
      };

      (getDoc as any).mockResolvedValue(mockDocSnap);
      (getDocs as any).mockResolvedValue(mockCardsSnapshot);
      (runTransaction as any).mockImplementation((db, callback) => {
        return callback(mockTransaction);
      });

      await DeckService.deleteDeck(mockUserId, mockDeckId);

      expect(mockTransaction.delete).toHaveBeenCalledTimes(3); // 2 cards + 1 deck
    });

    it('should throw error for non-existent deck', async () => {
      const mockDocSnap = {
        exists: () => false
      };
      
      (getDoc as any).mockResolvedValue(mockDocSnap);

      await expect(
        DeckService.deleteDeck(mockUserId, mockDeckId)
      ).rejects.toThrow(CardServiceError);
    });
  });

  describe('updateDailyStats', () => {
    it('should update daily statistics', async () => {
      const mockDocRef = { id: mockDeckId };
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            ...mockDeck,
            createdAt: { toDate: () => mockDeck.createdAt },
            lastStudied: { toDate: () => mockDeck.lastStudied }
          })
        }),
        update: vi.fn()
      };

      (doc as any).mockReturnValue(mockDocRef);
      (runTransaction as any).mockImplementation((db, callback) => {
        return callback(mockTransaction);
      });

      const statsUpdate: Partial<DailyStats> = {
        newCardsStudied: 8,
        reviewsCompleted: 15
      };

      await DeckService.updateDailyStats(mockUserId, mockDeckId, statsUpdate);

      expect(mockTransaction.update).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          dailyStats: expect.objectContaining(statsUpdate)
        })
      );
    });

    it('should reset stats for new day', async () => {
      const oldDeck = {
        ...mockDeck,
        dailyStats: {
          date: '2024-01-14', // Yesterday
          newCardsStudied: 10,
          reviewsCompleted: 20
        }
      };

      const mockDocRef = { id: mockDeckId };
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            ...oldDeck,
            createdAt: { toDate: () => oldDeck.createdAt },
            lastStudied: { toDate: () => oldDeck.lastStudied }
          })
        }),
        update: vi.fn()
      };

      (doc as any).mockReturnValue(mockDocRef);
      (runTransaction as any).mockImplementation((db, callback) => {
        return callback(mockTransaction);
      });

      const statsUpdate: Partial<DailyStats> = {
        newCardsStudied: 3
      };

      await DeckService.updateDailyStats(mockUserId, mockDeckId, statsUpdate);

      expect(mockTransaction.update).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          dailyStats: expect.objectContaining({
            date: expect.any(String), // Today's date
            newCardsStudied: 3,
            reviewsCompleted: 0 // Reset for new day
          })
        })
      );
    });
  });

  describe('getDailyProgress', () => {
    it('should return current daily stats', async () => {
      const todayDeck = {
        ...mockDeck,
        dailyStats: {
          date: new Date().toISOString().split('T')[0], // Today's date
          newCardsStudied: 5,
          reviewsCompleted: 10
        }
      };
      
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          ...todayDeck,
          createdAt: { toDate: () => todayDeck.createdAt },
          lastStudied: { toDate: () => todayDeck.lastStudied }
        })
      };
      
      (getDoc as any).mockResolvedValue(mockDocSnap);

      const result = await DeckService.getDailyProgress(mockUserId, mockDeckId);

      expect(result).toEqual(todayDeck.dailyStats);
    });

    it('should return reset stats for new day', async () => {
      const oldDeck = {
        ...mockDeck,
        dailyStats: {
          date: '2024-01-14', // Yesterday
          newCardsStudied: 10,
          reviewsCompleted: 20
        }
      };

      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          ...oldDeck,
          createdAt: { toDate: () => oldDeck.createdAt },
          lastStudied: { toDate: () => oldDeck.lastStudied }
        })
      };
      
      (getDoc as any).mockResolvedValue(mockDocSnap);

      const result = await DeckService.getDailyProgress(mockUserId, mockDeckId);

      expect(result).toEqual({
        date: expect.any(String), // Today's date
        newCardsStudied: 0,
        reviewsCompleted: 0
      });
    });

    it('should throw error for non-existent deck', async () => {
      const mockDocSnap = {
        exists: () => false
      };
      
      (getDoc as any).mockResolvedValue(mockDocSnap);

      await expect(
        DeckService.getDailyProgress(mockUserId, mockDeckId)
      ).rejects.toThrow(CardServiceError);
    });
  });

  describe('updateCardCount', () => {
    it('should increment card count', async () => {
      const mockDocRef = { id: mockDeckId };
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            ...mockDeck,
            createdAt: { toDate: () => mockDeck.createdAt },
            lastStudied: { toDate: () => mockDeck.lastStudied }
          })
        }),
        update: vi.fn()
      };

      (doc as any).mockReturnValue(mockDocRef);
      (runTransaction as any).mockImplementation((db, callback) => {
        return callback(mockTransaction);
      });

      await DeckService.updateCardCount(mockUserId, mockDeckId, 3);

      expect(mockTransaction.update).toHaveBeenCalledWith(
        mockDocRef,
        { totalCards: 28 } // 25 + 3
      );
    });

    it('should decrement card count', async () => {
      const mockDocRef = { id: mockDeckId };
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            ...mockDeck,
            createdAt: { toDate: () => mockDeck.createdAt },
            lastStudied: { toDate: () => mockDeck.lastStudied }
          })
        }),
        update: vi.fn()
      };

      (doc as any).mockReturnValue(mockDocRef);
      (runTransaction as any).mockImplementation((db, callback) => {
        return callback(mockTransaction);
      });

      await DeckService.updateCardCount(mockUserId, mockDeckId, -5);

      expect(mockTransaction.update).toHaveBeenCalledWith(
        mockDocRef,
        { totalCards: 20 } // 25 - 5
      );
    });

    it('should not allow negative card count', async () => {
      const mockDocRef = { id: mockDeckId };
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            ...mockDeck,
            totalCards: 5,
            createdAt: { toDate: () => mockDeck.createdAt },
            lastStudied: { toDate: () => mockDeck.lastStudied }
          })
        }),
        update: vi.fn()
      };

      (doc as any).mockReturnValue(mockDocRef);
      (runTransaction as any).mockImplementation((db, callback) => {
        return callback(mockTransaction);
      });

      await DeckService.updateCardCount(mockUserId, mockDeckId, -10);

      expect(mockTransaction.update).toHaveBeenCalledWith(
        mockDocRef,
        { totalCards: 0 } // Max(0, 5 - 10)
      );
    });
  });

  describe('resetDailyStats', () => {
    it('should reset stats for all user decks', async () => {
      const mockDecks = [
        { ...mockDeck, id: 'deck1', dailyStats: { date: '2024-01-14', newCardsStudied: 5, reviewsCompleted: 10 } },
        { ...mockDeck, id: 'deck2', dailyStats: { date: '2024-01-14', newCardsStudied: 3, reviewsCompleted: 7 } }
      ];

      const mockQuerySnapshot = {
        forEach: vi.fn((callback) => {
          mockDecks.forEach(deck => {
            callback({
              data: () => ({
                ...deck,
                createdAt: { toDate: () => deck.createdAt },
                lastStudied: { toDate: () => deck.lastStudied }
              })
            });
          });
        })
      };

      const mockBatch = {
        update: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined)
      };

      (getDocs as any).mockResolvedValue(mockQuerySnapshot);
      (writeBatch as any).mockReturnValue(mockBatch);

      await DeckService.resetDailyStats(mockUserId);

      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should not update decks with current date', async () => {
      const mockDecks = [
        { ...mockDeck, id: 'deck1', dailyStats: { date: new Date().toISOString().split('T')[0], newCardsStudied: 5, reviewsCompleted: 10 } }
      ];

      const mockQuerySnapshot = {
        forEach: vi.fn((callback) => {
          mockDecks.forEach(deck => {
            callback({
              data: () => ({
                ...deck,
                createdAt: { toDate: () => deck.createdAt },
                lastStudied: { toDate: () => deck.lastStudied }
              })
            });
          });
        })
      };

      const mockBatch = {
        update: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined)
      };

      (getDocs as any).mockResolvedValue(mockQuerySnapshot);
      (writeBatch as any).mockReturnValue(mockBatch);

      await DeckService.resetDailyStats(mockUserId);

      expect(mockBatch.update).not.toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });
});