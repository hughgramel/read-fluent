import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
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
  runTransaction
} from 'firebase/firestore';
import { CardService } from '../cardService';
import { ReviewEngine } from '../reviewEngine';
import { DeckService } from '../deckService';
import { 
  Card, 
  SentenceCard, 
  Deck,
  StudySession,
  CardServiceError 
} from '../../types/spaced-repetition';
import { 
  MIN_STAGE, 
  MAX_STAGE, 
  STAGE_INTERVALS,
  DEFAULT_DECK_SETTINGS 
} from '../../constants/spaced-repetition';

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

// Mock DeckService
vi.mock('../deckService');
const mockDeckService = DeckService as any;

describe('Answer Processing Integration Tests', () => {
  const mockUserId = 'test-user-id';
  const mockDeckId = 'test-deck-id';
  const mockCardId = 'test-card-id';
  const mockNewCardId = 'test-new-card-id';
  
  const mockDeck: Deck = {
    id: mockDeckId,
    userId: mockUserId,
    name: 'Test Deck',
    settings: {
      newCardsPerDay: 20,
      cardsPerBatch: 5,
      graduationThreshold: 3
    },
    dailyStats: {
      date: '2025-01-23',
      newCardsStudied: 5,
      reviewsCompleted: 10
    },
    createdAt: new Date('2024-01-01'),
    totalCards: 50
  };
  
  const mockReviewCard: Card = {
    id: mockCardId,
    deckId: mockDeckId,
    userId: mockUserId,
    front: 'Test Front',
    back: 'Test Back',
    type: 'basic',
    stage: -5,
    nextReview: new Date('2024-01-15'),
    relearning: false,
    isNew: false,
    correctCount: 0,
    createdAt: new Date('2024-01-01'),
    lastReviewed: new Date('2024-01-10'),
    totalReviews: 5
  };
  
  const mockNewCard: Card = {
    id: mockNewCardId,
    deckId: mockDeckId,
    userId: mockUserId,
    front: 'New Card Front',
    back: 'New Card Back',
    type: 'basic',
    stage: -7,
    nextReview: new Date(),
    relearning: false,
    isNew: true,
    correctCount: 2, // Close to graduation threshold of 3
    createdAt: new Date('2024-01-20'),
    totalReviews: 2
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    (getFirestore as Mock).mockReturnValue({});
    (collection as Mock).mockReturnValue({});
    (doc as Mock).mockReturnValue({ id: mockCardId });
    (Timestamp.now as Mock).mockReturnValue({ toDate: () => new Date() });
    (Timestamp.fromDate as Mock).mockImplementation((date: Date) => ({
      toDate: () => date
    }));
    
    // Setup DeckService mocks
    mockDeckService.getDeck.mockResolvedValue(mockDeck);
    mockDeckService.getDailyProgress.mockResolvedValue(mockDeck.dailyStats);
    mockDeckService.updateDailyStats.mockResolvedValue(undefined);
  });

  describe('processCorrectAnswer', () => {
    describe('Review Cards', () => {
      it('should process correct answer for review card and advance stage', async () => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              ...mockReviewCard,
              createdAt: { toDate: () => mockReviewCard.createdAt },
              lastReviewed: { toDate: () => mockReviewCard.lastReviewed },
              nextReview: { toDate: () => mockReviewCard.nextReview }
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
            stage: mockReviewCard.stage + 1, // -5 -> -4
            relearning: false,
            totalReviews: mockReviewCard.totalReviews + 1
          })
        );
      });

      it('should not exceed maximum stage for review cards', async () => {
        const maxStageCard = { ...mockReviewCard, stage: MAX_STAGE };
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              ...maxStageCard,
              createdAt: { toDate: () => maxStageCard.createdAt },
              lastReviewed: { toDate: () => maxStageCard.lastReviewed },
              nextReview: { toDate: () => maxStageCard.nextReview }
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
            stage: MAX_STAGE, // Should remain at -1
            relearning: false
          })
        );
      });

      it('should clear relearning flag for review cards', async () => {
        const relearningCard = { ...mockReviewCard, relearning: true };
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              ...relearningCard,
              createdAt: { toDate: () => relearningCard.createdAt },
              lastReviewed: { toDate: () => relearningCard.lastReviewed },
              nextReview: { toDate: () => relearningCard.nextReview }
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
            relearning: false
          })
        );
      });
    });

    describe('New Cards', () => {
      it('should increment correct count for new cards', async () => {
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

        await CardService.processCorrectAnswer(mockUserId, mockNewCardId);

        expect(mockTransaction.update).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            correctCount: mockNewCard.correctCount + 1, // 2 -> 3
            totalReviews: mockNewCard.totalReviews + 1
          })
        );
      });

      it('should not change stage for new cards until graduation', async () => {
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

        await CardService.processCorrectAnswer(mockUserId, mockNewCardId);

        // Should not update stage field for new cards
        expect(mockTransaction.update).not.toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            stage: expect.any(Number)
          })
        );
      });
    });

    describe('Error Handling', () => {
      it('should throw error for non-existent card', async () => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => false
          })
        };

        (runTransaction as Mock).mockImplementation(async (db, callback) => {
          return await callback(mockTransaction);
        });

        await expect(CardService.processCorrectAnswer(mockUserId, 'nonexistent'))
          .rejects.toThrow(CardServiceError);
      });

      it('should validate required parameters', async () => {
        await expect(CardService.processCorrectAnswer('', mockCardId))
          .rejects.toThrow(CardServiceError);
        
        await expect(CardService.processCorrectAnswer(mockUserId, ''))
          .rejects.toThrow(CardServiceError);
      });

      it('should handle invalid stage values', async () => {
        const invalidStageCard = { ...mockReviewCard, stage: -10 };
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              ...invalidStageCard,
              createdAt: { toDate: () => invalidStageCard.createdAt },
              lastReviewed: { toDate: () => invalidStageCard.lastReviewed },
              nextReview: { toDate: () => invalidStageCard.nextReview }
            })
          })
        };

        (runTransaction as Mock).mockImplementation(async (db, callback) => {
          return await callback(mockTransaction);
        });

        await expect(CardService.processCorrectAnswer(mockUserId, mockCardId))
          .rejects.toThrow(CardServiceError);
      });
    });
  });

  describe('processIncorrectAnswer', () => {
    describe('Review Cards', () => {
      it('should reset stage to minimum and set relearning flag', async () => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              ...mockReviewCard,
              createdAt: { toDate: () => mockReviewCard.createdAt },
              lastReviewed: { toDate: () => mockReviewCard.lastReviewed },
              nextReview: { toDate: () => mockReviewCard.nextReview }
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
            stage: MIN_STAGE, // Reset to -7
            relearning: true,
            totalReviews: mockReviewCard.totalReviews + 1
          })
        );
      });

      it('should handle already relearning cards', async () => {
        const relearningCard = { ...mockReviewCard, relearning: true, stage: MIN_STAGE };
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              ...relearningCard,
              createdAt: { toDate: () => relearningCard.createdAt },
              lastReviewed: { toDate: () => relearningCard.lastReviewed },
              nextReview: { toDate: () => relearningCard.nextReview }
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
            relearning: true
          })
        );
      });
    });

    describe('New Cards', () => {
      it('should reset correct count to zero for new cards', async () => {
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

        await CardService.processIncorrectAnswer(mockUserId, mockNewCardId);

        expect(mockTransaction.update).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            correctCount: 0, // Reset from 2 to 0
            totalReviews: mockNewCard.totalReviews + 1
          })
        );
      });

      it('should not set relearning flag for new cards', async () => {
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

        await CardService.processIncorrectAnswer(mockUserId, mockNewCardId);

        // Should not update relearning field for new cards
        expect(mockTransaction.update).not.toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            relearning: expect.any(Boolean)
          })
        );
      });
    });

    describe('Error Handling', () => {
      it('should validate required parameters', async () => {
        await expect(CardService.processIncorrectAnswer('', mockCardId))
          .rejects.toThrow(CardServiceError);
        
        await expect(CardService.processIncorrectAnswer(mockUserId, ''))
          .rejects.toThrow(CardServiceError);
      });

      it('should handle Firebase transaction errors', async () => {
        (runTransaction as Mock).mockRejectedValue(new Error('Transaction failed'));

        await expect(CardService.processIncorrectAnswer(mockUserId, mockCardId))
          .rejects.toThrow(CardServiceError);
      });
    });
  });

  describe('graduateNewCard', () => {
    it('should graduate new card to review status', async () => {
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

      await CardService.graduateNewCard(mockUserId, mockNewCardId);

      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          isNew: false,
          stage: MIN_STAGE + 1, // -6 for first review stage
          correctCount: 0, // Reset for review tracking
          relearning: false
        })
      );
    });

    it('should throw error for non-new cards', async () => {
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            ...mockReviewCard, // Not a new card
            createdAt: { toDate: () => mockReviewCard.createdAt },
            lastReviewed: { toDate: () => mockReviewCard.lastReviewed },
            nextReview: { toDate: () => mockReviewCard.nextReview }
          })
        })
      };

      (runTransaction as Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction);
      });

      await expect(CardService.graduateNewCard(mockUserId, mockCardId))
        .rejects.toThrow(CardServiceError);
    });

    it('should validate card state before graduation', async () => {
      const invalidNewCard = { ...mockNewCard, stage: -10 };
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            ...invalidNewCard,
            createdAt: { toDate: () => invalidNewCard.createdAt },
            nextReview: { toDate: () => invalidNewCard.nextReview }
          })
        })
      };

      (runTransaction as Mock).mockImplementation(async (db, callback) => {
        return await callback(mockTransaction);
      });

      await expect(CardService.graduateNewCard(mockUserId, mockNewCardId))
        .rejects.toThrow(CardServiceError);
    });
  });

  describe('Integration with ReviewEngine', () => {
    let mockSession: StudySession;

    beforeEach(() => {
      mockSession = {
        id: 'session123',
        userId: mockUserId,
        startTime: new Date(),
        reviewQueue: [mockReviewCard],
        newCardBatches: [[mockNewCard]],
        currentBatchIndex: 0,
        currentCardIndex: 0,
        isActive: true,
        sessionType: 'mixed'
      };

      // Mock CardService methods
      vi.spyOn(CardService, 'getCard').mockResolvedValue(mockReviewCard);
      vi.spyOn(CardService, 'processCorrectAnswer').mockResolvedValue(undefined);
      vi.spyOn(CardService, 'processIncorrectAnswer').mockResolvedValue(undefined);
      vi.spyOn(CardService, 'updateCard').mockResolvedValue(undefined);
      vi.spyOn(CardService, 'graduateNewCard').mockResolvedValue(undefined);
      
      // Mock ReviewEngine private methods
      vi.spyOn(ReviewEngine as any, 'calculateNextReviewDate').mockResolvedValue(new Date());
    });

    it('should process correct answer through ReviewEngine', async () => {
      await ReviewEngine.processAnswer(mockSession, mockCardId, true);

      expect(CardService.processCorrectAnswer).toHaveBeenCalledWith(mockUserId, mockCardId);
      expect(CardService.updateCard).toHaveBeenCalledWith(
        mockUserId,
        mockCardId,
        expect.objectContaining({
          stage: mockReviewCard.stage + 1,
          relearning: false
        })
      );
    });

    it('should process incorrect answer and reinsert card into queue', async () => {
      const initialQueueLength = mockSession.reviewQueue.length;
      
      await ReviewEngine.processAnswer(mockSession, mockCardId, false);

      expect(CardService.processIncorrectAnswer).toHaveBeenCalledWith(mockUserId, mockCardId);
      expect(mockSession.reviewQueue.length).toBeGreaterThan(initialQueueLength);
    });

    it('should graduate new card when threshold is reached', async () => {
      const graduatingCard = { ...mockNewCard, correctCount: 2 }; // Will reach threshold of 3
      vi.spyOn(CardService, 'getCard').mockResolvedValue(graduatingCard);
      vi.spyOn(CardService, 'getNewCards').mockResolvedValue([]); // Mock to avoid Firebase call

      await ReviewEngine.processAnswer(mockSession, mockNewCardId, true);

      expect(CardService.graduateNewCard).toHaveBeenCalledWith(mockUserId, mockNewCardId);
      expect(mockDeckService.updateDailyStats).toHaveBeenCalled();
    });

    it('should handle card not found error', async () => {
      vi.spyOn(CardService, 'getCard').mockResolvedValue(null);

      await expect(ReviewEngine.processAnswer(mockSession, 'nonexistent', true))
        .rejects.toThrow(CardServiceError);
    });

    it('should advance session position after processing answer', async () => {
      const initialIndex = mockSession.currentCardIndex;
      
      await ReviewEngine.processAnswer(mockSession, mockCardId, true);

      expect(mockSession.currentCardIndex).toBe(initialIndex + 1);
    });
  });

  describe('Queue Management', () => {
    it('should shuffle failed card back into queue at random position', () => {
      const queue = Array.from({ length: 10 }, (_, i) => ({
        ...mockReviewCard,
        id: `card${i}`
      }));
      
      const failedCard = { ...mockReviewCard, id: 'failed_card' };
      const currentPosition = 3;
      
      const newQueue = ReviewEngine.shuffleCardIntoQueue(failedCard, queue, currentPosition);
      
      expect(newQueue).toHaveLength(11);
      expect(newQueue).toContain(failedCard);
      
      // Card should be inserted after current position
      const insertIndex = newQueue.findIndex(card => card.id === 'failed_card');
      expect(insertIndex).toBeGreaterThan(currentPosition);
    });

    it('should handle queue insertion at end', () => {
      const queue = [mockReviewCard];
      const failedCard = { ...mockReviewCard, id: 'failed_card' };
      const currentPosition = 0;
      
      const newQueue = ReviewEngine.shuffleCardIntoQueue(failedCard, queue, currentPosition);
      
      expect(newQueue).toHaveLength(2);
      expect(newQueue[1]).toEqual(failedCard);
    });
  });

  describe('New Card Batch Management', () => {
    let mockSession: StudySession;

    beforeEach(() => {
      mockSession = {
        id: 'session123',
        userId: mockUserId,
        startTime: new Date(),
        reviewQueue: [],
        newCardBatches: [[mockNewCard, { ...mockNewCard, id: 'card2' }, { ...mockNewCard, id: 'card3' }]],
        currentBatchIndex: 0,
        currentCardIndex: 0, // Starting with new cards (no review queue)
        isActive: true,
        sessionType: 'new-cards'
      };

      // Mock CardService methods
      vi.spyOn(CardService, 'getCard').mockResolvedValue(mockNewCard);
      vi.spyOn(CardService, 'processCorrectAnswer').mockResolvedValue(undefined);
      vi.spyOn(CardService, 'processIncorrectAnswer').mockResolvedValue(undefined);
      vi.spyOn(CardService, 'updateCard').mockResolvedValue(undefined);
      vi.spyOn(CardService, 'graduateNewCard').mockResolvedValue(undefined);
      vi.spyOn(CardService, 'getNewCards').mockResolvedValue([]);
      
      // Mock ReviewEngine private methods
      vi.spyOn(ReviewEngine as any, 'calculateNextReviewDate').mockResolvedValue(new Date());
    });

    it('should shuffle failed new card back into batch', async () => {
      const initialBatchLength = mockSession.newCardBatches[0].length;
      
      await ReviewEngine.processAnswer(mockSession, mockNewCardId, false);

      // Batch should now have one more card (the failed card shuffled back in)
      expect(mockSession.newCardBatches[0].length).toBe(initialBatchLength + 1);
      
      // Session should advance position after processing incorrect answer
      expect(mockSession.currentCardIndex).toBe(1);
    });

    it('should not shuffle correct new cards back into batch', async () => {
      // Use a card that won't graduate (correctCount: 0, needs 3 to graduate)
      const nonGraduatingCard = { ...mockNewCard, correctCount: 0 };
      vi.spyOn(CardService, 'getCard').mockResolvedValue(nonGraduatingCard);
      
      const initialBatchLength = mockSession.newCardBatches[0].length;
      
      await ReviewEngine.processAnswer(mockSession, mockNewCardId, true);

      // Batch length should remain the same for correct answers that don't graduate
      expect(mockSession.newCardBatches[0].length).toBe(initialBatchLength);
      
      // Session should advance to next position (card doesn't graduate)
      expect(mockSession.currentCardIndex).toBe(1);
    });

    it('should handle new card graduation and maintain batch flow', async () => {
      const graduatingCard = { ...mockNewCard, correctCount: 2 }; // Will reach threshold of 3
      vi.spyOn(CardService, 'getCard').mockResolvedValue(graduatingCard);

      const initialBatchLength = mockSession.newCardBatches[0].length;
      
      await ReviewEngine.processAnswer(mockSession, mockNewCardId, true);

      expect(CardService.graduateNewCard).toHaveBeenCalledWith(mockUserId, mockNewCardId);
      expect(mockDeckService.updateDailyStats).toHaveBeenCalled();
      
      // Session should NOT advance for graduated cards (card is removed from batch)
      expect(mockSession.currentCardIndex).toBe(0);
    });
  });

  describe('Daily Statistics Integration', () => {
    let mockSession: StudySession;

    beforeEach(() => {
      mockSession = {
        id: 'session123',
        userId: mockUserId,
        startTime: new Date(),
        reviewQueue: [mockReviewCard],
        newCardBatches: [[mockNewCard]],
        currentBatchIndex: 0,
        currentCardIndex: 0,
        isActive: true,
        sessionType: 'mixed'
      };

      // Mock CardService methods
      vi.spyOn(CardService, 'getCard').mockResolvedValue(mockReviewCard);
      vi.spyOn(CardService, 'processCorrectAnswer').mockResolvedValue(undefined);
      vi.spyOn(CardService, 'processIncorrectAnswer').mockResolvedValue(undefined);
      vi.spyOn(CardService, 'updateCard').mockResolvedValue(undefined);
      vi.spyOn(CardService, 'graduateNewCard').mockResolvedValue(undefined);
      vi.spyOn(CardService, 'getNewCards').mockResolvedValue([]);
      
      // Mock ReviewEngine private methods
      vi.spyOn(ReviewEngine as any, 'calculateNextReviewDate').mockResolvedValue(new Date());
    });

    it('should update daily stats for new card graduation', async () => {
      const graduatingCard = { ...mockNewCard, correctCount: 2 };
      vi.spyOn(CardService, 'getCard').mockResolvedValue(graduatingCard);

      await ReviewEngine.processAnswer(mockSession, mockNewCardId, true);

      expect(mockDeckService.updateDailyStats).toHaveBeenCalledWith(
        mockUserId,
        mockDeckId,
        expect.objectContaining({
          newCardsStudied: mockDeck.dailyStats.newCardsStudied + 1
        })
      );
    });

    it('should update daily stats for review completion', async () => {
      await ReviewEngine.processAnswer(mockSession, mockCardId, true);

      expect(mockDeckService.updateDailyStats).toHaveBeenCalledWith(
        mockUserId,
        mockDeckId,
        expect.objectContaining({
          reviewsCompleted: mockDeck.dailyStats.reviewsCompleted + 1
        })
      );
    });
  });
});