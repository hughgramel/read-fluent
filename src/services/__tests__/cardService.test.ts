import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit,
  Timestamp,
  runTransaction,
  DocumentSnapshot,
  QuerySnapshot,
  DocumentReference
} from 'firebase/firestore';
import { CardService } from '../cardService';
import { 
  Card, 
  SentenceCard, 
  CreateCardInput, 
  CreateSentenceCardInput,
  CardServiceError 
} from '../../types/spaced-repetition';
import { CARD_TYPES, MIN_STAGE, MAX_STAGE } from '../../constants/spaced-repetition';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  Timestamp: {
    now: vi.fn(),
    fromDate: vi.fn()
  },
  runTransaction: vi.fn()
}));

describe('CardService', () => {
  const mockUserId = 'test-user-id';
  const mockDeckId = 'test-deck-id';
  const mockCardId = 'test-card-id';
  
  const mockBasicCard: Card = {
    id: mockCardId,
    deckId: mockDeckId,
    userId: mockUserId,
    front: 'Test Front',
    back: 'Test Back',
    type: 'basic',
    stage: -6,
    nextReview: new Date('2024-01-15'),
    relearning: false,
    isNew: false,
    correctCount: 0,
    createdAt: new Date('2024-01-01'),
    lastReviewed: new Date('2024-01-10'),
    totalReviews: 5
  };
  
  const mockSentenceCard: SentenceCard = {
    ...mockBasicCard,
    type: 'sentence',
    translation: 'Test Translation'
  };
  
  const mockNewCard: Card = {
    ...mockBasicCard,
    isNew: true,
    correctCount: 2
    // lastReviewed is optional and will be undefined, which is fine for the test
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    (getFirestore as Mock).mockReturnValue({});
    (collection as Mock).mockReturnValue({});
    (doc as Mock).mockReturnValue({ id: mockCardId });
    (query as Mock).mockReturnValue({});
    (where as Mock).mockReturnValue({});
    (orderBy as Mock).mockReturnValue({});
    (limit as Mock).mockReturnValue({});
    (Timestamp.now as Mock).mockReturnValue({ toDate: () => new Date() });
    (Timestamp.fromDate as Mock).mockImplementation((date: Date) => ({
      toDate: () => date
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createCard', () => {
    it('should create a basic card successfully', async () => {
      const createCardInput: CreateCardInput = {
        deckId: mockDeckId,
        userId: mockUserId,
        front: 'New Front',
        back: 'New Back',
        type: 'basic',
        stage: -7,
        nextReview: new Date(),
        relearning: false,
        isNew: true,
        correctCount: 0
      };

      (setDoc as Mock).mockResolvedValue(undefined);

      const cardId = await CardService.createCard(createCardInput);

      expect(cardId).toBe(mockCardId);
      expect(setDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          ...createCardInput,
          id: mockCardId,
          totalReviews: 0,
          createdAt: expect.any(Object), // Timestamp object
          nextReview: expect.any(Object) // Timestamp object
        })
      );
    });

    it('should create a sentence card successfully', async () => {
      const createSentenceCardInput: CreateSentenceCardInput = {
        deckId: mockDeckId,
        userId: mockUserId,
        front: 'New Front',
        back: 'New Back',
        translation: 'New Translation',
        type: 'sentence',
        stage: -7,
        nextReview: new Date(),
        relearning: false,
        isNew: true,
        correctCount: 0
      };

      (setDoc as Mock).mockResolvedValue(undefined);

      const cardId = await CardService.createCard(createSentenceCardInput);

      expect(cardId).toBe(mockCardId);
      expect(setDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          ...createSentenceCardInput,
          id: mockCardId,
          totalReviews: 0,
          createdAt: expect.any(Object), // Timestamp object
          nextReview: expect.any(Object) // Timestamp object
        })
      );
    });

    it('should throw validation error for missing required fields', async () => {
      const invalidCardInput = {
        deckId: mockDeckId,
        // Missing userId
        front: 'Front',
        back: 'Back',
        type: 'basic' as const,
        stage: -7,
        nextReview: new Date(),
        relearning: false,
        isNew: true,
        correctCount: 0
      };

      await expect(CardService.createCard(invalidCardInput as CreateCardInput))
        .rejects.toThrow(CardServiceError);
    });

    it('should throw validation error for invalid card type', async () => {
      const invalidCardInput: CreateCardInput = {
        deckId: mockDeckId,
        userId: mockUserId,
        front: 'Front',
        back: 'Back',
        type: 'invalid' as any,
        stage: -7,
        nextReview: new Date(),
        relearning: false,
        isNew: true,
        correctCount: 0
      };

      await expect(CardService.createCard(invalidCardInput))
        .rejects.toThrow(CardServiceError);
    });

    it('should throw validation error for content too long', async () => {
      const longContent = 'a'.repeat(5001);
      const invalidCardInput: CreateCardInput = {
        deckId: mockDeckId,
        userId: mockUserId,
        front: longContent,
        back: 'Back',
        type: 'basic',
        stage: -7,
        nextReview: new Date(),
        relearning: false,
        isNew: true,
        correctCount: 0
      };

      await expect(CardService.createCard(invalidCardInput))
        .rejects.toThrow(CardServiceError);
    });

    it('should handle Firebase errors', async () => {
      const createCardInput: CreateCardInput = {
        deckId: mockDeckId,
        userId: mockUserId,
        front: 'Front',
        back: 'Back',
        type: 'basic',
        stage: -7,
        nextReview: new Date(),
        relearning: false,
        isNew: true,
        correctCount: 0
      };

      (setDoc as Mock).mockRejectedValue(new Error('Firebase error'));

      await expect(CardService.createCard(createCardInput))
        .rejects.toThrow(CardServiceError);
    });
  });

  describe('getCard', () => {
    it('should retrieve a card successfully', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          ...mockBasicCard,
          createdAt: { toDate: () => mockBasicCard.createdAt },
          lastReviewed: { toDate: () => mockBasicCard.lastReviewed },
          nextReview: { toDate: () => mockBasicCard.nextReview }
        })
      };

      (getDoc as Mock).mockResolvedValue(mockDocSnap);

      const card = await CardService.getCard(mockUserId, mockCardId);

      expect(card).toEqual(mockBasicCard);
      expect(getDoc).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should return null for non-existent card', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      (getDoc as Mock).mockResolvedValue(mockDocSnap);

      const card = await CardService.getCard(mockUserId, mockCardId);

      expect(card).toBeNull();
    });

    it('should handle Firebase errors', async () => {
      (getDoc as Mock).mockRejectedValue(new Error('Firebase error'));

      await expect(CardService.getCard(mockUserId, mockCardId))
        .rejects.toThrow(CardServiceError);
    });
  });

  describe('updateCard', () => {
    it('should update a card successfully', async () => {
      const mockDocSnap = {
        exists: () => true
      };
      const updates = { front: 'Updated Front', back: 'Updated Back' };

      (getDoc as Mock).mockResolvedValue(mockDocSnap);
      (updateDoc as Mock).mockResolvedValue(undefined);

      await CardService.updateCard(mockUserId, mockCardId, updates);

      expect(getDoc).toHaveBeenCalledWith(expect.any(Object));
      expect(updateDoc).toHaveBeenCalledWith(expect.any(Object), updates);
    });

    it('should throw error for non-existent card', async () => {
      const mockDocSnap = {
        exists: () => false
      };
      const updates = { front: 'Updated Front' };

      (getDoc as Mock).mockResolvedValue(mockDocSnap);

      await expect(CardService.updateCard(mockUserId, mockCardId, updates))
        .rejects.toThrow(CardServiceError);
    });

    it('should validate update data', async () => {
      const longContent = 'a'.repeat(5001);
      const invalidUpdates = { front: longContent };

      await expect(CardService.updateCard(mockUserId, mockCardId, invalidUpdates))
        .rejects.toThrow(CardServiceError);
    });
  });

  describe('deleteCard', () => {
    it('should delete a card successfully', async () => {
      const mockDocSnap = {
        exists: () => true
      };

      (getDoc as Mock).mockResolvedValue(mockDocSnap);
      (deleteDoc as Mock).mockResolvedValue(undefined);

      await CardService.deleteCard(mockUserId, mockCardId);

      expect(getDoc).toHaveBeenCalledWith(expect.any(Object));
      expect(deleteDoc).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should throw error for non-existent card', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      (getDoc as Mock).mockResolvedValue(mockDocSnap);

      await expect(CardService.deleteCard(mockUserId, mockCardId))
        .rejects.toThrow(CardServiceError);
    });
  });

  describe('getCardsByDeck', () => {
    it('should retrieve cards by deck successfully', async () => {
      const mockQuerySnapshot = {
        forEach: (callback: (doc: any) => void) => {
          callback({
            data: () => ({
              ...mockBasicCard,
              createdAt: { toDate: () => mockBasicCard.createdAt },
              lastReviewed: { toDate: () => mockBasicCard.lastReviewed },
              nextReview: { toDate: () => mockBasicCard.nextReview }
            })
          });
        }
      };

      (getDocs as Mock).mockResolvedValue(mockQuerySnapshot);

      const cards = await CardService.getCardsByDeck(mockUserId, mockDeckId);

      expect(cards).toHaveLength(1);
      expect(cards[0]).toEqual(mockBasicCard);
      expect(query).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object), // where clause
        expect.any(Object)  // orderBy clause
      );
    });

    it('should return empty array for deck with no cards', async () => {
      const mockQuerySnapshot = {
        forEach: () => {}
      };

      (getDocs as Mock).mockResolvedValue(mockQuerySnapshot);

      const cards = await CardService.getCardsByDeck(mockUserId, mockDeckId);

      expect(cards).toHaveLength(0);
    });
  });

  describe('getDueCards', () => {
    it('should retrieve due cards successfully', async () => {
      const mockQuerySnapshot = {
        forEach: (callback: (doc: any) => void) => {
          callback({
            id: mockCardId,
            data: () => ({
              ...mockBasicCard,
              createdAt: { toDate: () => mockBasicCard.createdAt },
              lastReviewed: { toDate: () => mockBasicCard.lastReviewed },
              nextReview: { toDate: () => mockBasicCard.nextReview }
            })
          });
        }
      };

      const mockEmptySnapshot = {
        forEach: () => {}
      };

      (getDocs as Mock)
        .mockResolvedValueOnce(mockQuerySnapshot) // due cards query
        .mockResolvedValueOnce(mockEmptySnapshot); // relearning cards query

      const dueCards = await CardService.getDueCards(mockUserId, mockDeckId);

      expect(dueCards).toHaveLength(1);
      expect(dueCards[0]).toEqual(mockBasicCard);
      expect(getDocs).toHaveBeenCalledTimes(2); // Two queries: due and relearning
    });

    it('should handle relearning cards', async () => {
      const relearningCard = { ...mockBasicCard, relearning: true };
      
      const mockEmptySnapshot = {
        forEach: () => {}
      };

      const mockRelearningSnapshot = {
        forEach: (callback: (doc: any) => void) => {
          callback({
            id: mockCardId,
            data: () => ({
              ...relearningCard,
              createdAt: { toDate: () => relearningCard.createdAt },
              lastReviewed: { toDate: () => relearningCard.lastReviewed },
              nextReview: { toDate: () => relearningCard.nextReview }
            })
          });
        }
      };

      (getDocs as Mock)
        .mockResolvedValueOnce(mockEmptySnapshot) // due cards query
        .mockResolvedValueOnce(mockRelearningSnapshot); // relearning cards query

      const dueCards = await CardService.getDueCards(mockUserId, mockDeckId);

      expect(dueCards).toHaveLength(1);
      expect(dueCards[0].relearning).toBe(true);
    });
  });

  describe('getNewCards', () => {
    it('should retrieve new cards with limit', async () => {
      const mockQuerySnapshot = {
        forEach: (callback: (doc: any) => void) => {
          callback({
            data: () => ({
              ...mockNewCard,
              createdAt: { toDate: () => mockNewCard.createdAt },
              nextReview: { toDate: () => mockNewCard.nextReview }
            })
          });
        }
      };

      (getDocs as Mock).mockResolvedValue(mockQuerySnapshot);

      const newCards = await CardService.getNewCards(mockUserId, mockDeckId, 5);

      expect(newCards).toHaveLength(1);
      expect(newCards[0].isNew).toBe(true);
      expect(limit).toHaveBeenCalledWith(5);
    });
  });

  describe('processCorrectAnswer', () => {
    it('should process correct answer for new card', async () => {
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            ...mockNewCard,
            createdAt: { toDate: () => mockNewCard.createdAt },
            nextReview: { toDate: () => mockNewCard.nextReview }
          })
        }),
        update: vi.fn()
      };

      (runTransaction as Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction);
      });

      await CardService.processCorrectAnswer(mockUserId, mockCardId);

      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          correctCount: mockNewCard.correctCount + 1,
          totalReviews: mockNewCard.totalReviews + 1
        })
      );
    });

    it('should process correct answer for review card', async () => {
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            ...mockBasicCard,
            createdAt: { toDate: () => mockBasicCard.createdAt },
            lastReviewed: { toDate: () => mockBasicCard.lastReviewed },
            nextReview: { toDate: () => mockBasicCard.nextReview }
          })
        }),
        update: vi.fn()
      };

      (runTransaction as Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction);
      });

      await CardService.processCorrectAnswer(mockUserId, mockCardId);

      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          stage: mockBasicCard.stage + 1,
          relearning: false,
          totalReviews: mockBasicCard.totalReviews + 1
        })
      );
    });

    it('should throw error for non-existent card', async () => {
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => false
        })
      };

      (runTransaction as Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction);
      });

      await expect(CardService.processCorrectAnswer(mockUserId, mockCardId))
        .rejects.toThrow(CardServiceError);
    });
  });

  describe('processIncorrectAnswer', () => {
    it('should process incorrect answer for new card', async () => {
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            ...mockNewCard,
            createdAt: { toDate: () => mockNewCard.createdAt },
            nextReview: { toDate: () => mockNewCard.nextReview }
          })
        }),
        update: vi.fn()
      };

      (runTransaction as Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction);
      });

      await CardService.processIncorrectAnswer(mockUserId, mockCardId);

      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          correctCount: 0,
          totalReviews: mockNewCard.totalReviews + 1
        })
      );
    });

    it('should process incorrect answer for review card', async () => {
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            ...mockBasicCard,
            createdAt: { toDate: () => mockBasicCard.createdAt },
            lastReviewed: { toDate: () => mockBasicCard.lastReviewed },
            nextReview: { toDate: () => mockBasicCard.nextReview }
          })
        }),
        update: vi.fn()
      };

      (runTransaction as Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction);
      });

      await CardService.processIncorrectAnswer(mockUserId, mockCardId);

      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          stage: MIN_STAGE,
          relearning: true,
          totalReviews: mockBasicCard.totalReviews + 1
        })
      );
    });
  });

  describe('graduateNewCard', () => {
    it('should graduate a new card successfully', async () => {
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            ...mockNewCard,
            createdAt: { toDate: () => mockNewCard.createdAt },
            nextReview: { toDate: () => mockNewCard.nextReview }
          })
        }),
        update: vi.fn()
      };

      (runTransaction as Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction);
      });

      await CardService.graduateNewCard(mockUserId, mockCardId);

      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          isNew: false,
          stage: MIN_STAGE + 1,
          correctCount: 0,
          relearning: false
        })
      );
    });

    it('should throw error for non-new card', async () => {
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            ...mockBasicCard, // Not a new card
            createdAt: { toDate: () => mockBasicCard.createdAt },
            lastReviewed: { toDate: () => mockBasicCard.lastReviewed },
            nextReview: { toDate: () => mockBasicCard.nextReview }
          })
        })
      };

      (runTransaction as Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction);
      });

      await expect(CardService.graduateNewCard(mockUserId, mockCardId))
        .rejects.toThrow(CardServiceError);
    });
  });
});