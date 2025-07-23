import { 
  Card, 
  SentenceCard, 
  Deck,
  StudySession as IStudySession,
  SessionStats,
  StudyProgress,
  GlobalReviewSettings,
  CardServiceError
} from '../types/spaced-repetition';
import { 
  DEFAULT_GLOBAL_SETTINGS,
  QUEUE_CONFIG,
  ERROR_MESSAGES
} from '../constants/spaced-repetition';
import { CardService } from './cardService';
import { DeckService } from './deckService';
import { ReviewEngine } from './reviewEngine';

/**
 * StudySession class manages card queues, session state, and progress tracking
 * for spaced repetition study sessions
 */
export class StudySession {
  private session: IStudySession;
  private stats: SessionStats;
  private globalSettings: GlobalReviewSettings;
  
  constructor(session: IStudySession, globalSettings: GlobalReviewSettings) {
    this.session = session;
    this.globalSettings = globalSettings;
    this.stats = {
      totalCards: this.getTotalCardCount(),
      correctAnswers: 0,
      incorrectAnswers: 0,
      newCardsLearned: 0,
      reviewsCompleted: 0,
      timeSpent: 0,
      decksStudied: this.getUniqueDecks()
    };
  }
  
  /**
   * Creates a new study session for a user
   * @param userId - User ID to create session for
   * @returns Promise resolving to a StudySession instance
   */
  static async create(userId: string): Promise<StudySession> {
    try {
      // Get user's global settings
      const globalSettings = await StudySession.getGlobalSettings(userId);
      
      // Get all user decks
      const decks = await DeckService.getUserDecks(userId);
      
      // Build review queue and new card batches
      const reviewQueue = await StudySession.buildReviewQueue(userId, decks);
      const newCardBatches = await StudySession.buildNewCardBatches(userId, decks);
      
      // Create session based on study order preference
      const sessionData: IStudySession = {
        id: StudySession.generateSessionId(),
        userId,
        startTime: new Date(),
        reviewQueue: globalSettings.studyOrder === 'reviews-first' ? reviewQueue : [],
        newCardBatches: globalSettings.studyOrder === 'new-first' ? newCardBatches : [],
        currentBatchIndex: 0,
        currentCardIndex: 0,
        isActive: true,
        sessionType: StudySession.determineSessionType(reviewQueue, newCardBatches)
      };
      
      // Store pending queues for mixed study order
      if (globalSettings.studyOrder === 'reviews-first' && newCardBatches.length > 0) {
        (sessionData as any).pendingNewCardBatches = newCardBatches;
      } else if (globalSettings.studyOrder === 'new-first' && reviewQueue.length > 0) {
        (sessionData as any).pendingReviewQueue = reviewQueue;
      }
      
      return new StudySession(sessionData, globalSettings);
    } catch (error) {
      throw StudySession.handleError(error, 'Failed to create study session');
    }
  }
  
  /**
   * Gets the next card in the study session
   * @returns Promise resolving to the next card or null if session is complete
   */
  async getNextCard(): Promise<Card | SentenceCard | null> {
    try {
      if (!this.session.isActive) {
        return null;
      }
      
      // Handle review cards first (if reviews-first order or currently in review phase)
      if (this.session.reviewQueue.length > 0 && this.session.currentCardIndex < this.session.reviewQueue.length) {
        return this.session.reviewQueue[this.session.currentCardIndex];
      }
      
      // Handle new card batches
      if (this.session.newCardBatches.length > 0 && this.session.currentBatchIndex < this.session.newCardBatches.length) {
        const currentBatch = this.session.newCardBatches[this.session.currentBatchIndex];
        const cardIndexInBatch = this.session.currentCardIndex - this.session.reviewQueue.length;
        
        if (cardIndexInBatch >= 0 && cardIndexInBatch < currentBatch.length) {
          return currentBatch[cardIndexInBatch];
        }
      }
      
      // Check for pending queues (mixed study order)
      const pendingReviewQueue = (this.session as any).pendingReviewQueue;
      const pendingNewCardBatches = (this.session as any).pendingNewCardBatches;
      
      // Switch to pending review queue if new cards are done
      if (pendingReviewQueue && pendingReviewQueue.length > 0) {
        this.session.reviewQueue = pendingReviewQueue;
        this.session.currentCardIndex = 0;
        delete (this.session as any).pendingReviewQueue;
        return this.session.reviewQueue[0];
      }
      
      // Switch to pending new card batches if reviews are done
      if (pendingNewCardBatches && pendingNewCardBatches.length > 0) {
        this.session.newCardBatches = pendingNewCardBatches;
        this.session.currentBatchIndex = 0;
        this.session.currentCardIndex = this.session.reviewQueue.length;
        delete (this.session as any).pendingNewCardBatches;
        
        if (this.session.newCardBatches[0] && this.session.newCardBatches[0].length > 0) {
          return this.session.newCardBatches[0][0];
        }
      }
      
      // Session is complete
      this.completeSession();
      return null;
    } catch (error) {
      throw StudySession.handleError(error, 'Failed to get next card');
    }
  }
  
  /**
   * Processes an answer for a card in the study session
   * @param cardId - ID of the card being answered
   * @param correct - Whether the answer was correct
   */
  async processAnswer(cardId: string, correct: boolean): Promise<void> {
    try {
      const card = await CardService.getCard(this.session.userId, cardId);
      if (!card) {
        throw new CardServiceError(ERROR_MESSAGES.CARD_NOT_FOUND, 'NOT_FOUND');
      }
      
      // Update statistics
      if (correct) {
        this.stats.correctAnswers++;
        if (card.isNew) {
          await this.processCorrectNewCard(card);
        } else {
          await this.processCorrectReviewCard(card);
        }
      } else {
        this.stats.incorrectAnswers++;
        if (card.isNew) {
          await this.processIncorrectNewCard(card);
        } else {
          await this.processIncorrectReviewCard(card);
        }
      }
      
      // Advance to next card
      this.advanceSessionPosition();
    } catch (error) {
      throw StudySession.handleError(error, 'Failed to process answer');
    }
  }
  
  /**
   * Gets current study progress information
   * @returns Study progress information
   */
  getStudyProgress(): StudyProgress {
    const reviewsRemaining = Math.max(0, this.session.reviewQueue.length - this.session.currentCardIndex);
    
    let newCardsRemaining = 0;
    if (this.session.newCardBatches.length > 0) {
      for (let i = this.session.currentBatchIndex; i < this.session.newCardBatches.length; i++) {
        const batch = this.session.newCardBatches[i];
        if (i === this.session.currentBatchIndex) {
          const cardIndexInBatch = this.session.currentCardIndex - this.session.reviewQueue.length;
          if (cardIndexInBatch >= 0) {
            newCardsRemaining += Math.max(0, batch.length - cardIndexInBatch);
          } else {
            newCardsRemaining += batch.length;
          }
        } else {
          newCardsRemaining += batch.length;
        }
      }
    }
    
    // Add pending queues
    const pendingReviewQueue = (this.session as any).pendingReviewQueue;
    const pendingNewCardBatches = (this.session as any).pendingNewCardBatches;
    
    if (pendingReviewQueue) {
      // Pending review queue counts as reviews remaining, not new cards
      // This was the bug - we were adding it to newCardsRemaining
    }
    
    if (pendingNewCardBatches) {
      for (const batch of pendingNewCardBatches) {
        newCardsRemaining += batch.length;
      }
    }
    
    const totalCards = reviewsRemaining + newCardsRemaining;
    const completedCards = this.stats.totalCards - totalCards;
    const totalProgress = this.stats.totalCards > 0 ? Math.round((completedCards / this.stats.totalCards) * 100) : 100;
    
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
  
  /**
   * Gets current session statistics
   * @returns Session statistics
   */
  getSessionStats(): SessionStats {
    const currentTime = new Date();
    const timeSpent = currentTime.getTime() - this.session.startTime.getTime();
    
    return {
      ...this.stats,
      timeSpent
    };
  }
  
  /**
   * Gets the session data
   * @returns Session data interface
   */
  getSessionData(): IStudySession {
    return { ...this.session };
  }
  
  /**
   * Checks if the session is active
   * @returns Whether the session is active
   */
  isActive(): boolean {
    return this.session.isActive;
  }
  
  /**
   * Completes the session
   */
  completeSession(): void {
    this.session.isActive = false;
    this.session.endTime = new Date();
    this.stats.timeSpent = this.session.endTime.getTime() - this.session.startTime.getTime();
  }
  
  // Private methods
  
  /**
   * Processes a correct answer for a new card
   */
  private async processCorrectNewCard(card: Card | SentenceCard): Promise<void> {
    await CardService.processCorrectAnswer(this.session.userId, card.id);
    
    // Check if card should graduate
    const deck = await DeckService.getDeck(this.session.userId, card.deckId);
    if (!deck) {
      throw new CardServiceError(ERROR_MESSAGES.DECK_NOT_FOUND, 'NOT_FOUND');
    }
    
    if (card.correctCount + 1 >= deck.settings.graduationThreshold) {
      await CardService.graduateNewCard(this.session.userId, card.id);
      await this.scheduleGraduatedCard(card.id, card.deckId);
      
      // Update statistics
      this.stats.newCardsLearned++;
      
      // Update daily stats
      const dailyProgress = await DeckService.getDailyProgress(this.session.userId, card.deckId);
      await DeckService.updateDailyStats(this.session.userId, card.deckId, {
        newCardsStudied: dailyProgress.newCardsStudied + 1
      });
      
      // Add a new card to maintain batch size if available
      await this.addNewCardToBatch(card.deckId);
    }
  }
  
  /**
   * Processes a correct answer for a review card
   */
  private async processCorrectReviewCard(card: Card | SentenceCard): Promise<void> {
    await CardService.processCorrectAnswer(this.session.userId, card.id);
    
    // Schedule next review
    const newStage = Math.min(card.stage + 1, -1); // MAX_STAGE is -1
    const nextReviewDate = await ReviewEngine.calculateNextReviewDate(newStage, card.deckId, this.session.userId);
    
    await CardService.updateCard(this.session.userId, card.id, {
      stage: newStage,
      nextReview: nextReviewDate,
      relearning: false
    });
    
    // Update statistics
    this.stats.reviewsCompleted++;
    
    // Update daily stats
    const dailyProgress = await DeckService.getDailyProgress(this.session.userId, card.deckId);
    await DeckService.updateDailyStats(this.session.userId, card.deckId, {
      reviewsCompleted: dailyProgress.reviewsCompleted + 1
    });
  }
  
  /**
   * Processes an incorrect answer for a new card
   */
  private async processIncorrectNewCard(card: Card | SentenceCard): Promise<void> {
    await CardService.processIncorrectAnswer(this.session.userId, card.id);
  }
  
  /**
   * Processes an incorrect answer for a review card
   */
  private async processIncorrectReviewCard(card: Card | SentenceCard): Promise<void> {
    await CardService.processIncorrectAnswer(this.session.userId, card.id);
    
    // Insert card back into queue at random position
    this.session.reviewQueue = ReviewEngine.shuffleCardIntoQueue(
      card, 
      this.session.reviewQueue, 
      this.session.currentCardIndex
    );
  }
  
  /**
   * Schedules a newly graduated card for its first review
   */
  private async scheduleGraduatedCard(cardId: string, deckId: string): Promise<void> {
    const nextReviewDate = await ReviewEngine.calculateNextReviewDate(-6, deckId, this.session.userId); // MIN_STAGE + 1
    
    await CardService.updateCard(this.session.userId, cardId, {
      nextReview: nextReviewDate
    });
  }
  
  /**
   * Adds a new card to the current batch to maintain batch size
   */
  private async addNewCardToBatch(deckId: string): Promise<void> {
    const deck = await DeckService.getDeck(this.session.userId, deckId);
    if (!deck) return;
    
    const dailyProgress = await DeckService.getDailyProgress(this.session.userId, deckId);
    const remainingNewCards = Math.max(0, deck.settings.newCardsPerDay - dailyProgress.newCardsStudied);
    
    if (remainingNewCards > 0) {
      const newCards = await CardService.getNewCards(this.session.userId, deckId, 1);
      if (newCards.length > 0 && this.session.currentBatchIndex < this.session.newCardBatches.length) {
        this.session.newCardBatches[this.session.currentBatchIndex].push(newCards[0]);
      }
    }
  }
  
  /**
   * Advances the session position to the next card
   */
  private advanceSessionPosition(): void {
    this.session.currentCardIndex++;
    
    // Check if we need to move to the next batch
    if (this.session.newCardBatches.length > 0 && this.session.currentBatchIndex < this.session.newCardBatches.length) {
      const currentBatch = this.session.newCardBatches[this.session.currentBatchIndex];
      const cardIndexInBatch = this.session.currentCardIndex - this.session.reviewQueue.length;
      
      if (cardIndexInBatch >= currentBatch.length) {
        this.session.currentBatchIndex++;
        // Reset card index for new batch
        if (this.session.currentBatchIndex < this.session.newCardBatches.length) {
          this.session.currentCardIndex = this.session.reviewQueue.length;
        }
      }
    }
  }
  
  /**
   * Gets the total number of cards in the session
   */
  private getTotalCardCount(): number {
    let total = this.session.reviewQueue.length;
    
    for (const batch of this.session.newCardBatches) {
      total += batch.length;
    }
    
    // Add pending queues
    const pendingReviewQueue = (this.session as any).pendingReviewQueue;
    const pendingNewCardBatches = (this.session as any).pendingNewCardBatches;
    
    if (pendingReviewQueue) {
      total += pendingReviewQueue.length;
    }
    
    if (pendingNewCardBatches) {
      for (const batch of pendingNewCardBatches) {
        total += batch.length;
      }
    }
    
    return total;
  }
  
  /**
   * Gets unique deck IDs from the session
   */
  private getUniqueDecks(): string[] {
    const deckIds = new Set<string>();
    
    for (const card of this.session.reviewQueue) {
      deckIds.add(card.deckId);
    }
    
    for (const batch of this.session.newCardBatches) {
      for (const card of batch) {
        deckIds.add(card.deckId);
      }
    }
    
    return Array.from(deckIds);
  }
  
  // Static helper methods
  
  /**
   * Builds the review queue for all user decks with due cards
   */
  static async buildReviewQueue(userId: string, decks: Deck[]): Promise<(Card | SentenceCard)[]> {
    try {
      const reviewQueue: (Card | SentenceCard)[] = [];
      
      for (const deck of decks) {
        const dueCards = await CardService.getDueCards(userId, deck.id);
        reviewQueue.push(...dueCards);
      }
      
      // Shuffle the queue to mix cards from different decks
      return StudySession.shuffleArray(reviewQueue);
    } catch (error) {
      throw StudySession.handleError(error, 'Failed to build review queue');
    }
  }
  
  /**
   * Builds new card batches for all user decks respecting daily limits
   */
  static async buildNewCardBatches(userId: string, decks: Deck[]): Promise<(Card | SentenceCard)[][]> {
    try {
      const allBatches: (Card | SentenceCard)[][] = [];
      
      for (const deck of decks) {
        const dailyProgress = await DeckService.getDailyProgress(userId, deck.id);
        const remainingNewCards = Math.max(0, deck.settings.newCardsPerDay - dailyProgress.newCardsStudied);
        
        if (remainingNewCards > 0) {
          const newCards = await CardService.getNewCards(userId, deck.id, remainingNewCards);
          const batches = StudySession.createBatches(newCards, deck.settings.cardsPerBatch);
          allBatches.push(...batches);
        }
      }
      
      return allBatches;
    } catch (error) {
      throw StudySession.handleError(error, 'Failed to build new card batches');
    }
  }
  
  /**
   * Gets global review settings for a user
   */
  private static async getGlobalSettings(userId: string): Promise<GlobalReviewSettings> {
    try {
      // This would typically fetch from Firebase, but for now we'll use defaults
      // In a real implementation, this would be similar to ReviewEngine.getGlobalSettings
      return {
        userId,
        ...DEFAULT_GLOBAL_SETTINGS
      };
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
   * Generates a unique session ID
   */
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
  
  /**
   * Handles errors and converts them to CardServiceError
   */
  private static handleError(error: any, defaultMessage: string): CardServiceError {
    console.error('StudySession Error:', error);
    
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