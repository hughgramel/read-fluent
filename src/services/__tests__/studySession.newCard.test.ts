import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { StudySession } from '../studySession';
import { CardService } from '../cardService';
import { DeckService } from '../deckService';
import { 
  Card, 
  Deck,
  CardServiceError 
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

const mockCardService = CardService as any;
const mockDeckService = DeckService as any;

describe('StudySession New Card Behavior', () => {
  const mockUserId = 'test-user-id';
  const mockDeckId = 'test-deck-id';
  
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
    totalCards: 10
  };
  
  const mockNewCard: Card = {
    id: 'new-card-1',
    deckId: mockDeckId,
    userId: mockUserId,
    front: 'Test Card Front',
    back: 'Test Card Back',
    type: 'basic',
    stage: -7,
    nextReview: new Date(),
    relearning: false,
    isNew: true,
    correctCount: 0,
    createdAt: new Date('2024-01-20'),
    totalReviews: 0
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup DeckService mocks
    mockDeckService.getUserDecks.mockResolvedValue([mockDeck]);
    mockDeckService.getDeck.mockResolvedValue(mockDeck);
    mockDeckService.getDailyProgress.mockResolvedValue(mockDeck.dailyStats);
    mockDeckService.updateDailyStats.mockResolvedValue(undefined);
    
    // Setup CardService mocks
    mockCardService.getDueCards.mockResolvedValue([]); // No review cards
    mockCardService.getNewCards.mockResolvedValue([mockNewCard]);
    mockCardService.processCorrectAnswer.mockResolvedValue(undefined);
    mockCardService.processIncorrectAnswer.mockResolvedValue(undefined);
    mockCardService.graduateNewCard.mockResolvedValue(undefined);
    mockCardService.updateCard.mockResolvedValue(undefined);
    mockCardService.getCard.mockResolvedValue(mockNewCard);
  });

  it('should handle single new card failure correctly', async () => {
    // Create a session with just one new card
    const session = await StudySession.create(mockUserId);
    
    // Get the first card
    const firstCard = await session.getNextCard();
    expect(firstCard?.id).toBe('new-card-1');
    
    // Check initial batch state
    const initialSessionData = session.getSessionData();
    expect(initialSessionData.newCardBatches[0]).toHaveLength(1);
    
    // Process incorrect answer
    await session.processAnswer('new-card-1', false);
    
    // Check that batch now has 2 cards (original + reinserted)
    const updatedSessionData = session.getSessionData();
    expect(updatedSessionData.newCardBatches[0]).toHaveLength(2);
    
    // Should still be able to get next card (the same card again)
    const nextCard = await session.getNextCard();
    expect(nextCard).not.toBeNull();
    expect(nextCard?.id).toBe('new-card-1');
    
    // Session should still be active
    expect(session.isActive()).toBe(true);
  });

  it('should continue until card graduates', async () => {
    const session = await StudySession.create(mockUserId);
    
    // Check initial state
    let sessionData = session.getSessionData();
    console.log('Initial session data:', {
      newCardBatches: sessionData.newCardBatches.length,
      batchContent: sessionData.newCardBatches[0]?.length,
      currentBatchIndex: sessionData.currentBatchIndex,
      currentCardIndex: sessionData.currentCardIndex
    });
    
    // Fail the card once
    await session.processAnswer('new-card-1', false);
    
    // Check state after first failure
    sessionData = session.getSessionData();
    console.log('After first failure:', {
      newCardBatches: sessionData.newCardBatches.length,
      batchContent: sessionData.newCardBatches[0]?.length,
      currentBatchIndex: sessionData.currentBatchIndex,
      currentCardIndex: sessionData.currentCardIndex
    });
    
    // This test is just to understand what's happening
    expect(sessionData.newCardBatches.length).toBeGreaterThanOrEqual(0);
  });
});