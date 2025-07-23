// Constants for spaced repetition review system

// Stage intervals mapping for spaced repetition algorithm
// Each stage has multiple possible intervals to allow load balancing
export const STAGE_INTERVALS: Record<string, number[]> = {
  "-7": [0], // Immediate review (failed cards)
  "-6": [1], // 1 day
  "-5": [2, 3], // 2-3 days
  "-4": [6, 7, 8], // 6-8 days
  "-3": [15, 16, 17, 18], // 15-18 days
  "-2": [37, 38, 39, 40, 41, 42], // 37-42 days
  "-1": [94, 95, 96, 97, 98, 99, 100, 101] // 94-101 days
};

// Valid stage range
export const MIN_STAGE = -7;
export const MAX_STAGE = -1;

// Default deck settings
export const DEFAULT_DECK_SETTINGS = {
  newCardsPerDay: 20,
  cardsPerBatch: 5,
  graduationThreshold: 3
} as const;

// Default global review settings
export const DEFAULT_GLOBAL_SETTINGS = {
  studyOrder: 'reviews-first' as const
};

// Card type constants
export const CARD_TYPES = {
  BASIC: 'basic' as const,
  SENTENCE: 'sentence' as const
};

// Study order options
export const STUDY_ORDER = {
  REVIEWS_FIRST: 'reviews-first' as const,
  NEW_FIRST: 'new-first' as const
} as const;

// Session phase constants
export const SESSION_PHASES = {
  REVIEWS: 'reviews' as const,
  NEW_CARDS: 'new-cards' as const,
  COMPLETE: 'complete' as const
} as const;

// Validation constants
export const VALIDATION_LIMITS = {
  MAX_CARD_CONTENT_LENGTH: 5000,
  MAX_DECK_NAME_LENGTH: 100,
  MAX_DECK_DESCRIPTION_LENGTH: 500,
  MIN_GRADUATION_THRESHOLD: 1,
  MAX_GRADUATION_THRESHOLD: 10,
  MIN_NEW_CARDS_PER_DAY: 1,
  MAX_NEW_CARDS_PER_DAY: 100,
  MIN_CARDS_PER_BATCH: 1,
  MAX_CARDS_PER_BATCH: 20
} as const;

// Error messages
export const ERROR_MESSAGES = {
  CARD_NOT_FOUND: 'Card not found',
  DECK_NOT_FOUND: 'Deck not found',
  INVALID_STAGE: 'Invalid stage value',
  INVALID_CARD_TYPE: 'Invalid card type',
  VALIDATION_FAILED: 'Validation failed',
  FIREBASE_ERROR: 'Database operation failed',
  PERMISSION_DENIED: 'Permission denied',
  NETWORK_ERROR: 'Network connection failed',
  CONCURRENT_UPDATE: 'Concurrent update detected'
} as const;

// Firebase collection names
export const COLLECTIONS = {
  USERS: 'users',
  DECKS: 'decks',
  CARDS: 'cards',
  REVIEW_SETTINGS: 'reviewSettings'
} as const;

// Date format constants
export const DATE_FORMATS = {
  DAILY_STATS: 'YYYY-MM-DD'
} as const;

// Queue management constants
export const QUEUE_CONFIG = {
  MAX_RANDOM_INSERTION_POSITIONS: 5, // For failed card reinsertion
  BATCH_PROCESSING_SIZE: 50 // For large deck operations
} as const;