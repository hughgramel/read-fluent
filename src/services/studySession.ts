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
  private _globalSettings: GlobalReviewSettings; // Using underscore to indicate it's used internally
  private cardSessionProgress: Map<string, number> = new Map(); // Track progress within this session
  
  // Add new fields to StudySession class
  private newCardBatch: (Card | SentenceCard)[] = [];
  private newCardQueue: (Card | SentenceCard)[] = [];
  private lastBatchIndex: number | null = null;
  
  constructor(session: IStudySession, globalSettings: GlobalReviewSettings) {
    this.session = session;
    this._globalSettings = globalSettings;
    this.stats = {
      totalCards: this.getTotalCardCount(),
      correctAnswers: 0,
      incorrectAnswers: 0,
      newCardsLearned: 0,
      reviewsCompleted: 0,
      timeSpent: 0,
      decksStudied: this.getUniqueDecks()
    };
    this.newCardBatch = (session as any).newCardBatch || [];
    this.newCardQueue = (session as any).newCardQueue || [];
    this.lastBatchIndex = (session as any).lastBatchIndex || null;
    this.cardSessionProgress = (session as any).cardSessionProgress || new Map();
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
      // Instead of newCardBatches, build a single batch and queue for all decks
      let allNewCards: (Card | SentenceCard)[] = [];
      for (const deck of decks) {
        const dailyProgress = await DeckService.getDailyProgress(userId, deck.id);
        const remainingNewCards = Math.max(0, deck.settings.newCardsPerDay - dailyProgress.newCardsStudied);
        if (remainingNewCards > 0) {
          const newCards = await CardService.getNewCards(userId, deck.id, remainingNewCards);
          allNewCards.push(...newCards);
        }
      }
      // Shuffle all new cards
      allNewCards = StudySession.shuffleArray(allNewCards);
      // Get batch size (use max from all decks, or default 5)
      const batchSize = decks.reduce((max, d) => Math.max(max, d.settings.cardsPerBatch), 5);
      const batch = allNewCards.slice(0, batchSize);
      const queue = allNewCards.slice(batchSize);
      // Attach to sessionData
      const sessionData: IStudySession = {
        id: StudySession.generateSessionId(),
        userId,
        startTime: new Date(),
        reviewQueue: globalSettings.studyOrder === 'reviews-first' ? reviewQueue : [],
        newCardBatches: globalSettings.studyOrder === 'new-first' ? [batch] : [], // Keep this for compatibility, but newCardBatches is now a single batch
        currentBatchIndex: 0,
        currentCardIndex: 0,
        isActive: true,
        sessionType: StudySession.determineSessionType(reviewQueue, [batch]) // Pass the single batch
      };
      (sessionData as any).newCardBatch = batch;
      (sessionData as any).newCardQueue = queue;
      (sessionData as any).lastBatchIndex = null;
      // Initialize cardSessionProgress from correctCount for each card
      const cardSessionProgress = new Map<string, number>();
      for (const card of allNewCards) {
        cardSessionProgress.set(card.id, card.correctCount || 0);
      }
      (sessionData as any).cardSessionProgress = cardSessionProgress;
      
      // Store pending queues for mixed study order
      if (globalSettings.studyOrder === 'reviews-first' && queue.length > 0) {
        (sessionData as any).pendingNewCardQueue = queue;
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

      // Check if any new cards still need to reach graduation threshold
      const allNewCardsGraduated = await this._allNewCardsGraduatedAsync();
      if (allNewCardsGraduated) {
        this.completeSession();
        return null;
      }

      // Handle review cards first (if reviews-first order or currently in review phase)
      if (this.session.reviewQueue.length > 0 && this.session.currentCardIndex < this.session.reviewQueue.length) {
        const cardFromQueue = this.session.reviewQueue[this.session.currentCardIndex];
        // Fetch fresh card data to get updated correctCount
        const freshCard = await CardService.getCard(this.session.userId, cardFromQueue.id);
        return freshCard || cardFromQueue;
      }

      // Handle new card batches
      if (this.newCardBatch.length > 0) {
        // If batch is empty, session is complete
        if (this.newCardBatch.length === 0) {
          this.completeSession();
          return null;
        }
        // Pick a random index, not the same as lastBatchIndex if possible
        let idx = Math.floor(Math.random() * this.newCardBatch.length);
        if (this.lastBatchIndex !== null && this.newCardBatch.length > 1) {
          while (idx === this.lastBatchIndex) {
            idx = Math.floor(Math.random() * this.newCardBatch.length);
          }
        }
        this.lastBatchIndex = idx;
        const card = this.newCardBatch[idx];
        // Debug: print card data
        console.log('[StudySession] Showing new card:', card);
        return card;
      }

      // Check for pending queues (mixed study order)
      const pendingReviewQueue = (this.session as any).pendingReviewQueue;
      const pendingNewCardQueue = (this.session as any).pendingNewCardQueue;

      // Switch to pending review queue if new cards are done
      if (pendingReviewQueue && pendingReviewQueue.length > 0) {
        this.session.reviewQueue = pendingReviewQueue;
        this.session.currentCardIndex = 0;
        delete (this.session as any).pendingReviewQueue;
        return this.session.reviewQueue[0];
      }

      // Switch to pending new card queue if reviews are done
      if (pendingNewCardQueue && pendingNewCardQueue.length > 0) {
        this.newCardBatch = pendingNewCardQueue;
        this.lastBatchIndex = null;
        this.session.currentCardIndex = this.session.reviewQueue.length;
        delete (this.session as any).pendingNewCardQueue;

        if (this.newCardBatch.length > 0) {
          return this.newCardBatch[0];
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
        // Always advance for correct answers
        this.advanceSessionPosition();
      } else {
        this.stats.incorrectAnswers++;
        if (card.isNew) {
          await this.processIncorrectNewCard(card);
          // For incorrect new cards, we advance position since the card is shuffled to a later position
          this.advanceSessionPosition();
        } else {
          await this.processIncorrectReviewCard(card);
          // For incorrect review cards, don't advance since the card is added back to the queue
          // The next getNextCard() call will return the next card in the queue
        }
      }
    } catch (error) {
      throw StudySession.handleError(error, 'Failed to process answer');
    }
  }
  
  /**
   * Gets current study progress information
   * @returns Study progress information
   */
  getStudyProgress(): StudyProgress {
    let reviewsRemaining = Math.max(0, this.session.reviewQueue.length - this.session.currentCardIndex);

    // Only count cards still present in the batches as new cards remaining
    let newCardsRemaining = this.newCardBatch.length + this.newCardQueue.length;

    // Add pending queues
    const pendingReviewQueue = (this.session as any).pendingReviewQueue;
    const pendingNewCardQueue = (this.session as any).pendingNewCardQueue;

    if (pendingReviewQueue) {
      reviewsRemaining += pendingReviewQueue.length;
    }

    if (pendingNewCardQueue) {
      newCardsRemaining += pendingNewCardQueue.length;
    }

    const totalCards = reviewsRemaining + newCardsRemaining;
    // StudyProgress does not have completedCards or totalRequired
    const totalProgress = this.stats.totalCards > 0 ? Math.round(((this.stats.totalCards - totalCards) / this.stats.totalCards) * 100) : 100;

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
   * Gets the settings for a specific deck
   * @param deckId - ID of the deck to get settings for
   * @returns Deck settings or default settings if not found
   */
  async getDeckSettings(deckId: string): Promise<Deck['settings'] | null> {
    try {
      const deck = await DeckService.getDeck(this.session.userId, deckId);
      return deck?.settings || null;
    } catch (error) {
      console.error('Failed to get deck settings:', error);
      // Return default settings as fallback
      return {
        newCardsPerDay: 20,
        cardsPerBatch: 5,
        graduationThreshold: 3
      };
    }
  }
  
  /**
   * Gets the session progress for a specific card
   * @param cardId - ID of the card to get progress for
   * @returns Number of correct answers in this session
   */
  getCardSessionProgress(cardId: string): number {
    return this.cardSessionProgress.get(cardId) || 0;
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
    // Track session progress for this card (initialize if first time seeing it)
    const currentSessionProgress = this.cardSessionProgress.get(card.id) || 0;
    const newSessionProgress = currentSessionProgress + 1;
    this.cardSessionProgress.set(card.id, newSessionProgress);
    
    console.log(`[StudySession] New card ${card.id} correct answer: session progress ${currentSessionProgress} -> ${newSessionProgress}`);
    
    // Always persist progress
    await CardService.processCorrectAnswer(this.session.userId, card.id);
    
    // Get deck settings to check graduation threshold
    const deck = await DeckService.getDeck(this.session.userId, card.deckId);
    if (!deck) {
      throw new CardServiceError(ERROR_MESSAGES.DECK_NOT_FOUND, 'NOT_FOUND');
    }
    
    // Only graduate if the card has been answered correctly enough times in THIS session
    if (newSessionProgress >= deck.settings.graduationThreshold) {
      // Now process the correct answer in the database and graduate
      await CardService.graduateNewCard(this.session.userId, card.id);
      const nextReviewDate = await ReviewEngine.calculateNextReviewDate(-6, card.deckId, this.session.userId);
      console.log(`[StudySession] Card ${card.id} graduated! Next review:`, nextReviewDate);
      await this.scheduleGraduatedCard(card.id, card.deckId);
      
      // Update statistics
      this.stats.newCardsLearned++;
      
      // Update daily stats
      const dailyProgress = await DeckService.getDailyProgress(this.session.userId, card.deckId);
      await DeckService.updateDailyStats(this.session.userId, card.deckId, {
        newCardsStudied: dailyProgress.newCardsStudied + 1
      });
      
      // Remove from batch
      const idx = this.newCardBatch.findIndex(c => c.id === card.id);
      if (idx !== -1) {
        this.newCardBatch.splice(idx, 1);
        // Replace with card from queue if available
        if (this.newCardQueue.length > 0) {
          this.newCardBatch.splice(idx, 0, this.newCardQueue.shift()!);
        }
      }
      
      // Remove from session progress tracking
      this.cardSessionProgress.delete(card.id);
      
      // Add a new card to maintain batch size if available
      await this.addNewCardToBatch(card.deckId);
    } else {
      // Card hasn't graduated yet, just update the database but don't graduate
      // The progress is already persisted in the previous step
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
    
    // Reset session progress for this card
    this.cardSessionProgress.set(card.id, 0);
    
    console.log(`[StudySession] New card ${card.id} incorrect answer: session progress reset to 0`);
    
    // Shuffle the batch so the next card is random
    this.newCardBatch = StudySession.shuffleArray(this.newCardBatch);
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
    
    // Advance to the next card
    this.advanceSessionPosition();
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
    const batchSize = deck.settings.cardsPerBatch || 5;
    const dailyProgress = await DeckService.getDailyProgress(this.session.userId, deckId);
    const remainingNewCards = Math.max(0, deck.settings.newCardsPerDay - dailyProgress.newCardsStudied);
    
    if (remainingNewCards > 0) {
      const newCards = await CardService.getNewCards(this.session.userId, deckId, 1);
      if (newCards.length > 0 && this.newCardBatch.length < batchSize) { // Ensure batch doesn't grow too large
        this.newCardBatch.push(newCards[0]);
      }
    }
  }
  
  /**
   * Advances the session position to the next card
   */
  private advanceSessionPosition(): void {
    this.session.currentCardIndex++;
    
    // Check if we need to move to the next batch
    if (this.newCardBatch.length === 0) { // If batch is empty, session is complete
      this.completeSession();
      return;
    }

    const cardIndexInBatch = this.session.currentCardIndex - this.session.reviewQueue.length;
    
    if (cardIndexInBatch >= this.newCardBatch.length) {
      this.session.currentBatchIndex++;
      // Reset card index for new batch
      if (this.session.currentBatchIndex < this.session.newCardBatches.length) {
        this.session.currentCardIndex = this.session.reviewQueue.length;
      }
    }
  }
  
  /**
   * Shuffles a failed new card back into the current batch at a random position
   * @param card - The card that was answered incorrectly
   * @param batch - The current batch of new cards
   * @param currentPosition - Current position of the card in the batch
   */
  private shuffleNewCardInBatch(card: Card | SentenceCard, batch: (Card | SentenceCard)[], currentPosition: number): void {
    // Convert batch to a Set to ensure uniqueness
    const uniqueCards = new Map<string, Card | SentenceCard>();
    batch.forEach((c, i) => {
      if (i === currentPosition || c.id !== card.id) {
        uniqueCards.set(c.id, c);
      }
    });
    // Remove the card at currentPosition (will be re-inserted)
    batch.splice(0, batch.length, ...Array.from(uniqueCards.values()));
    // Now insert the card at a random position after currentPosition
    const maxPositions = Math.min(QUEUE_CONFIG.MAX_RANDOM_INSERTION_POSITIONS, batch.length - currentPosition);
    const randomOffset = Math.max(1, Math.floor(Math.random() * maxPositions) + 1);
    let insertPosition = Math.min(currentPosition + randomOffset, batch.length);
    // Shuffle the batch so the next card is not the same one just answered
    if (insertPosition === currentPosition + 1 && batch.length > 1) {
      insertPosition = Math.min(currentPosition + 2, batch.length);
    }
    batch.splice(insertPosition, 0, card);
    console.log(`[StudySession] Shuffled failed new card ${card.id} to position ${insertPosition} in batch (batch now has ${batch.length} cards)`);
    console.log(`[StudySession] Batch after shuffle: [${batch.map(c => c.id).join(', ')}]`);
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
    const pendingNewCardQueue = (this.session as any).pendingNewCardQueue;
    
    if (pendingReviewQueue) {
      total += pendingReviewQueue.length;
    }

    if (pendingNewCardQueue) {
      total += pendingNewCardQueue.length;
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

  /**
   * Returns true if all new cards in the session have reached their graduation threshold (async version)
   */
  private async _allNewCardsGraduatedAsync(): Promise<boolean> {
    let hasAnyCard = false;
    for (const batch of this.newCardBatch) { // Changed to newCardBatch
      hasAnyCard = true;
      const deck = await DeckService.getDeck(this.session.userId, batch.deckId); // Changed to batch.deckId
      const threshold = deck?.settings?.graduationThreshold || 3;
      const progress = this.cardSessionProgress.get(batch.id) || 0; // Changed to batch.id
      if (progress < threshold) {
        return false;
      }
    }
    // If there are no cards at all, we should not consider all graduated (prevents false session end)
    if (!hasAnyCard) return false;
    return true;
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