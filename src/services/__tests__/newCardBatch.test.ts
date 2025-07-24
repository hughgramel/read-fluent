import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReviewEngine } from '../reviewEngine';
import { CardService } from '../cardService';
import { DeckService } from '../deckService';
import {
  Card,
  StudySession,
  Deck
} from '../../types/spaced-repetition';
// Import necessary modules

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

describe('New Card Batch Management', () => {
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
  });

  describe('shuffleCardIntoBatch', () => {
    it('should insert card at random position within batch', () => {
      const batch = [
        createMockNewCard('card1'),
        createMockNewCard('card2'),
        createMockNewCard('card3'),
        createMockNewCard('card4'),
        createMockNewCard('card5')
      ];

      const failedCard = createMockNewCard('failed_card');
      const currentPosition = 2;

      const newBatch = ReviewEngine.shuffleCardIntoBatch(failedCard, batch, currentPosition);

      expect(newBatch).toHaveLength(6);
      expect(newBatch).toContain(failedCard);

      const insertIndex = newBatch.findIndex(card => card.id === 'failed_card');
      expect(insertIndex).toBeGreaterThan(currentPosition);
    });

    it('should handle insertion at end of batch', () => {
      const batch = [createMockNewCard('card1')];
      const failedCard = createMockNewCard('failed_card');
      const currentPosition = 0;

      const newBatch = ReviewEngine.shuffleCardIntoBatch(failedCard, batch, currentPosition);

      expect(newBatch).toHaveLength(2);
      expect(newBatch[1]).toEqual(failedCard);
    });
  });

  describe('New Card Incorrect Answer Processing', () => {
    let session: StudySession;
    let newCards: Card[];

    beforeEach(() => {
      newCards = [
        createMockNewCard('card_a', 1),
        createMockNewCard('card_b', 0),
        createMockNewCard('card_c', 2)
      ];

      session = {
        id: 'session123',
        userId: mockUserId,
        startTime: new Date(),
        reviewQueue: [],
        newCardBatches: [newCards],
        currentBatchIndex: 0,
        currentCardIndex: 0,
        isActive: true,
        sessionType: 'new-cards'
      };
    });

    it('should reinsert failed new card into current batch', async () => {
      const failedCard = newCards[0];
      mockCardService.getCard.mockResolvedValue(failedCard);

      const initialBatchLength = session.newCardBatches[0].length;

      await ReviewEngine.processAnswer(session, 'card_a', false);

      expect(session.newCardBatches[0]).toHaveLength(initialBatchLength + 1);

      const cardACount = session.newCardBatches[0].filter(card => card.id === 'card_a').length;
      expect(cardACount).toBe(2);

      // Position should advance after processing incorrect answer
      expect(session.currentCardIndex).toBe(1);
    });

    it('should reset correct count for failed new card', async () => {
      const failedCard = newCards[0];
      mockCardService.getCard.mockResolvedValue(failedCard);

      await ReviewEngine.processAnswer(session, 'card_a', false);

      expect(mockCardService.processIncorrectAnswer).toHaveBeenCalledWith(mockUserId, 'card_a');
    });
  });

  describe('Complete New Card Flow', () => {
    let session: StudySession;
    let newCards: Card[];

    beforeEach(() => {
      newCards = [
        createMockNewCard('card_a', 0),
        createMockNewCard('card_b', 0),
        createMockNewCard('card_c', 0)
      ];

      session = {
        id: 'session123',
        userId: mockUserId,
        startTime: new Date(),
        reviewQueue: [],
        newCardBatches: [newCards.slice()], // Copy to avoid mutation
        currentBatchIndex: 0,
        currentCardIndex: 0,
        isActive: true,
        sessionType: 'new-cards'
      };
    });

    it('should handle complete new card learning flow', async () => {
      // Scenario: Test the core behavior of new card learning with failures and successes

      // Step 1: Fail card_a (correctCount: 0 -> reset to 0)
      mockCardService.getCard.mockResolvedValue(newCards[0]);
      await ReviewEngine.processAnswer(session, 'card_a', false);

      // Batch should now have 4 cards (original 3 + reinserted card_a)
      expect(session.newCardBatches[0]).toHaveLength(4);
      expect(session.currentCardIndex).toBe(1); // Position advances after processing failure

      // Step 2: Process several more cards to verify the flow continues
      for (let i = 0; i < 3; i++) {
        const nextCard = await ReviewEngine.getNextCard(session);
        expect(nextCard).not.toBeNull(); // Should have cards available

        if (nextCard) {
          // Find the card data for mocking
          const cardData = newCards.find(card => card.id === nextCard.id) || newCards[0];
          mockCardService.getCard.mockResolvedValue(cardData);

          // Process the card (mix of correct and incorrect for realism)
          const isCorrect = i > 0; // First one fails, others succeed
          await ReviewEngine.processAnswer(session, nextCard.id, isCorrect);

          if (!isCorrect) {
            // If we failed another card, batch should grow
            expect(session.newCardBatches[0].length).toBeGreaterThan(4);
          }
        }
      }

      // Verify session is still active with cards remaining
      expect(session.isActive).toBe(true);

      // Verify we can still get more cards
      const finalCard = await ReviewEngine.getNextCard(session);
      expect(finalCard).not.toBeNull();
    });

    it('should complete session when all cards graduate', async () => {
      // Create cards that are close to graduation
      const almostGraduatedCards = [
        createMockNewCard('card_a', 2), // Will graduate on next correct
        createMockNewCard('card_b', 2), // Will graduate on next correct
        createMockNewCard('card_c', 2)  // Will graduate on next correct
      ];

      session.newCardBatches = [almostGraduatedCards.slice()];

      // Graduate all cards
      for (let i = 0; i < almostGraduatedCards.length; i++) {
        const card = almostGraduatedCards[i];
        mockCardService.getCard.mockResolvedValue(card);

        await ReviewEngine.processAnswer(session, card.id, true);

        // Verify graduation was called
        expect(mockCardService.graduateNewCard).toHaveBeenCalledWith(mockUserId, card.id);
      }

      // Session should complete when no more cards remain
      const nextCard = await ReviewEngine.getNextCard(session);
      expect(nextCard).toBeNull();
      expect(session.isActive).toBe(false);
    });

    it('should handle mixed correct and incorrect answers', async () => {
      // Simulate a realistic learning session with mixed results

      // Fail card_a twice, then succeed 3 times to graduate
      const cardA = createMockNewCard('card_a', 0);

      // First failure
      mockCardService.getCard.mockResolvedValue(cardA);
      await ReviewEngine.processAnswer(session, 'card_a', false);
      expect(session.newCardBatches[0]).toHaveLength(4); // Card reinserted

      // Move to next cards and come back to card_a
      session.currentCardIndex = 1;

      // Second failure when we see card_a again
      mockCardService.getCard.mockResolvedValue(cardA);
      await ReviewEngine.processAnswer(session, 'card_a', false);
      expect(session.newCardBatches[0]).toHaveLength(5); // Card reinserted again

      // Now succeed 3 times to graduate
      for (let i = 0; i < 3; i++) {
        const graduatingCard = createMockNewCard('card_a', i);
        mockCardService.getCard.mockResolvedValue(graduatingCard);

        await ReviewEngine.processAnswer(session, 'card_a', true);

        if (i === 2) {
          // Should graduate on the 3rd correct answer
          expect(mockCardService.graduateNewCard).toHaveBeenCalledWith(mockUserId, 'card_a');
        }
      }
    });
  });
});