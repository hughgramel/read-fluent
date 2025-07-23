// Core data models for spaced repetition review system

// Base Card interface
export interface Card {
  id: string;
  deckId: string;
  userId: string;
  front: string;
  back: string;
  type: 'basic' | 'sentence';
  
  // Review scheduling
  stage: number; // -7 to -1
  nextReview: Date;
  relearning: boolean;
  
  // New card tracking
  isNew: boolean;
  correctCount: number; // For graduation tracking
  
  // Metadata
  createdAt: Date;
  lastReviewed?: Date;
  totalReviews: number;
}

// Sentence Card interface extending base Card
export interface SentenceCard extends Card {
  type: 'sentence';
  translation: string; // Additional field for sentence cards
}

// Daily statistics tracking
export interface DailyStats {
  date: string; // YYYY-MM-DD format
  newCardsStudied: number;
  reviewsCompleted: number;
}

// Deck settings configuration
export interface DeckSettings {
  newCardsPerDay: number; // default: 20
  cardsPerBatch: number; // default: 5
  graduationThreshold: number; // default: 3
}

// Deck interface
export interface Deck {
  id: string;
  userId: string;
  name: string;
  description?: string;
  
  // Per-deck settings
  settings: DeckSettings;
  
  // Daily tracking
  dailyStats: DailyStats;
  
  // Metadata
  createdAt: Date;
  lastStudied?: Date;
  totalCards: number;
}

// Global review settings
export interface GlobalReviewSettings {
  userId: string;
  studyOrder: 'reviews-first' | 'new-first'; // default: 'reviews-first'
}

// Study session types
export interface StudySession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  reviewQueue: Card[];
  newCardBatches: Card[][];
  currentBatchIndex: number;
  currentCardIndex: number;
  isActive: boolean;
  sessionType: 'review' | 'new-cards' | 'mixed';
}

// Session statistics
export interface SessionStats {
  totalCards: number;
  correctAnswers: number;
  incorrectAnswers: number;
  newCardsLearned: number;
  reviewsCompleted: number;
  timeSpent: number; // in milliseconds
  decksStudied: string[]; // deck IDs
}

// Progress tracking for UI
export interface StudyProgress {
  reviewsRemaining: number;
  newCardsRemaining: number;
  currentPhase: 'reviews' | 'new-cards' | 'complete';
  totalProgress: number; // percentage 0-100
}

// Error handling types
export type CardServiceErrorCode = 
  | 'NOT_FOUND' 
  | 'VALIDATION_ERROR' 
  | 'FIREBASE_ERROR' 
  | 'PERMISSION_DENIED'
  | 'NETWORK_ERROR'
  | 'CONCURRENT_UPDATE';

export class CardServiceError extends Error {
  constructor(
    message: string,
    public code: CardServiceErrorCode,
    public details?: any
  ) {
    super(message);
    this.name = 'CardServiceError';
  }
}

// Type guards for card types
export function isBasicCard(card: Card): card is Card {
  return card.type === 'basic';
}

export function isSentenceCard(card: Card): card is SentenceCard {
  return card.type === 'sentence';
}

// Utility types for card creation
export type CreateCardInput = Omit<Card, 'id' | 'createdAt' | 'totalReviews' | 'lastReviewed'>;
export type CreateSentenceCardInput = Omit<SentenceCard, 'id' | 'createdAt' | 'totalReviews' | 'lastReviewed'>;
export type CreateDeckInput = Omit<Deck, 'id' | 'createdAt' | 'lastStudied' | 'totalCards'>;

// Update types for partial updates
export type UpdateCardInput = Partial<Pick<Card, 'front' | 'back' | 'stage' | 'nextReview' | 'relearning' | 'isNew' | 'correctCount'>>;
export type UpdateSentenceCardInput = UpdateCardInput & Partial<Pick<SentenceCard, 'translation'>>;
export type UpdateDeckInput = Partial<Pick<Deck, 'name' | 'description' | 'settings'>>;