import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { 
  Card, 
  SentenceCard, 
  Deck,
  StudySession,
  SessionStats,
  StudyProgress,
  GlobalReviewSettings,
  CardServiceError
} from '../types/spaced-repetition';
import { 
  STAGE_INTERVALS,
  MIN_STAGE,
  MAX_STAGE,
  COLLECTIONS,
  ERROR_MESSAGES,
  DEFAULT_GLOBAL_SETTINGS,
  QUEUE_CONFIG
} from '../constants/spaced-repetition';
import { CardService } from './cardService';
import { DeckService } from './deckService';

const db = getFirestore();

/**
 * ReviewEngine implements the core spaced repetition algorithm with stage-based scheduling,
 * load balancing, queue management, and new card graduation logic
 */
export class ReviewEngine {
  
  /**
   * Creates a study session for a user with all due cards and new cards up to daily limits
   * @param userId - User ID to create session for
   * @returns Promise resolving to a StudySession
   */
  static async createStudySession(userId: string): Promise<StudySession> {
    try {
      // Get user's global settings
      const globalSettings = await this.getGlobalSettings(userId);
      
      // Get all user decks
      const decks = await DeckService.getUserDecks(userId);
      
      // Build review queue and new card batches
      const reviewQueue = await this.buildReviewQueue(userId, decks);
      const newCardBatches = await this.buildNewCardBatches(userId, decks);
      
      // Create session based on study order preference
      const session: StudySession = {
        id: this.generateSessionId(),
        userId,
        startTime: new Date(),
        reviewQueue: globalSettings.studyOrder === 'reviews-first' ? reviewQueue : [],
        newCardBatches: globalSettings.studyOrder === 'new-first' ? newCardBatches : [],
        currentBatchIndex: 0,
        currentCardIndex: 0,
        isActive: true,
        sessionType: this.determineSessionType(reviewQueue, newCardBatches)
      };
      
      // If mixed order, we'll handle the alternation in getNextCard
      if (globalSettings.studyOrder === 'reviews-first' && newCardBatches.length > 0) {
        // Store new card batches for later use
        (session as any).pendingNewCardBatches = newCardBatches;
      } else if (globalSettings.studyOrder === 'new-first' && reviewQueue.length > 0) {
        // Store review queue for later use
        (session as any).pendingReviewQueue = reviewQueue;
      }
      
      return session;
    } catch (error) {
      throw this.handleError(error, 'Failed to create study session');
    }
  }
  
  /**
   * Gets the next card in the study session
   * @param session - Current study session
   * @returns Promise resolving to the next card or null if session is complete
   */
  static async getNextCard(session: StudySession): Promise<Card | SentenceCard | null> {
    try {
      if (!session.isActive) {
        return null;
      }
      
      // Handle review cards first (if reviews-first order or currently in review phase)
      if (session.reviewQueue.length > 0 && session.currentCardIndex < session.reviewQueue.length) {
        return session.reviewQueue[session.currentCardIndex];
      }
      
      // Handle new card batches
      if (session.newCardBatches.length > 0 && session.currentBatchIndex < session.newCardBatches.length) {
        const currentBatch = session.newCardBatches[session.currentBatchIndex];
        const cardIndexInBatch = session.currentCardIndex - session.reviewQueue.length;
        
        if (cardIndexInBatch < currentBatch.length) {
          return currentBatch[cardIndexInBatch];
        }
      }
      
      // Check for pending queues (mixed study order)
      const pendingReviewQueue = (session as any).pendingReviewQueue;
      const pendingNewCardBatches = (session as any).pendingNewCardBatches;
      
      // Switch to pending review queue if new cards are done
      if (pendingReviewQueue && pendingReviewQueue.length > 0) {
        session.reviewQueue = pendingReviewQueue;
        session.currentCardIndex = 0;
        delete (session as any).pendingReviewQueue;
        return session.reviewQueue[0];
      }
      
      // Switch to pending new card batches if reviews are done
      if (pendingNewCardBatches && pendingNewCardBatches.length > 0) {
        session.newCardBatches = pendingNewCardBatches;
        session.currentBatchIndex = 0;
        session.currentCardIndex = session.reviewQueue.length;
        delete (session as any).pendingNewCardBatches;
        
        if (session.newCardBatches[0] && session.newCardBatches[0].length > 0) {
          return session.newCardBatches[0][0];
        }
      }
      
      // Session is complete
      session.isActive = false;
      session.endTime = new Date();
      return null;
    } catch (error) {
      throw this.handleError(error, 'Failed to get next card');
    }
  }
  
  /**
   * Processes an answer for a card in the study session
   * @param session - Current study session
   * @param cardId - ID of the card being answered
   * @param correct - Whether the answer was correct
   */
  static async processAnswer(
    session: StudySession, 
    cardId: string, 
    correct: boolean
  ): Promise<void> {
    try {
      const card = await CardService.getCard(session.userId, cardId);
      if (!card) {
        throw new CardServiceError(ERROR_MESSAGES.CARD_NOT_FOUND, 'NOT_FOUND');
      }
      
      if (correct) {
        await this.processCorrectAnswer(session, card);
      } else {
        await this.processIncorrectAnswer(session, card);
      }
      
      // Advance to next card
      this.advanceSessionPosition(session);
    } catch (error) {
      throw this.handleError(error, 'Failed to process answer');
    }
  }
  
  /**
   * Calculates the next review date for a card based on its stage and load balancing
   * @param stage - Current stage of the card (-7 to -1)
   * @param deckId - Deck ID for load balancing within deck
   * @param userId - User ID who owns the card
   * @returns Promise resolving to the optimal next review date
   */
  static async calculateNextReviewDate(stage: number, deckId: string, userId: string): Promise<Date> {
    try {
      if (stage < MIN_STAGE || stage > MAX_STAGE) {
        throw new CardServiceError(ERROR_MESSAGES.INVALID_STAGE, 'VALIDATION_ERROR');
      }
      
      const intervals = STAGE_INTERVALS[stage.toString()];
      if (!intervals || intervals.length === 0) {
        throw new CardServiceError('No intervals defined for stage', 'VALIDATION_ERROR');
      }
      
      return await this.findOptimalReviewDate(intervals, deckId, userId);
    } catch (error) {
      throw this.handleError(error, 'Failed to calculate next review date');
    }
  }
  
  /**
   * Finds the optimal review date from available intervals using load balancing
   * @param intervals - Array of possible intervals in days
   * @param deckId - Deck ID for load balancing
   * @param userId - User ID who owns the cards
   * @returns Promise resolving to the date with minimum card load
   */
  static async findOptimalReviewDate(intervals: number[], deckId: string, userId: string): Promise<Date> {
    try {
      const today = new Date();
      const candidateDates: { date: Date; count: number }[] = [];
      
      // Calculate candidate dates and their current card counts
      for (const interval of intervals) {
        const candidateDate = new Date(today);
        candidateDate.setDate(today.getDate() + interval);
        candidateDate.setHours(0, 0, 0, 0); // Normalize to start of day
        
        const count = await this.getCardCountForDate(candidateDate, deckId, userId);
        candidateDates.push({ date: candidateDate, count });
      }
      
      // Find the date with minimum card count
      const optimalDate = candidateDates.reduce((min, current) => 
        current.count < min.count ? current : min
      );
      
      return optimalDate.date;
    } catch (error) {
      throw this.handleError(error, 'Failed to find optimal review date');
    }
  }
  
  /**
   * Builds the review queue for all user decks with due cards
   * @param userId - User ID to build queue for
   * @param decks - Array of user decks
   * @returns Promise resolving to array of due cards
   */
  static async buildReviewQueue(userId: string, decks: Deck[]): Promise<(Card | SentenceCard)[]> {
    try {
      const reviewQueue: (Card | SentenceCard)[] = [];
      
      for (const deck of decks) {
        const dueCards = await CardService.getDueCards(userId, deck.id);
        reviewQueue.push(...dueCards);
      }
      
      // Shuffle the queue to mix cards from different decks
      return this.shuffleArray(reviewQueue);
    } catch (error) {
      throw this.handleError(error, 'Failed to build review queue');
    }
  }
  
  /**
   * Builds new card batches for all user decks respecting daily limits
   * @param userId - User ID to build batches for
   * @param decks - Array of user decks
   * @returns Promise resolving to array of card batches
   */
  static async buildNewCardBatches(userId: string, decks: Deck[]): Promise<(Card | SentenceCard)[][]> {
    try {
      const allBatches: (Card | SentenceCard)[][] = [];
      
      for (const deck of decks) {
        const dailyProgress = await DeckService.getDailyProgress(userId, deck.id);
        const remainingNewCards = Math.max(0, deck.settings.newCardsPerDay - dailyProgress.newCardsStudied);
        
        if (remainingNewCards > 0) {
          const newCards = await CardService.getNewCards(userId, deck.id, remainingNewCards);
          const batches = this.createBatches(newCards, deck.settings.cardsPerBatch);
          allBatches.push(...batches);
        }
      }
      
      return allBatches;
    } catch (error) {
      throw this.handleError(error, 'Failed to build new card batches');
    }
  }
  
  /**
   * Shuffles a card back into the queue at a random position for failed cards
   * @param card - Card to insert
   * @param queue - Current card queue
   * @param currentPosition - Current position in queue
   * @returns Updated queue with card inserted
   */
  static shuffleCardIntoQueue(
    card: Card | SentenceCard, 
    queue: (Card | SentenceCard)[], 
    currentPosition: number
  ): (Card | SentenceCard)[] {
    const maxPositions = Math.min(QUEUE_CONFIG.MAX_RANDOM_INSERTION_POSITIONS, queue.length - currentPosition);
    const randomOffset = Math.floor(Math.random() * maxPositions) + 1;
    const insertPosition = Math.min(currentPosition + randomOffset, queue.length);
    
    const newQueue = [...queue];
    newQueue.splice(insertPosition, 0, card);
    
    return newQueue;
  }
  
  /**
   * Gets study progress information for the session
   * @param session - Current study session
   * @returns Study progress information
   */
  static getStudyProgress(session: StudySession): StudyProgress {
    const reviewsRemaining = Math.max(0, session.reviewQueue.length - session.currentCardIndex);
    
    let newCardsRemaining = 0;
    if (session.newCardBatches.length > 0) {
      for (let i = session.currentBatchIndex; i < session.newCardBatches.length; i++) {
        const batch = session.newCardBatches[i];
        if (i === session.currentBatchIndex) {
          const cardIndexInBatch = session.currentCardIndex - session.reviewQueue.length;
          // Only calculate remaining if we've started this batch (cardIndexInBatch >= 0)
          if (cardIndexInBatch >= 0) {
            newCardsRemaining += Math.max(0, batch.length - cardIndexInBatch);
          } else {
            // Haven't started new cards yet, all cards in this batch remain
            newCardsRemaining += batch.length;
          }
        } else {
          newCardsRemaining += batch.length;
        }
      }
    }
    
    // Add pending queues
    const pendingReviewQueue = (session as any).pendingReviewQueue;
    const pendingNewCardBatches = (session as any).pendingNewCardBatches;
    
    if (pendingReviewQueue) {
      newCardsRemaining += pendingReviewQueue.length;
    }
    
    if (pendingNewCardBatches) {
      for (const batch of pendingNewCardBatches) {
        newCardsRemaining += batch.length;
      }
    }
    
    const totalCards = reviewsRemaining + newCardsRemaining;
    const completedCards = (session.reviewQueue.length + this.getTotalNewCards(session)) - totalCards;
    const totalProgress = totalCards > 0 ? Math.round((completedCards / (completedCards + totalCards)) * 100) : 100;
    
    let currentPhase: 'reviews' | 'new-cards' | 'complete' = 'complete';
    if (reviewsRemaining > 0) {
      currentPhase = 'reviews';
    } else if (newCardsRemaining > 0) {
      currentPhase = 'new-cards';
    }
    
    return {
      reviewsRemaining,
      newCardsRemaining,
      currentPhase,
      totalProgress
    };
  }
  
  // Private helper methods
  
  /**
   * Processes a correct answer for a card
   */
  private static async processCorrectAnswer(session: StudySession, card: Card | SentenceCard): Promise<void> {
    if (card.isNew) {
      // Handle new card correct answer
      await CardService.processCorrectAnswer(session.userId, card.id);
      
      // Check if card should graduate
      const deck = await DeckService.getDeck(session.userId, card.deckId);
      if (!deck) {
        throw new CardServiceError(ERROR_MESSAGES.DECK_NOT_FOUND, 'NOT_FOUND');
      }
      
      if (card.correctCount + 1 >= deck.settings.graduationThreshold) {
        await CardService.graduateNewCard(session.userId, card.id);
        await this.scheduleGraduatedCard(session.userId, card.id, card.deckId);
        
        // Update daily stats
        await DeckService.updateDailyStats(session.userId, card.deckId, {
          newCardsStudied: (await DeckService.getDailyProgress(session.userId, card.deckId)).newCardsStudied + 1
        });
        
        // Add a new card to maintain batch size if available
        await this.addNewCardToBatch(session, card.deckId);
      }
    } else {
      // Handle review card correct answer
      await CardService.processCorrectAnswer(session.userId, card.id);
      
      // Schedule next review
      const newStage = Math.min(card.stage + 1, MAX_STAGE);
      const nextReviewDate = await this.calculateNextReviewDate(newStage, card.deckId, session.userId);
      
      await CardService.updateCard(session.userId, card.id, {
        stage: newStage,
        nextReview: nextReviewDate,
        relearning: false
      });
      
      // Update daily stats
      await DeckService.updateDailyStats(session.userId, card.deckId, {
        reviewsCompleted: (await DeckService.getDailyProgress(session.userId, card.deckId)).reviewsCompleted + 1
      });
    }
  }
  
  /**
   * Processes an incorrect answer for a card
   */
  private static async processIncorrectAnswer(session: StudySession, card: Card | SentenceCard): Promise<void> {
    if (card.isNew) {
      // Reset correct count for new cards
      await CardService.processIncorrectAnswer(session.userId, card.id);
    } else {
      // Reset stage and set relearning for review cards
      await CardService.processIncorrectAnswer(session.userId, card.id);
      
      // Insert card back into queue at random position
      session.reviewQueue = this.shuffleCardIntoQueue(card, session.reviewQueue, session.currentCardIndex);
    }
  }
  
  /**
   * Schedules a newly graduated card for its first review
   */
  private static async scheduleGraduatedCard(userId: string, cardId: string, deckId: string): Promise<void> {
    const nextReviewDate = await this.calculateNextReviewDate(MIN_STAGE + 1, deckId, userId);
    
    await CardService.updateCard(userId, cardId, {
      nextReview: nextReviewDate
    });
  }
  
  /**
   * Adds a new card to the current batch to maintain batch size
   */
  private static async addNewCardToBatch(session: StudySession, deckId: string): Promise<void> {
    const deck = await DeckService.getDeck(session.userId, deckId);
    if (!deck) return;
    
    const dailyProgress = await DeckService.getDailyProgress(session.userId, deckId);
    const remainingNewCards = Math.max(0, deck.settings.newCardsPerDay - dailyProgress.newCardsStudied);
    
    if (remainingNewCards > 0) {
      const newCards = await CardService.getNewCards(session.userId, deckId, 1);
      if (newCards.length > 0 && session.currentBatchIndex < session.newCardBatches.length) {
        session.newCardBatches[session.currentBatchIndex].push(newCards[0]);
      }
    }
  }
  
  /**
   * Advances the session position to the next card
   */
  private static advanceSessionPosition(session: StudySession): void {
    session.currentCardIndex++;
    
    // Check if we need to move to the next batch
    if (session.newCardBatches.length > 0 && session.currentBatchIndex < session.newCardBatches.length) {
      const currentBatch = session.newCardBatches[session.currentBatchIndex];
      const cardIndexInBatch = session.currentCardIndex - session.reviewQueue.length;
      
      if (cardIndexInBatch >= currentBatch.length) {
        session.currentBatchIndex++;
        // Reset card index for new batch
        if (session.currentBatchIndex < session.newCardBatches.length) {
          session.currentCardIndex = session.reviewQueue.length;
        }
      }
    }
  }
  
  /**
   * Gets the count of cards scheduled for a specific date in a deck
   */
  private static async getCardCountForDate(date: Date, deckId: string, userId: string): Promise<number> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const cardsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.CARDS);
      const q = query(
        cardsRef,
        where('deckId', '==', deckId),
        where('nextReview', '>=', Timestamp.fromDate(startOfDay)),
        where('nextReview', '<=', Timestamp.fromDate(endOfDay))
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      // If query fails, return 0 to avoid blocking scheduling
      console.warn('Failed to get card count for date:', error);
      return 0;
    }
  }
  
  /**
   * Gets global review settings for a user
   */
  private static async getGlobalSettings(userId: string): Promise<GlobalReviewSettings> {
    try {
      const settingsRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.REVIEW_SETTINGS, 'global');
      const settingsSnap = await getDoc(settingsRef);
      
      if (settingsSnap.exists()) {
        return settingsSnap.data() as GlobalReviewSettings;
      } else {
        return {
          userId,
          ...DEFAULT_GLOBAL_SETTINGS
        };
      }
    } catch (error) {
      // Return defaults if settings can't be loaded
      return {
        userId,
        ...DEFAULT_GLOBAL_SETTINGS
      };
    }
  }
  
  /**
   * Creates batches from an array of cards
   */
  private static createBatches(cards: (Card | SentenceCard)[], batchSize: number): (Card | SentenceCard)[][] {
    const batches: (Card | SentenceCard)[][] = [];
    
    for (let i = 0; i < cards.length; i += batchSize) {
      batches.push(cards.slice(i, i + batchSize));
    }
    
    return batches;
  }
  
  /**
   * Shuffles an array using Fisher-Yates algorithm
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }
  
  /**
   * Determines the session type based on available cards
   */
  private static determineSessionType(
    reviewQueue: (Card | SentenceCard)[], 
    newCardBatches: (Card | SentenceCard)[][]
  ): 'review' | 'new-cards' | 'mixed' {
    const hasReviews = reviewQueue.length > 0;
    const hasNewCards = newCardBatches.length > 0 && newCardBatches.some(batch => batch.length > 0);
    
    if (hasReviews && hasNewCards) {
      return 'mixed';
    } else if (hasReviews) {
      return 'review';
    } else if (hasNewCards) {
      return 'new-cards';
    } else {
      return 'mixed'; // Default fallback
    }
  }
  
  /**
   * Gets total number of new cards in session
   */
  private static getTotalNewCards(session: StudySession): number {
    let total = 0;
    for (const batch of session.newCardBatches) {
      total += batch.length;
    }
    
    const pendingNewCardBatches = (session as any).pendingNewCardBatches;
    if (pendingNewCardBatches) {
      for (const batch of pendingNewCardBatches) {
        total += batch.length;
      }
    }
    
    return total;
  }
  
  /**
   * Generates a unique session ID
   */
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Handles errors and converts them to CardServiceError
   */
  private static handleError(error: any, defaultMessage: string): CardServiceError {
    console.error('ReviewEngine Error:', error);
    
    if (error instanceof CardServiceError) {
      return error;
    }
    
    return new CardServiceError(
      error?.message || defaultMessage,
      'FIREBASE_ERROR',
      error
    );
  }
}