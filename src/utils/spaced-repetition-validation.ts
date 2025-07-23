// Validation utilities for spaced repetition types
import { 
  Card, 
  SentenceCard, 
  Deck, 
  GlobalReviewSettings,
  CreateCardInput,
  CreateSentenceCardInput,
  CreateDeckInput,
  isBasicCard,
  isSentenceCard
} from '../types/spaced-repetition';
import { 
  MIN_STAGE, 
  MAX_STAGE, 
  VALIDATION_LIMITS,
  DEFAULT_DECK_SETTINGS,
  DEFAULT_GLOBAL_SETTINGS,
  CARD_TYPES,
  STUDY_ORDER
} from '../constants/spaced-repetition';

// Validation functions for type safety and data integrity

export function validateStage(stage: number): boolean {
  return Number.isInteger(stage) && stage >= MIN_STAGE && stage <= MAX_STAGE;
}

export function validateCardContent(content: string): boolean {
  return typeof content === 'string' && 
         content.trim().length > 0 && 
         content.length <= VALIDATION_LIMITS.MAX_CARD_CONTENT_LENGTH;
}

export function validateDeckName(name: string): boolean {
  return typeof name === 'string' && 
         name.trim().length > 0 && 
         name.length <= VALIDATION_LIMITS.MAX_DECK_NAME_LENGTH;
}

export function validateDeckSettings(settings: Partial<Deck['settings']>): boolean {
  if (settings.newCardsPerDay !== undefined) {
    if (!Number.isInteger(settings.newCardsPerDay) || 
        settings.newCardsPerDay < VALIDATION_LIMITS.MIN_NEW_CARDS_PER_DAY ||
        settings.newCardsPerDay > VALIDATION_LIMITS.MAX_NEW_CARDS_PER_DAY) {
      return false;
    }
  }
  
  if (settings.cardsPerBatch !== undefined) {
    if (!Number.isInteger(settings.cardsPerBatch) || 
        settings.cardsPerBatch < VALIDATION_LIMITS.MIN_CARDS_PER_BATCH ||
        settings.cardsPerBatch > VALIDATION_LIMITS.MAX_CARDS_PER_BATCH) {
      return false;
    }
  }
  
  if (settings.graduationThreshold !== undefined) {
    if (!Number.isInteger(settings.graduationThreshold) || 
        settings.graduationThreshold < VALIDATION_LIMITS.MIN_GRADUATION_THRESHOLD ||
        settings.graduationThreshold > VALIDATION_LIMITS.MAX_GRADUATION_THRESHOLD) {
      return false;
    }
  }
  
  return true;
}

export function validateCreateCardInput(input: CreateCardInput): boolean {
  return validateCardContent(input.front) &&
         validateCardContent(input.back) &&
         (input.type === CARD_TYPES.BASIC || input.type === CARD_TYPES.SENTENCE) &&
         validateStage(input.stage) &&
         typeof input.userId === 'string' &&
         typeof input.deckId === 'string' &&
         typeof input.relearning === 'boolean' &&
         typeof input.isNew === 'boolean' &&
         Number.isInteger(input.correctCount) &&
         input.correctCount >= 0;
}

export function validateCreateSentenceCardInput(input: CreateSentenceCardInput): boolean {
  return validateCreateCardInput(input) &&
         input.type === CARD_TYPES.SENTENCE &&
         validateCardContent(input.translation);
}

export function validateCreateDeckInput(input: CreateDeckInput): boolean {
  return validateDeckName(input.name) &&
         typeof input.userId === 'string' &&
         validateDeckSettings(input.settings) &&
         (input.description === undefined || 
          (typeof input.description === 'string' && 
           input.description.length <= VALIDATION_LIMITS.MAX_DECK_DESCRIPTION_LENGTH));
}

export function validateGlobalReviewSettings(settings: GlobalReviewSettings): boolean {
  return typeof settings.userId === 'string' &&
         (settings.studyOrder === STUDY_ORDER.REVIEWS_FIRST || 
          settings.studyOrder === STUDY_ORDER.NEW_FIRST);
}

// Helper functions to create default objects with proper typing
export function createDefaultDeckSettings(): Deck['settings'] {
  return { ...DEFAULT_DECK_SETTINGS };
}

export function createDefaultGlobalSettings(userId: string): GlobalReviewSettings {
  return {
    userId,
    ...DEFAULT_GLOBAL_SETTINGS
  };
}

// Type assertion helpers for runtime type checking
export function assertIsCard(obj: any): asserts obj is Card {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Object is not a Card');
  }
  
  const requiredFields = ['id', 'deckId', 'userId', 'front', 'back', 'type', 'stage', 'nextReview', 'relearning', 'isNew', 'correctCount', 'createdAt', 'totalReviews'];
  
  for (const field of requiredFields) {
    if (!(field in obj)) {
      throw new Error(`Card missing required field: ${field}`);
    }
  }
  
  if (!validateStage(obj.stage)) {
    throw new Error('Invalid stage value');
  }
  
  if (obj.type !== CARD_TYPES.BASIC && obj.type !== CARD_TYPES.SENTENCE) {
    throw new Error('Invalid card type');
  }
}

export function assertIsSentenceCard(obj: any): asserts obj is SentenceCard {
  assertIsCard(obj);
  
  if (obj.type !== CARD_TYPES.SENTENCE) {
    throw new Error('Card is not a sentence card');
  }
  
  if (!('translation' in obj) || typeof obj.translation !== 'string') {
    throw new Error('Sentence card missing translation field');
  }
}