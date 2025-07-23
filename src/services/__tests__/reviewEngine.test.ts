import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ReviewEngine } from '../reviewEngine';
import { CardService } from '../cardService';
import { DeckService } from '../deckService';
import { 
  Card, 
  SentenceCard, 
  Deck, 
  StudySession,
  GlobalReviewSettings,
  CardServiceError
} from '../../types/spaced-repetition';
import { 
  STAGE_INTERVALS,
  MIN_STAGE,
  MAX_STAGE,
  DEFAULT_GLOBAL_SETTINGS,
  QUEUE_CONFIG
} from '../../constants/spaced-repetition';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date() })),
    fromDate: vi.fn((date: Date) => ({ toDate: () => date }))
  },
  runTransaction: vi.fn()
}));

// Mock services
vi.mock('../cardService');
vi.mock('../deckService');

const mockCardService = CardService as any;
const mockDeckService = DeckService as any;

describe('ReviewEngine', () => {
  const mockUserId = 'user123';
  const mockDeckId = 'deck123';
  const mockCardId = 'card123';
  
  const mockCard: Card = {
    id: mockCardId,
    deckId: mockDeckId,
    userId: mockUserId,
    front: 'Front content',
    back: 'Back content',
    type: 'basic',
    stage: -6,
    nextReview: new Date(),
    relearning: false,
    isNew: false,
    correctCount: 0,
    createdAt: new Date(),
    totalReviews: 5
  };
  
  const mockNewCard: Card = {
    ...mockCard,
    id: 'newcard123',
    stage: -7,
    isNew: true,
    correctCount: 1,
    totalReviews: 0
  };
  
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
    createdAt: new Date(),
    totalCards: 50
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockDeckService.getUserDecks.mockResolvedValue([mockDeck]);
    mockDeckService.getDeck.mockResolvedValue(mockDeck);
    mockDeckService.getDailyProgress.mockResolvedValue(mockDeck.dailyStats);
    mockDeckService.updateDailyStats.mockResolvedValue(undefined);
    
    mockCardService.getDueCards.mockResolvedValue([mockCard]);
    mockCardService.getNewCards.mockResolvedValue([mockNewCard]);
    mockCardService.getCard.mockResolvedValue(mockCard);
    mockCardService.processCorrectAnswer.mockResolvedValue(undefined);
    mockCardService.processIncorrectAnswer.mockResolvedValue(undefined);
    mockCardService.graduateNewCard.mockResolvedValue(undefined);
    mockCardService.updateCard.mockResolvedValue(undefined);
  });
  
  describe('calculateNextReviewDate', () => {
    it('should calculate next review date for valid stage', async () => {
      const stage = -5;
      const expectedIntervals = STAGE_INTERVALS[stage.toString()];
      
      // Mock getCardCountForDate to return different counts for load balancing
      const getCardCountSpy = vi.spyOn(ReviewEngine as any, 'getCardCountForDate')
        .mockResolvedValueOnce(5) // First interval has 5 cards
        .mockResolvedValueOnce(3) // Second interval has 3 cards (optimal)
        .mockResolvedValueOnce(7); // Third interval has 7 cards
      
      const result = await ReviewEngine.calculateNextReviewDate(stage, mockDeckId, mockUserId);
      
      expect(result).toBeInstanceOf(Date);
      expect(getCardCountSpy).toHaveBeenCalledTimes(expectedIntervals.length);
      
      // Should select the date with minimum card count (second interval)
      const today = new Date();
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() + expectedIntervals[1]);
      expectedDate.setHours(0, 0, 0, 0);
      
      expect(result.getTime()).toBe(expectedDate.getTime());
    });
    
    it('should throw error for invalid stage', async () => {
      await expect(ReviewEngine.calculateNextReviewDate(-10, mockDeckId, mockUserId))
        .rejects.toThrow(CardServiceError);
      
      await expect(ReviewEngine.calculateNextReviewDate(5, mockDeckId, mockUserId))
        .rejects.toThrow(CardServiceError);
    });
    
    it('should handle all valid stages', async () => {
      vi.spyOn(ReviewEngine as any, 'getCardCountForDate').mockResolvedValue(0);
      
      for (let stage = MIN_STAGE; stage <= MAX_STAGE; stage++) {
        const result = await ReviewEngine.calculateNextReviewDate(stage, mockDeckId, mockUserId);
        expect(result).toBeInstanceOf(Date);
      }
    });
  });
  
  describe('findOptimalReviewDate', () => {
    it('should find date with minimum card count', async () => {
      const intervals = [1, 2, 3];
      const cardCounts = [10, 5, 8]; // Second interval has minimum count
      
      const getCardCountSpy = vi.spyOn(ReviewEngine as any, 'getCardCountForDate');
      cardCounts.forEach((count, index) => {
        getCardCountSpy.mockResolvedValueOnce(count);
      });
      
      const result = await ReviewEngine.findOptimalReviewDate(intervals, mockDeckId, mockUserId);
      
      const today = new Date();
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() + intervals[1]); // Second interval
      expectedDate.setHours(0, 0, 0, 0);
      
      expect(result.getTime()).toBe(expectedDate.getTime());
    });
    
    it('should handle equal card counts', async () => {
      const intervals = [1, 2, 3];
      vi.spyOn(ReviewEngine as any, 'getCardCountForDate').mockResolvedValue(5);
      
      const result = await ReviewEngine.findOptimalReviewDate(intervals, mockDeckId, mockUserId);
      
      // Should return first interval when all counts are equal
      const today = new Date();
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() + intervals[0]);
      expectedDate.setHours(0, 0, 0, 0);
      
      expect(result.getTime()).toBe(expectedDate.getTime());
    });
  });
  
  describe('createStudySession', () => {
    it('should create session with reviews first order', async () => {
      const globalSettings: GlobalReviewSettings = {
        userId: mockUserId,
        studyOrder: 'reviews-first'
      };
      
      vi.spyOn(ReviewEngine as any, 'getGlobalSettings').mockResolvedValue(globalSettings);
      
      const session = await ReviewEngine.createStudySession(mockUserId);
      
      expect(session.userId).toBe(mockUserId);
      expect(session.isActive).toBe(true);
      expect(session.reviewQueue).toHaveLength(1);
      expect(session.reviewQueue[0]).toEqual(mockCard);
      expect(session.sessionType).toBe('mixed');
      expect((session as any).pendingNewCardBatches).toBeDefined();
    });
    
    it('should create session with new cards first order', async () => {
      const globalSettings: GlobalReviewSettings = {
        userId: mockUserId,
        studyOrder: 'new-first'
      };
      
      vi.spyOn(ReviewEngine as any, 'getGlobalSettings').mockResolvedValue(globalSettings);
      
      const session = await ReviewEngine.createStudySession(mockUserId);
      
      expect(session.newCardBatches).toHaveLength(1);
      expect(session.newCardBatches[0]).toHaveLength(1);
      expect(session.newCardBatches[0][0]).toEqual(mockNewCard);
      expect((session as any).pendingReviewQueue).toBeDefined();
    });
    
    it('should handle empty queues', async () => {
      mockCardService.getDueCards.mockResolvedValue([]);
      mockCardService.getNewCards.mockResolvedValue([]);
      
      const session = await ReviewEngine.createStudySession(mockUserId);
      
      expect(session.reviewQueue).toHaveLength(0);
      expect(session.newCardBatches).toHaveLength(0);
      expect(session.sessionType).toBe('mixed');
    });
  });
  
  describe('getNextCard', () => {
    it('should return next review card', async () => {
      const session: StudySession = {
        id: 'session123',
        userId: mockUserId,
        startTime: new Date(),
        reviewQueue: [mockCard],
        newCardBatches: [],
        currentBatchIndex: 0,
        currentCardIndex: 0,
        isActive: true,
        sessionType: 'review'
      };
      
      const nextCard = await ReviewEngine.getNextCard(session);
      
      expect(nextCard).toEqual(mockCard);
    });
    
    it('should return next new card from batch', async () => {
      const session: StudySession = {
        id: 'session123',
        userId: mockUserId,
        startTime: new Date(),
        reviewQueue: [],
        newCardBatches: [[mockNewCard]],
        currentBatchIndex: 0,
        currentCardIndex: 0,
        isActive: true,
        sessionType: 'new-cards'
      };
      
      const nextCard = await ReviewEngine.getNextCard(session);
      
      expect(nextCard).toEqual(mockNewCard);
    });
    
    it('should return null when session is complete', async () => {
      const session: StudySession = {
        id: 'session123',
        userId: mockUserId,
        startTime: new Date(),
        reviewQueue: [],
        newCardBatches: [],
        currentBatchIndex: 0,
        currentCardIndex: 0,
        isActive: true,
        sessionType: 'mixed'
      };
      
      const nextCard = await ReviewEngine.getNextCard(session);
      
      expect(nextCard).toBeNull();
      expect(session.isActive).toBe(false);
      expect(session.endTime).toBeInstanceOf(Date);
    });
    
    it('should switch to pending review queue after new cards', async () => {
      const pendingReviewCard = { ...mockCard, id: 'pending123' };
      const session: StudySession = {
        id: 'session123',
        userId: mockUserId,
        startTime: new Date(),
        reviewQueue: [],
        newCardBatches: [],
        currentBatchIndex: 0,
        currentCardIndex: 0,
        isActive: true,
        sessionType: 'mixed'
      };
      
      (session as any).pendingReviewQueue = [pendingReviewCard];
      
      const nextCard = await ReviewEngine.getNextCard(session);
      
      expect(nextCard).toEqual(pendingReviewCard);
      expect(session.reviewQueue).toHaveLength(1);
      expect((session as any).pendingReviewQueue).toBeUndefined();
    });
  });
  
  describe('processAnswer', () => {
    let session: StudySession;
    
    beforeEach(() => {
      session = {
        id: 'session123',
        userId: mockUserId,
        startTime: new Date(),
        reviewQueue: [mockCard],
        newCardBatches: [],
        currentBatchIndex: 0,
        currentCardIndex: 0,
        isActive: true,
        sessionType: 'review'
      };
    });
    
    it('should process correct answer for review card', async () => {
      await ReviewEngine.processAnswer(session, mockCardId, true);
      
      expect(mockCardService.processCorrectAnswer).toHaveBeenCalledWith(mockUserId, mockCardId);
      expect(mockCardService.updateCard).toHaveBeenCalledWith(
        mockUserId, 
        mockCardId, 
        expect.objectContaining({
          stage: mockCard.stage + 1,
          relearning: false
        })
      );
      expect(session.currentCardIndex).toBe(1);
    });
    
    it('should process incorrect answer for review card', async () => {
      await ReviewEngine.processAnswer(session, mockCardId, false);
      
      expect(mockCardService.processIncorrectAnswer).toHaveBeenCalledWith(mockUserId, mockCardId);
      expect(session.reviewQueue.length).toBeGreaterThan(1); // Card should be reinserted
      expect(session.currentCardIndex).toBe(1);
    });
    
    it('should process correct answer for new card', async () => {
      mockCardService.getCard.mockResolvedValue(mockNewCard);
      
      await ReviewEngine.processAnswer(session, mockNewCard.id, true);
      
      expect(mockCardService.processCorrectAnswer).toHaveBeenCalledWith(mockUserId, mockNewCard.id);
      expect(mockDeckService.getDeck).toHaveBeenCalledWith(mockUserId, mockDeckId);
    });
    
    it('should graduate new card when threshold reached', async () => {
      const graduatingCard = { ...mockNewCard, correctCount: 2 }; // Will reach threshold of 3
      mockCardService.getCard.mockResolvedValue(graduatingCard);
      
      await ReviewEngine.processAnswer(session, graduatingCard.id, true);
      
      expect(mockCardService.graduateNewCard).toHaveBeenCalledWith(mockUserId, graduatingCard.id);
      expect(mockDeckService.updateDailyStats).toHaveBeenCalled();
    });
    
    it('should throw error for non-existent card', async () => {
      mockCardService.getCard.mockResolvedValue(null);
      
      await expect(ReviewEngine.processAnswer(session, 'nonexistent', true))
        .rejects.toThrow(CardServiceError);
    });
  });
  
  describe('buildReviewQueue', () => {
    it('should build queue from multiple decks', async () => {
      const deck2 = { ...mockDeck, id: 'deck456' };
      const card2 = { ...mockCard, id: 'card456', deckId: 'deck456' };
      
      mockDeckService.getUserDecks.mockResolvedValue([mockDeck, deck2]);
      mockCardService.getDueCards
        .mockResolvedValueOnce([mockCard])
        .mockResolvedValueOnce([card2]);
      
      const queue = await ReviewEngine.buildReviewQueue(mockUserId, [mockDeck, deck2]);
      
      expect(queue).toHaveLength(2);
      expect(queue).toContain(mockCard);
      expect(queue).toContain(card2);
    });
    
    it('should shuffle cards from different decks', async () => {
      const cards = Array.from({ length: 10 }, (_, i) => ({
        ...mockCard,
        id: `card${i}`,
        deckId: i % 2 === 0 ? 'deck1' : 'deck2'
      }));
      
      mockCardService.getDueCards.mockResolvedValue(cards);
      
      const queue = await ReviewEngine.buildReviewQueue(mockUserId, [mockDeck]);
      
      expect(queue).toHaveLength(10);
      // Note: Testing randomness is tricky, but we can at least verify all cards are present
      expect(queue.every(card => cards.some(c => c.id === card.id))).toBe(true);
    });
  });
  
  describe('buildNewCardBatches', () => {
    it('should create batches respecting daily limits', async () => {
      const newCards = Array.from({ length: 8 }, (_, i) => ({
        ...mockNewCard,
        id: `newcard${i}`
      }));
      
      mockCardService.getNewCards.mockResolvedValue(newCards);
      mockDeckService.getDailyProgress.mockResolvedValue({
        date: '2025-01-23',
        newCardsStudied: 5,
        reviewsCompleted: 0
      });
      
      const batches = await ReviewEngine.buildNewCardBatches(mockUserId, [mockDeck]);
      
      // Should only get 15 cards (20 daily limit - 5 already studied)
      // But we only have 8 available, so should get all 8
      expect(batches).toHaveLength(2); // 8 cards / 5 per batch = 2 batches
      expect(batches[0]).toHaveLength(5);
      expect(batches[1]).toHaveLength(3);
    });
    
    it('should skip decks that reached daily limit', async () => {
      mockDeckService.getDailyProgress.mockResolvedValue({
        date: '2025-01-23',
        newCardsStudied: 20, // Already at limit
        reviewsCompleted: 0
      });
      
      const batches = await ReviewEngine.buildNewCardBatches(mockUserId, [mockDeck]);
      
      expect(batches).toHaveLength(0);
      expect(mockCardService.getNewCards).not.toHaveBeenCalled();
    });
  });
  
  describe('shuffleCardIntoQueue', () => {
    it('should insert card at random position within limit', () => {
      const queue = Array.from({ length: 10 }, (_, i) => ({
        ...mockCard,
        id: `card${i}`
      }));
      
      const cardToInsert = { ...mockCard, id: 'failed_card' };
      const currentPosition = 3;
      
      const newQueue = ReviewEngine.shuffleCardIntoQueue(cardToInsert, queue, currentPosition);
      
      expect(newQueue).toHaveLength(11);
      expect(newQueue).toContain(cardToInsert);
      
      // Card should be inserted within QUEUE_CONFIG.MAX_RANDOM_INSERTION_POSITIONS of current position
      const insertIndex = newQueue.findIndex(card => card.id === 'failed_card');
      expect(insertIndex).toBeGreaterThan(currentPosition);
      expect(insertIndex).toBeLessThanOrEqual(currentPosition + QUEUE_CONFIG.MAX_RANDOM_INSERTION_POSITIONS);
    });
    
    it('should handle insertion at end of queue', () => {
      const queue = [mockCard];
      const cardToInsert = { ...mockCard, id: 'failed_card' };
      const currentPosition = 0;
      
      const newQueue = ReviewEngine.shuffleCardIntoQueue(cardToInsert, queue, currentPosition);
      
      expect(newQueue).toHaveLength(2);
      expect(newQueue[1]).toEqual(cardToInsert);
    });
  });
  
  describe('getStudyProgress', () => {
    it('should calculate progress correctly', () => {
      const session: StudySession = {
        id: 'session123',
        userId: mockUserId,
        startTime: new Date(),
        reviewQueue: [mockCard, { ...mockCard, id: 'card2' }],
        newCardBatches: [[mockNewCard, { ...mockNewCard, id: 'newcard2' }]],
        currentBatchIndex: 0,
        currentCardIndex: 1, // Completed 1 review card
        isActive: true,
        sessionType: 'mixed'
      };
      
      const progress = ReviewEngine.getStudyProgress(session);
      
      expect(progress.reviewsRemaining).toBe(1); // 2 total - 1 completed
      // When currentCardIndex = 1 and reviewQueue.length = 2, we're still in reviews
      // cardIndexInBatch = 1 - 2 = -1, so Math.max(0, 2 - (-1)) = Math.max(0, 3) = 3
      expect(progress.newCardsRemaining).toBe(2); // All new cards remaining since we haven't started new cards yet
      expect(progress.currentPhase).toBe('reviews');
      expect(progress.totalProgress).toBe(25); // 1 of 4 total cards completed
    });
    
    it('should handle completed session', () => {
      const session: StudySession = {
        id: 'session123',
        userId: mockUserId,
        startTime: new Date(),
        reviewQueue: [],
        newCardBatches: [],
        currentBatchIndex: 0,
        currentCardIndex: 0,
        isActive: false,
        sessionType: 'mixed'
      };
      
      const progress = ReviewEngine.getStudyProgress(session);
      
      expect(progress.reviewsRemaining).toBe(0);
      expect(progress.newCardsRemaining).toBe(0);
      expect(progress.currentPhase).toBe('complete');
      expect(progress.totalProgress).toBe(100);
    });
  });
  
  describe('error handling', () => {
    it('should handle CardService errors', async () => {
      const error = new CardServiceError('Test error', 'VALIDATION_ERROR');
      mockCardService.getDueCards.mockRejectedValue(error);
      
      await expect(ReviewEngine.buildReviewQueue(mockUserId, [mockDeck]))
        .rejects.toThrow(CardServiceError);
    });
    
    it('should handle Firebase errors', async () => {
      const firebaseError = new Error('Firebase connection failed');
      mockDeckService.getUserDecks.mockRejectedValue(firebaseError);
      
      await expect(ReviewEngine.createStudySession(mockUserId))
        .rejects.toThrow(CardServiceError);
    });
  });
  
  describe('edge cases', () => {
    it('should handle empty deck list', async () => {
      mockDeckService.getUserDecks.mockResolvedValue([]);
      
      const session = await ReviewEngine.createStudySession(mockUserId);
      
      expect(session.reviewQueue).toHaveLength(0);
      expect(session.newCardBatches).toHaveLength(0);
    });
    
    it('should handle deck with no cards', async () => {
      mockCardService.getDueCards.mockResolvedValue([]);
      mockCardService.getNewCards.mockResolvedValue([]);
      
      const session = await ReviewEngine.createStudySession(mockUserId);
      
      expect(session.reviewQueue).toHaveLength(0);
      expect(session.newCardBatches).toHaveLength(0);
    });
    
    it('should handle maximum stage progression', async () => {
      const maxStageCard = { ...mockCard, stage: MAX_STAGE };
      mockCardService.getCard.mockResolvedValue(maxStageCard);
      
      const session: StudySession = {
        id: 'session123',
        userId: mockUserId,
        startTime: new Date(),
        reviewQueue: [maxStageCard],
        newCardBatches: [],
        currentBatchIndex: 0,
        currentCardIndex: 0,
        isActive: true,
        sessionType: 'review'
      };
      
      await ReviewEngine.processAnswer(session, maxStageCard.id, true);
      
      expect(mockCardService.updateCard).toHaveBeenCalledWith(
        mockUserId,
        maxStageCard.id,
        expect.objectContaining({
          stage: MAX_STAGE // Should not exceed maximum
        })
      );
    });
  });
});