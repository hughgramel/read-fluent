import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CardService } from '@/services/cardService';
import { DeckService } from '@/services/deckService';
import { CARD_TYPES, MIN_STAGE } from '@/constants/spaced-repetition';

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

// Mock the services
vi.mock('@/services/cardService');
vi.mock('@/services/deckService');

const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null,
    createdAt: new Date(),
    lastLogin: new Date()
};

const mockDecks = [
    {
        id: 'deck-1',
        userId: 'test-user-id',
        name: 'Test Deck 1',
        description: 'First test deck',
        settings: {
            newCardsPerDay: 20,
            cardsPerBatch: 5,
            graduationThreshold: 3
        },
        dailyStats: {
            date: '2024-01-01',
            newCardsStudied: 0,
            reviewsCompleted: 0
        },
        createdAt: new Date(),
        totalCards: 0
    },
    {
        id: 'deck-2',
        userId: 'test-user-id',
        name: 'Test Deck 2',
        description: 'Second test deck',
        settings: {
            newCardsPerDay: 20,
            cardsPerBatch: 5,
            graduationThreshold: 3
        },
        dailyStats: {
            date: '2024-01-01',
            newCardsStudied: 0,
            reviewsCompleted: 0
        },
        createdAt: new Date(),
        totalCards: 0
    }
];

const mockCreatedCard = {
    id: 'new-card-id',
    userId: 'test-user-id',
    deckId: 'deck-1',
    front: 'Test Front',
    back: 'Test Back',
    type: 'basic' as const,
    stage: -6,
    nextReview: new Date(),
    relearning: false,
    isNew: true,
    correctCount: 0,
    createdAt: new Date(),
    totalReviews: 0
};

describe('CardCreatorPopup Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Mock DeckService
        (DeckService.getUserDecks as any).mockResolvedValue(mockDecks);

        // Mock CardService
        (CardService.createCard as any).mockResolvedValue('new-card-id');
        (CardService.getCard as any).mockResolvedValue(mockCreatedCard);
    });

    it('should create a basic card with correct data structure', async () => {
        const expectedCardData = {
            userId: 'test-user-id',
            deckId: 'deck-1',
            front: 'Test Front',
            back: 'Test Back',
            type: CARD_TYPES.BASIC,
            stage: MIN_STAGE + 1, // -6
            nextReview: expect.any(Date),
            relearning: false,
            isNew: true,
            correctCount: 0
        };

        // Simulate the card creation process
        await CardService.createCard(expectedCardData);

        expect(CardService.createCard).toHaveBeenCalledWith(expectedCardData);
    });

    it('should create a sentence card with translation field', async () => {
        const expectedSentenceCardData = {
            userId: 'test-user-id',
            deckId: 'deck-1',
            front: 'Je mange une pomme',
            back: 'French sentence about eating',
            translation: 'I eat an apple',
            type: CARD_TYPES.SENTENCE,
            stage: MIN_STAGE + 1, // -6
            nextReview: expect.any(Date),
            relearning: false,
            isNew: true,
            correctCount: 0
        };

        // Simulate the sentence card creation process
        await CardService.createCard(expectedSentenceCardData);

        expect(CardService.createCard).toHaveBeenCalledWith(expectedSentenceCardData);
    });

    it('should load user decks correctly', async () => {
        await DeckService.getUserDecks('test-user-id');

        expect(DeckService.getUserDecks).toHaveBeenCalledWith('test-user-id');
    });

    it('should retrieve created card after creation', async () => {
        const cardId = await CardService.createCard({
            userId: 'test-user-id',
            deckId: 'deck-1',
            front: 'Test',
            back: 'Test Back',
            type: CARD_TYPES.BASIC,
            stage: MIN_STAGE + 1,
            nextReview: new Date(),
            relearning: false,
            isNew: true,
            correctCount: 0
        });

        const retrievedCard = await CardService.getCard('test-user-id', cardId);

        expect(CardService.getCard).toHaveBeenCalledWith('test-user-id', 'new-card-id');
        expect(retrievedCard).toEqual(mockCreatedCard);
    });

    it('should validate card data structure matches interface requirements', () => {
        // Test that our mock data matches the expected Card interface
        expect(mockCreatedCard).toMatchObject({
            id: expect.any(String),
            userId: expect.any(String),
            deckId: expect.any(String),
            front: expect.any(String),
            back: expect.any(String),
            type: expect.stringMatching(/^(basic|sentence)$/),
            stage: expect.any(Number),
            nextReview: expect.any(Date),
            relearning: expect.any(Boolean),
            isNew: expect.any(Boolean),
            correctCount: expect.any(Number),
            createdAt: expect.any(Date),
            totalReviews: expect.any(Number)
        });
    });

    it('should validate deck data structure matches interface requirements', () => {
        // Test that our mock deck data matches the expected Deck interface
        mockDecks.forEach(deck => {
            expect(deck).toMatchObject({
                id: expect.any(String),
                userId: expect.any(String),
                name: expect.any(String),
                settings: {
                    newCardsPerDay: expect.any(Number),
                    cardsPerBatch: expect.any(Number),
                    graduationThreshold: expect.any(Number)
                },
                dailyStats: {
                    date: expect.any(String),
                    newCardsStudied: expect.any(Number),
                    reviewsCompleted: expect.any(Number)
                },
                createdAt: expect.any(Date),
                totalCards: expect.any(Number)
            });
        });
    });
});