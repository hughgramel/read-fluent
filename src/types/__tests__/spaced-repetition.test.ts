// Tests for spaced repetition types and validation
import { 
  Card, 
  SentenceCard, 
  isBasicCard, 
  isSentenceCard,
  CreateCardInput,
  CreateSentenceCardInput
} from '../spaced-repetition';
import { 
  validateStage,
  validateCardContent,
  validateCreateCardInput,
  validateCreateSentenceCardInput,
  createDefaultDeckSettings,
  createDefaultGlobalSettings
} from '../../utils/spaced-repetition-validation';
import { CARD_TYPES, MIN_STAGE, MAX_STAGE } from '../../constants/spaced-repetition';

describe('Spaced Repetition Types', () => {
  describe('Type Guards', () => {
    const basicCard: Card = {
      id: 'card1',
      deckId: 'deck1',
      userId: 'user1',
      front: 'Front content',
      back: 'Back content',
      type: 'basic',
      stage: -7,
      nextReview: new Date(),
      relearning: false,
      isNew: true,
      correctCount: 0,
      createdAt: new Date(),
      totalReviews: 0
    };

    const sentenceCard: SentenceCard = {
      ...basicCard,
      type: 'sentence',
      translation: 'Translation content'
    };

    test('isBasicCard should correctly identify basic cards', () => {
      expect(isBasicCard(basicCard)).toBe(true);
      expect(isBasicCard(sentenceCard)).toBe(false);
    });

    test('isSentenceCard should correctly identify sentence cards', () => {
      expect(isSentenceCard(sentenceCard)).toBe(true);
      expect(isSentenceCard(basicCard)).toBe(false);
    });
  });

  describe('Validation Functions', () => {
    test('validateStage should validate stage ranges', () => {
      expect(validateStage(MIN_STAGE)).toBe(true);
      expect(validateStage(MAX_STAGE)).toBe(true);
      expect(validateStage(-5)).toBe(true);
      expect(validateStage(-8)).toBe(false);
      expect(validateStage(0)).toBe(false);
      expect(validateStage(1.5)).toBe(false);
    });

    test('validateCardContent should validate content', () => {
      expect(validateCardContent('Valid content')).toBe(true);
      expect(validateCardContent('')).toBe(false);
      expect(validateCardContent('   ')).toBe(false);
      expect(validateCardContent('a'.repeat(6000))).toBe(false);
    });

    test('validateCreateCardInput should validate card creation input', () => {
      const validInput: CreateCardInput = {
        deckId: 'deck1',
        userId: 'user1',
        front: 'Front',
        back: 'Back',
        type: 'basic',
        stage: -7,
        nextReview: new Date(),
        relearning: false,
        isNew: true,
        correctCount: 0
      };

      expect(validateCreateCardInput(validInput)).toBe(true);
      
      const invalidInput = { ...validInput, front: '' };
      expect(validateCreateCardInput(invalidInput)).toBe(false);
    });

    test('validateCreateSentenceCardInput should validate sentence card input', () => {
      const validInput: CreateSentenceCardInput = {
        deckId: 'deck1',
        userId: 'user1',
        front: 'Front',
        back: 'Back',
        type: 'sentence',
        translation: 'Translation',
        stage: -7,
        nextReview: new Date(),
        relearning: false,
        isNew: true,
        correctCount: 0
      };

      expect(validateCreateSentenceCardInput(validInput)).toBe(true);
      
      const invalidInput = { ...validInput, translation: '' };
      expect(validateCreateSentenceCardInput(invalidInput)).toBe(false);
    });
  });

  describe('Default Creators', () => {
    test('createDefaultDeckSettings should return valid settings', () => {
      const settings = createDefaultDeckSettings();
      expect(settings.newCardsPerDay).toBe(20);
      expect(settings.cardsPerBatch).toBe(5);
      expect(settings.graduationThreshold).toBe(3);
    });

    test('createDefaultGlobalSettings should return valid settings', () => {
      const settings = createDefaultGlobalSettings('user1');
      expect(settings.userId).toBe('user1');
      expect(settings.studyOrder).toBe('reviews-first');
    });
  });
});