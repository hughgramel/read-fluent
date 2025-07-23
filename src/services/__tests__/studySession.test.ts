import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { StudySession } from '../studySession';
import { CardService } from '../cardService';
import { DeckService } from '../deckService';
import { ReviewEngine } from '../reviewEngine';
import { 
  Card, 
  SentenceCard, 
  Deck, 
  StudySession as IStudySession,
  GlobalReviewSettings,
  CardServiceError
} from '../../types/spaced-repetition';
import { 
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
vi.mock('../reviewEngine');

const mockCardService = CardService as any;
const mockDeckService = DeckService as any;
const mockReviewEngine = ReviewEngine as any;

describe('StudySession', () => {
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
  
  const mockSentenceCard: SentenceCard = {
    ...mockCard,
    id: 'sentence123',
    type: 'sentence',
    translation: 'Translation content'
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
  
  const mockGlobalSettings: GlobalReviewSettings = {
    userId: mockUserId,
    studyOrder: 'reviews-first'
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
    
    mockReviewEngine.calculateNextReviewDate.mockResolvedValue(new Date());
    mockReviewEngine.shuffleCardIntoQueue.mockReturnValue([mockCard, mockCard]);
    
    // Mock the getGlobalSettings method to return reviews-first by default
    vi.spyOn(StudySession as any, 'getGlobalSettings').mockResolvedValue(mockGlobalSettings);
  });
  
  describe('StudySession.create', () => {
    it('should create a study session with reviews first order', async () => {
      const session = await StudySession.create(mockUserId);
      
      expect(session).toBeInstanceOf(StudySession);
      expect(session.isActive()).toBe(true);
      
      const sessionData = session.getSessionData();
      expect(sessionData.userId).toBe(mockUserId);
      expect(sessionData.reviewQueue).toHaveLength(1);
      expect(sessionData.reviewQueue[0]).toEqual(mockCard);
      expect(sessionData.sessionType).toBe('mixed');
      expect((sessionData as any).pendingNewCardBatches).toBeDefined();
    });
    
    it('should create a study session with new cards first order', async () => {
      // Mock global settings for new-first order
      vi.spyOn(StudySession as any, 'getGlobalSettings').mockResolvedValue({
        userId: mockUserId,
        studyOrder: 'new-first'
      });
      
      const session = await StudySession.create(mockUserId);
      
      const sessionData = session.getSessionData();
      expect(sessionData.newCardBatches).toHaveLength(1);
      expect(sessionData.newCardBatches[0]).toHaveLength(1);
      expect(sessionData.newCardBatches[0][0]).toEqual(mockNewCard);
      expect((sessionData as any).pendingReviewQueue).toBeDefined();
    });
    
    it('should handle empty queues', async () => {
      mockCardService.getDueCards.mockResolvedValue([]);
      mockCardService.getNewCards.mockResolvedValue([]);
      
      const session = await StudySession.create(mockUserId);
      
      const sessionData = session.getSessionData();
      expect(sessionData.reviewQueue).toHaveLength(0);
      expect(sessionData.newCardBatches).toHaveLength(0);
      expect(sessionData.sessionType).toBe('mixed');
    });
    
    it('should handle multiple decks', async () => {
      const deck2 = { ...mockDeck, id: 'deck456' };
      const card2 = { ...mockCard, id: 'card456', deckId: 'deck456' };
      const newCard2 = { ...mockNewCard, id: 'newcard456', deckId: 'deck456' };
      
      mockDeckService.getUserDecks.mockResolvedValue([mockDeck, deck2]);
      mockCardService.getDueCards
        .mockResolvedValueOnce([mockCard])
        .mockResolvedValueOnce([card2]);
      mockCardService.getNewCards
        .mockResolvedValueOnce([mockNewCard])
        .mockResolvedValueOnce([newCard2]);
      
      const session = await StudySession.create(mockUserId);
      
      const sessionData = session.getSessionData();
      expect(sessionData.reviewQueue).toHaveLength(2);
      // New cards are stored in pendingNewCardBatches for reviews-first order
      // Each deck creates its own batches, so we expect 2 batches (one per deck)
      expect((sessionData as any).pendingNewCardBatches).toHaveLength(2);
      expect((sessionData as any).pendingNewCardBatches[0]).toHaveLength(1);
      expect((sessionData as any).pendingNewCardBatches[1]).toHaveLength(1);
      
      const stats = session.getSessionStats();
      expect(stats.decksStudied).toHaveLength(2);
      expect(stats.decksStudied).toContain(mockDeckId);
      expect(stats.decksStudied).toContain('deck456');
    });
    
    it('should handle service errors', async () => {
      const error = new CardServiceError('Test error', 'VALIDATION_ERROR');
      mockDeckService.getUserDecks.mockRejectedValue(error);
      
      await expect(StudySession.create(mockUserId))
        .rejects.toThrow(CardServiceError);
    });
  });
  
  describe('getNextCard', () => {
    let session: StudySession;
    
    beforeEach(async () => {
      session = await StudySession.create(mockUserId);
    });
    
    it('should return next review card', async () => {
      const nextCard = await session.getNextCard();
      
      expect(nextCard).toEqual(mockCard);
    });
    
    it('should return next new card from batch after reviews', async () => {
      // Simulate completing review cards by directly modifying the session
      (session as any).session.currentCardIndex = (session as any).session.reviewQueue.length;
      
      const nextCard = await session.getNextCard();
      
      // Since we're using reviews-first order, after completing reviews,
      // we should switch to pending new card batches
      expect(nextCard).toEqual(mockNewCard);
    });
    
    it('should return null when session is complete', async () => {
      // Simulate completing all cards by removing pending batches and setting indices
      delete ((session as any).session as any).pendingNewCardBatches;
      (session as any).session.currentCardIndex = (session as any).session.reviewQueue.length;
      (session as any).session.currentBatchIndex = (session as any).session.newCardBatches.length;
      
      const nextCard = await session.getNextCard();
      
      expect(nextCard).toBeNull();
      expect(session.isActive()).toBe(false);
    });
    
    it('should switch to pending review queue after new cards', async () => {
      // Create session with new-first order
      vi.spyOn(StudySession as any, 'getGlobalSettings').mockResolvedValue({
        userId: mockUserId,
        studyOrder: 'new-first'
      });
      
      const newFirstSession = await StudySession.create(mockUserId);
      
      // Simulate completing new cards
      (newFirstSession as any).session.currentCardIndex = (newFirstSession as any).session.newCardBatches[0].length;
      (newFirstSession as any).session.currentBatchIndex = (newFirstSession as any).session.newCardBatches.length;
      
      const nextCard = await newFirstSession.getNextCard();
      
      expect(nextCard).toEqual(mockCard);
      const sessionData = newFirstSession.getSessionData();
      expect(sessionData.reviewQueue).toHaveLength(1);
    });
    
    it('should handle inactive session', async () => {
      session.completeSession();
      
      const nextCard = await session.getNextCard();
      
      expect(nextCard).toBeNull();
    });
  });
  
  describe('processAnswer', () => {
    let session: StudySession;
    
    beforeEach(async () => {
      session = await StudySession.create(mockUserId);
    });
    
    it('should process correct answer for review card', async () => {
      await session.processAnswer(mockCardId, true);
      
      expect(mockCardService.processCorrectAnswer).toHaveBeenCalledWith(mockUserId, mockCardId);
      expect(mockCardService.updateCard).toHaveBeenCalledWith(
        mockUserId, 
        mockCardId, 
        expect.objectContaining({
          stage: mockCard.stage + 1,
          relearning: false
        })
      );
      expect(mockDeckService.updateDailyStats).toHaveBeenCalled();
      
      const stats = session.getSessionStats();
      expect(stats.correctAnswers).toBe(1);
      expect(stats.reviewsCompleted).toBe(1);
    });
    
    it('should process incorrect answer for review card', async () => {
      await session.processAnswer(mockCardId, false);
      
      expect(mockCardService.processIncorrectAnswer).toHaveBeenCalledWith(mockUserId, mockCardId);
      expect(mockReviewEngine.shuffleCardIntoQueue).toHaveBeenCalled();
      
      const stats = session.getSessionStats();
      expect(stats.incorrectAnswers).toBe(1);
    });
    
    it('should process correct answer for new card', async () => {
      mockCardService.getCard.mockResolvedValue(mockNewCard);
      
      await session.processAnswer(mockNewCard.id, true);
      
      expect(mockCardService.processCorrectAnswer).toHaveBeenCalledWith(mockUserId, mockNewCard.id);
      expect(mockDeckService.getDeck).toHaveBeenCalledWith(mockUserId, mockDeckId);
      
      const stats = session.getSessionStats();
      expect(stats.correctAnswers).toBe(1);
    });
    
    it('should graduate new card when threshold reached', async () => {
      const graduatingCard = { ...mockNewCard, correctCount: 2 }; // Will reach threshold of 3
      mockCardService.getCard.mockResolvedValue(graduatingCard);
      
      await session.processAnswer(graduatingCard.id, true);
      
      expect(mockCardService.graduateNewCard).toHaveBeenCalledWith(mockUserId, graduatingCard.id);
      expect(mockDeckService.updateDailyStats).toHaveBeenCalled();
      
      const stats = session.getSessionStats();
      expect(stats.newCardsLearned).toBe(1);
    });
    
    it('should process incorrect answer for new card', async () => {
      mockCardService.getCard.mockResolvedValue(mockNewCard);
      
      await session.processAnswer(mockNewCard.id, false);
      
      expect(mockCardService.processIncorrectAnswer).toHaveBeenCalledWith(mockUserId, mockNewCard.id);
      
      const stats = session.getSessionStats();
      expect(stats.incorrectAnswers).toBe(1);
    });
    
    it('should handle sentence cards', async () => {
      mockCardService.getCard.mockResolvedValue(mockSentenceCard);
      
      await session.processAnswer(mockSentenceCard.id, true);
      
      expect(mockCardService.processCorrectAnswer).toHaveBeenCalledWith(mockUserId, mockSentenceCard.id);
      
      const stats = session.getSessionStats();
      expect(stats.correctAnswers).toBe(1);
      expect(stats.reviewsCompleted).toBe(1);
    });
    
    it('should throw error for non-existent card', async () => {
      mockCardService.getCard.mockResolvedValue(null);
      
      await expect(session.processAnswer('nonexistent', true))
        .rejects.toThrow(CardServiceError);
    });
    
    it('should advance session position after processing', async () => {
      const initialIndex = session.getSessionData().currentCardIndex;
      
      await session.processAnswer(mockCardId, true);
      
      const finalIndex = session.getSessionData().currentCardIndex;
      expect(finalIndex).toBe(initialIndex + 1);
    });
  });
  
  describe('getStudyProgress', () => {
    let session: StudySession;
    
    beforeEach(async () => {
      // Create session with multiple cards
      mockCardService.getDueCards.mockResolvedValue([mockCard, { ...mockCard, id: 'card2' }]);
      mockCardService.getNewCards.mockResolvedValue([mockNewCard, { ...mockNewCard, id: 'newcard2' }]);
      
      session = await StudySession.create(mockUserId);
    });
    
    it('should calculate progress correctly during reviews', () => {
      const progress = session.getStudyProgress();
      
      expect(progress.reviewsRemaining).toBe(2);
      expect(progress.newCardsRemaining).toBe(2); // From pending batches
      expect(progress.currentPhase).toBe('reviews');
      expect(progress.totalProgress).toBe(0); // No cards completed yet
    });
    
    it('should calculate progress correctly during new cards', () => {
      (session as any).session.currentCardIndex = (session as any).session.reviewQueue.length; // Completed all reviews
      
      const progress = session.getStudyProgress();
      
      expect(progress.reviewsRemaining).toBe(0);
      expect(progress.newCardsRemaining).toBe(2); // From pending batches
      expect(progress.currentPhase).toBe('new-cards');
      expect(progress.totalProgress).toBe(50); // 2 of 4 cards completed
    });
    
    it('should calculate progress correctly when complete', () => {
      // Simulate completing all cards by removing pending batches
      delete ((session as any).session as any).pendingNewCardBatches;
      (session as any).session.currentCardIndex = (session as any).session.reviewQueue.length;
      (session as any).session.currentBatchIndex = (session as any).session.newCardBatches.length;
      
      const progress = session.getStudyProgress();
      
      expect(progress.reviewsRemaining).toBe(0);
      expect(progress.newCardsRemaining).toBe(0);
      expect(progress.currentPhase).toBe('complete');
      expect(progress.totalProgress).toBe(100);
    });
    
    it('should handle pending queues in progress calculation', async () => {
      // Create session with new-first order to have pending review queue
      vi.spyOn(StudySession as any, 'getGlobalSettings').mockResolvedValue({
        userId: mockUserId,
        studyOrder: 'new-first'
      });
      
      const newFirstSession = await StudySession.create(mockUserId);
      const progress = newFirstSession.getStudyProgress();
      
      // For new-first order: we have 2 new cards in batches, and pending review queue is not counted in progress
      // The pending review queue will be counted when we switch to it
      expect(progress.reviewsRemaining + progress.newCardsRemaining).toBe(2);
    });
  });
  
  describe('getSessionStats', () => {
    let session: StudySession;
    
    beforeEach(async () => {
      session = await StudySession.create(mockUserId);
    });
    
    it('should return current session statistics', () => {
      const stats = session.getSessionStats();
      
      expect(stats.totalCards).toBeGreaterThan(0);
      expect(stats.correctAnswers).toBe(0);
      expect(stats.incorrectAnswers).toBe(0);
      expect(stats.newCardsLearned).toBe(0);
      expect(stats.reviewsCompleted).toBe(0);
      expect(stats.timeSpent).toBeGreaterThanOrEqual(0);
      expect(stats.decksStudied).toContain(mockDeckId);
    });
    
    it('should update statistics after processing answers', async () => {
      await session.processAnswer(mockCardId, true);
      
      const stats = session.getSessionStats();
      expect(stats.correctAnswers).toBe(1);
      expect(stats.reviewsCompleted).toBe(1);
    });
    
    it('should calculate time spent correctly', async () => {
      // Wait a small amount of time
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const stats = session.getSessionStats();
      expect(stats.timeSpent).toBeGreaterThan(0);
    });
  });
  
  describe('buildReviewQueue', () => {
    it('should build queue from multiple decks', async () => {
      const deck2 = { ...mockDeck, id: 'deck456' };
      const card2 = { ...mockCard, id: 'card456', deckId: 'deck456' };
      
      mockCardService.getDueCards
        .mockResolvedValueOnce([mockCard])
        .mockResolvedValueOnce([card2]);
      
      const queue = await StudySession.buildReviewQueue(mockUserId, [mockDeck, deck2]);
      
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
      
      const queue = await StudySession.buildReviewQueue(mockUserId, [mockDeck]);
      
      expect(queue).toHaveLength(10);
      // Verify all cards are present (order may be shuffled)
      expect(queue.every(card => cards.some(c => c.id === card.id))).toBe(true);
    });
    
    it('should handle empty deck list', async () => {
      const queue = await StudySession.buildReviewQueue(mockUserId, []);
      
      expect(queue).toHaveLength(0);
    });
    
    it('should handle service errors', async () => {
      const error = new CardServiceError('Test error', 'FIREBASE_ERROR');
      mockCardService.getDueCards.mockRejectedValue(error);
      
      await expect(StudySession.buildReviewQueue(mockUserId, [mockDeck]))
        .rejects.toThrow(CardServiceError);
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
      
      const batches = await StudySession.buildNewCardBatches(mockUserId, [mockDeck]);
      
      // Should get 15 cards (20 daily limit - 5 already studied)
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
      
      const batches = await StudySession.buildNewCardBatches(mockUserId, [mockDeck]);
      
      expect(batches).toHaveLength(0);
      expect(mockCardService.getNewCards).not.toHaveBeenCalled();
    });
    
    it('should handle multiple decks with different settings', async () => {
      const deck2 = { 
        ...mockDeck, 
        id: 'deck456',
        settings: { ...mockDeck.settings, cardsPerBatch: 3 }
      };
      
      const newCards1 = Array.from({ length: 5 }, (_, i) => ({
        ...mockNewCard,
        id: `newcard1_${i}`,
        deckId: mockDeckId
      }));
      
      const newCards2 = Array.from({ length: 6 }, (_, i) => ({
        ...mockNewCard,
        id: `newcard2_${i}`,
        deckId: 'deck456'
      }));
      
      mockCardService.getNewCards
        .mockResolvedValueOnce(newCards1)
        .mockResolvedValueOnce(newCards2);
      
      mockDeckService.getDailyProgress
        .mockResolvedValueOnce({ date: '2025-01-23', newCardsStudied: 0, reviewsCompleted: 0 })
        .mockResolvedValueOnce({ date: '2025-01-23', newCardsStudied: 0, reviewsCompleted: 0 });
      
      const batches = await StudySession.buildNewCardBatches(mockUserId, [mockDeck, deck2]);
      
      // Deck1: 5 cards / 5 per batch = 1 batch
      // Deck2: 6 cards / 3 per batch = 2 batches
      expect(batches).toHaveLength(3);
    });
    
    it('should handle service errors', async () => {
      const error = new CardServiceError('Test error', 'FIREBASE_ERROR');
      mockDeckService.getDailyProgress.mockRejectedValue(error);
      
      await expect(StudySession.buildNewCardBatches(mockUserId, [mockDeck]))
        .rejects.toThrow(CardServiceError);
    });
  });
  
  describe('session lifecycle', () => {
    let session: StudySession;
    
    beforeEach(async () => {
      session = await StudySession.create(mockUserId);
    });
    
    it('should start as active session', () => {
      expect(session.isActive()).toBe(true);
      
      const sessionData = session.getSessionData();
      expect(sessionData.startTime).toBeInstanceOf(Date);
      expect(sessionData.endTime).toBeUndefined();
    });
    
    it('should complete session properly', () => {
      session.completeSession();
      
      expect(session.isActive()).toBe(false);
      
      const sessionData = session.getSessionData();
      expect(sessionData.endTime).toBeInstanceOf(Date);
      
      const stats = session.getSessionStats();
      expect(stats.timeSpent).toBeGreaterThanOrEqual(0);
    });
    
    it('should maintain session state throughout lifecycle', async () => {
      const initialStats = session.getSessionStats();
      
      // Wait a small amount to ensure time passes
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Process some answers
      await session.processAnswer(mockCardId, true);
      await session.processAnswer(mockCardId, false);
      
      const midStats = session.getSessionStats();
      expect(midStats.correctAnswers).toBe(1);
      expect(midStats.incorrectAnswers).toBe(1);
      expect(midStats.totalCards).toBe(initialStats.totalCards);
      
      // Complete session
      session.completeSession();
      
      const finalStats = session.getSessionStats();
      expect(finalStats.correctAnswers).toBe(1);
      expect(finalStats.incorrectAnswers).toBe(1);
      expect(finalStats.timeSpent).toBeGreaterThan(0);
    });
  });
  
  describe('edge cases and error handling', () => {
    it('should handle empty session creation', async () => {
      mockDeckService.getUserDecks.mockResolvedValue([]);
      
      const session = await StudySession.create(mockUserId);
      
      expect(session.isActive()).toBe(true);
      
      const stats = session.getSessionStats();
      expect(stats.totalCards).toBe(0);
      expect(stats.decksStudied).toHaveLength(0);
    });
    
    it('should handle deck with no available cards', async () => {
      mockCardService.getDueCards.mockResolvedValue([]);
      mockCardService.getNewCards.mockResolvedValue([]);
      
      const session = await StudySession.create(mockUserId);
      
      const nextCard = await session.getNextCard();
      expect(nextCard).toBeNull();
      expect(session.isActive()).toBe(false);
    });
    
    it('should handle service failures gracefully', async () => {
      const session = await StudySession.create(mockUserId);
      
      const error = new CardServiceError('Service unavailable', 'NETWORK_ERROR');
      mockCardService.getCard.mockRejectedValue(error);
      
      await expect(session.processAnswer(mockCardId, true))
        .rejects.toThrow(CardServiceError);
    });
    
    it('should handle concurrent session operations', async () => {
      const session = await StudySession.create(mockUserId);
      
      // Simulate concurrent operations
      const promises = [
        session.getNextCard(),
        session.getStudyProgress(),
        session.getSessionStats()
      ];
      
      const results = await Promise.all(promises);
      
      expect(results[0]).toEqual(mockCard); // Next card
      expect(results[1]).toHaveProperty('currentPhase'); // Progress
      expect(results[2]).toHaveProperty('totalCards'); // Stats
    });
  });
});