import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReviewEngine } from '../reviewEngine';
import { CardService } from '../cardService';
import { DeckService } from '../deckService';
import { StudySession } from '../studySession';
import {
  Card,
  Deck,
  GlobalReviewSettings
} from '../../types/spaced-repetition';

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

describe('Card Graduation Process', () => {
  const mockUserId = 'user123';
  const mockDeckId = 'deck123';

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
      newCardsStudied: 0,
      reviewsCompleted: 0
    },
    createdAt: new Date('2024-01-01'),
    totalCards: 50
  };

  const createMockNewCard = (id: string, correctCount: number = 0): Card => ({
    id,
    deckId: mockDeckId,
    userId: mockUserId,
    front: `Card ${id} Front`,
    back: `Card ${id} Back`,
    type: 'basic',
    stage: -7,
    nextReview: new Date(),
    relearning: false,
    isNew: true,
    correctCount,
    createdAt: new Date('2024-01-20'),
    totalReviews: correctCount
  });

  const mockGlobalSettings: GlobalReviewSettings = {
    userId: mockUserId,
    studyOrder: 'reviews-first'
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockDeckService.getDeck.mockResolvedValue(mockDeck);
    mockDeckService.getDailyProgress.mockResolvedValue(mockDeck.dailyStats);
    mockDeckService.updateDailyStats.mockResolvedValue(undefined);

    mockCardService.processCorrectAnswer.mockResolvedValue(undefined);
    mockCardService.processIncorrectAnswer.mockResolvedValue(undefined);
    mockCardService.graduateNewCard.mockResolvedValue(undefined);
    mockCardService.updateCard.mockResolvedValue(undefined);
    mockCardService.getNewCards.mockResolvedValue([]);
    
    mockReviewEngine.calculateNextReviewDate.mockResolvedValue(new Date('2025-01-24'));
  });

  describe('New Card Graduation', () => {
    it('should graduate a new card after reaching the threshold of correct answers', async () => {
      // Create a card that's one correct answer away from graduation
      const almostGraduatedCard = createMockNewCard('card1', 2);
      mockCardService.getCard.mockResolvedValue(almostGraduatedCard);
      
      // Create a study session with this card
      const session = {
        id: 'session123',
        userId: mockUserId,
        startTime: new Date(),
        reviewQueue: [],
        newCardBatches: [[almostGraduatedCard]],
        currentBatchIndex: 0,
        currentCardIndex: 0,
        isActive: true,
        sessionType: 'new-cards'
      };
      
      const studySession = new StudySession(session, mockGlobalSettings);
      
      // Process a correct answer for this card
      await studySession.processAnswer('card1', true);
      
      // Verify the card was graduated
      expect(mockCardService.graduateNewCard).toHaveBeenCalledWith(mockUserId, 'card1');
      expect(mockCardService.processCorrectAnswer).toHaveBeenCalledWith(mockUserId, 'card1');
      
      // Verify the card was scheduled for its first review
      expect(mockReviewEngine.calculateNextReviewDate).toHaveBeenCalled();
      expect(mockCardService.updateCard).toHaveBeenCalled();
      
      // Verify daily stats were updated
      expect(mockDeckService.updateDailyStats).toHaveBeenCalledWith(
        mockUserId,
        mockDeckId,
        expect.objectContaining({
          newCardsStudied: expect.any(Number)
        })
      );
      
      // Verify the card is removed from the current batch
      const sessionData = studySession.getSessionData();
      expect(sessionData.newCardBatches[0]).toHaveLength(0);
    });
    
    it('should not graduate a card that has not reached the threshold', async () => {
      // Create a card that's two correct answers away from graduation
      const notReadyCard = createMockNewCard('card2', 0);
      mockCardService.getCard.mockResolvedValue(notReadyCard);
      
      // Create a study session with this card
      const session = {
        id: 'session123',
        userId: mockUserId,
        startTime: new Date(),
        reviewQueue: [],
        newCardBatches: [[notReadyCard]],
        currentBatchIndex: 0,
        currentCardIndex: 0,
        isActive: true,
        sessionType: 'new-cards'
      };
      
      const studySession = new StudySession(session, mockGlobalSettings);
      
      // Process a correct answer for this card
      await studySession.processAnswer('card2', true);
      
      // Verify the card was NOT graduated
      expect(mockCardService.graduateNewCard).not.toHaveBeenCalled();
      expect(mockCardService.processCorrectAnswer).toHaveBeenCalledWith(mockUserId, 'card2');
      
      // Verify the card is still in the batch
      const sessionData = studySession.getSessionData();
      expect(sessionData.newCardBatches[0]).toHaveLength(1);
    });
    
    it('should reset progress when a card is answered incorrectly', async () => {
      // Create a card with some progress
      const progressCard = createMockNewCard('card3', 2);
      mockCardService.getCard.mockResolvedValue(progressCard);
      
      // Create a study session with this card
      const session = {
        id: 'session123',
        userId: mockUserId,
        startTime: new Date(),
        reviewQueue: [],
        newCardBatches: [[progressCard]],
        currentBatchIndex: 0,
        currentCardIndex: 0,
        isActive: true,
        sessionType: 'new-cards'
      };
      
      const studySession = new StudySession(session, mockGlobalSettings);
      
      // Process an incorrect answer for this card
      await studySession.processAnswer('card3', false);
      
      // Verify the card was not graduated
      expect(mockCardService.graduateNewCard).not.toHaveBeenCalled();
      expect(mockCardService.processIncorrectAnswer).toHaveBeenCalledWith(mockUserId, 'card3');
      
      // Verify the card is still in the batch (and actually duplicated due to reshuffling)
      const sessionData = studySession.getSessionData();
      expect(sessionData.newCardBatches[0].length).toBeGreaterThan(1);
    });
  });
});