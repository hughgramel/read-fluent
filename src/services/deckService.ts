import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { 
  Deck, 
  DeckSettings,
  DailyStats,
  CreateDeckInput,
  UpdateDeckInput,
  CardServiceError,
  CardServiceErrorCode
} from '../types/spaced-repetition';
import { 
  COLLECTIONS, 
  ERROR_MESSAGES, 
  VALIDATION_LIMITS,
  DEFAULT_DECK_SETTINGS,
  DATE_FORMATS
} from '../constants/spaced-repetition';

const db = getFirestore();

/**
 * DeckService provides comprehensive CRUD operations and settings management
 * for the spaced repetition deck system with Firebase integration
 */
export class DeckService {
  
  /**
   * Creates a new deck in Firebase
   * @param deckData - Deck data without id and timestamps
   * @returns Promise resolving to the created deck's ID
   */
  static async createDeck(deckData: CreateDeckInput): Promise<string> {
    try {
      // Validate input data
      this.validateDeckData(deckData);
      
      // Generate new deck ID
      const deckRef = doc(collection(db, COLLECTIONS.USERS, deckData.userId, COLLECTIONS.DECKS));
      const deckId = deckRef.id;
      
      // Prepare deck document with defaults and timestamps
      const deckDoc: Deck = {
        ...deckData,
        id: deckId,
        settings: {
          ...DEFAULT_DECK_SETTINGS,
          ...deckData.settings
        },
        dailyStats: {
          date: this.getTodayDateString(),
          newCardsStudied: 0,
          reviewsCompleted: 0
        },
        createdAt: new Date(),
        totalCards: 0
      };
      
      // Convert Date objects to Firestore Timestamps
      const firestoreDoc = this.convertDatesToTimestamps(deckDoc);
      
      // Save to Firebase
      await setDoc(deckRef, firestoreDoc);
      
      return deckId;
    } catch (error) {
      throw this.handleFirebaseError(error, 'Failed to create deck');
    }
  }
  
  /**
   * Retrieves a deck by ID
   * @param userId - User ID who owns the deck
   * @param deckId - Deck ID to retrieve
   * @returns Promise resolving to the deck or null if not found
   */
  static async getDeck(userId: string, deckId: string): Promise<Deck | null> {
    try {
      const deckRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.DECKS, deckId);
      const deckSnap = await getDoc(deckRef);
      
      if (!deckSnap.exists()) {
        return null;
      }
      
      const deckData = deckSnap.data();
      return this.convertTimestampsToDates(deckData) as Deck;
    } catch (error) {
      throw this.handleFirebaseError(error, 'Failed to retrieve deck');
    }
  }
  
  /**
   * Retrieves all decks for a user
   * @param userId - User ID to get decks for
   * @returns Promise resolving to array of decks
   */
  static async getUserDecks(userId: string): Promise<Deck[]> {
    try {
      const decksRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.DECKS);
      const q = query(decksRef, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const decks: Deck[] = [];
      
      querySnapshot.forEach((doc) => {
        const deckData = this.convertTimestampsToDates(doc.data());
        decks.push(deckData as Deck);
      });
      
      return decks;
    } catch (error) {
      throw this.handleFirebaseError(error, 'Failed to retrieve user decks');
    }
  }
  
  /**
   * Updates deck settings
   * @param userId - User ID who owns the deck
   * @param deckId - Deck ID to update
   * @param settings - Partial deck settings to update
   */
  static async updateDeckSettings(
    userId: string, 
    deckId: string, 
    settings: Partial<DeckSettings>
  ): Promise<void> {
    try {
      // Validate settings
      this.validateDeckSettings(settings);
      
      const deckRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.DECKS, deckId);
      
      // Check if deck exists and get current settings
      const deckSnap = await getDoc(deckRef);
      if (!deckSnap.exists()) {
        throw new CardServiceError(ERROR_MESSAGES.DECK_NOT_FOUND, 'NOT_FOUND');
      }
      
      const currentDeck = this.convertTimestampsToDates(deckSnap.data()) as Deck;
      const updatedSettings = {
        ...currentDeck.settings,
        ...settings
      };
      
      // Update the deck settings
      await updateDoc(deckRef, {
        settings: updatedSettings
      });
    } catch (error) {
      if (error instanceof CardServiceError) {
        throw error;
      }
      throw this.handleFirebaseError(error, 'Failed to update deck settings');
    }
  }
  
  /**
   * Updates general deck information (name, description)
   * @param userId - User ID who owns the deck
   * @param deckId - Deck ID to update
   * @param updates - Partial deck data to update
   */
  static async updateDeck(
    userId: string, 
    deckId: string, 
    updates: UpdateDeckInput
  ): Promise<void> {
    try {
      // Validate updates
      this.validateDeckUpdates(updates);
      
      const deckRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.DECKS, deckId);
      
      // Check if deck exists
      const deckSnap = await getDoc(deckRef);
      if (!deckSnap.exists()) {
        throw new CardServiceError(ERROR_MESSAGES.DECK_NOT_FOUND, 'NOT_FOUND');
      }
      
      // Update the deck
      await updateDoc(deckRef, updates);
    } catch (error) {
      if (error instanceof CardServiceError) {
        throw error;
      }
      throw this.handleFirebaseError(error, 'Failed to update deck');
    }
  }
  
  /**
   * Deletes a deck and all its associated cards
   * @param userId - User ID who owns the deck
   * @param deckId - Deck ID to delete
   */
  static async deleteDeck(userId: string, deckId: string): Promise<void> {
    try {
      const deckRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.DECKS, deckId);
      
      // Check if deck exists
      const deckSnap = await getDoc(deckRef);
      if (!deckSnap.exists()) {
        throw new CardServiceError(ERROR_MESSAGES.DECK_NOT_FOUND, 'NOT_FOUND');
      }
      
      // Use a transaction to delete deck and all associated cards
      await runTransaction(db, async (transaction) => {
        // Get all cards in this deck
        const cardsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.CARDS);
        const cardsQuery = query(cardsRef, where('deckId', '==', deckId));
        const cardsSnapshot = await getDocs(cardsQuery);
        
        // Delete all cards in the deck
        cardsSnapshot.forEach((cardDoc) => {
          transaction.delete(cardDoc.ref);
        });
        
        // Delete the deck
        transaction.delete(deckRef);
      });
    } catch (error) {
      if (error instanceof CardServiceError) {
        throw error;
      }
      throw this.handleFirebaseError(error, 'Failed to delete deck');
    }
  }
  
  /**
   * Updates daily statistics for a deck
   * @param userId - User ID who owns the deck
   * @param deckId - Deck ID to update stats for
   * @param stats - Partial daily stats to update
   */
  static async updateDailyStats(
    userId: string, 
    deckId: string, 
    stats: Partial<DailyStats>
  ): Promise<void> {
    try {
      const deckRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.DECKS, deckId);
      
      await runTransaction(db, async (transaction) => {
        const deckDoc = await transaction.get(deckRef);
        
        if (!deckDoc.exists()) {
          throw new CardServiceError(ERROR_MESSAGES.DECK_NOT_FOUND, 'NOT_FOUND');
        }
        
        const deckData = this.convertTimestampsToDates(deckDoc.data()) as Deck;
        const today = this.getTodayDateString();
        
        // Reset stats if it's a new day
        let currentStats = deckData.dailyStats;
        if (currentStats.date !== today) {
          currentStats = {
            date: today,
            newCardsStudied: 0,
            reviewsCompleted: 0
          };
        }
        
        // Update with provided stats
        const updatedStats = {
          ...currentStats,
          ...stats,
          date: today // Ensure date is always today
        };
        
        // Update last studied timestamp
        const updates = {
          dailyStats: updatedStats,
          lastStudied: Timestamp.now()
        };
        
        transaction.update(deckRef, updates);
      });
    } catch (error) {
      if (error instanceof CardServiceError) {
        throw error;
      }
      throw this.handleFirebaseError(error, 'Failed to update daily stats');
    }
  }
  
  /**
   * Gets daily progress for a deck
   * @param userId - User ID who owns the deck
   * @param deckId - Deck ID to get progress for
   * @returns Promise resolving to daily stats
   */
  static async getDailyProgress(userId: string, deckId: string): Promise<DailyStats> {
    try {
      const deck = await this.getDeck(userId, deckId);
      
      if (!deck) {
        throw new CardServiceError(ERROR_MESSAGES.DECK_NOT_FOUND, 'NOT_FOUND');
      }
      
      const today = this.getTodayDateString();
      
      // Return current stats or reset if it's a new day
      if (deck.dailyStats.date === today) {
        return deck.dailyStats;
      } else {
        return {
          date: today,
          newCardsStudied: 0,
          reviewsCompleted: 0
        };
      }
    } catch (error) {
      if (error instanceof CardServiceError) {
        throw error;
      }
      throw this.handleFirebaseError(error, 'Failed to get daily progress');
    }
  }
  
  /**
   * Updates the total card count for a deck
   * @param userId - User ID who owns the deck
   * @param deckId - Deck ID to update
   * @param increment - Number to add to total cards (can be negative)
   */
  static async updateCardCount(userId: string, deckId: string, increment: number): Promise<void> {
    try {
      const deckRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.DECKS, deckId);
      
      await runTransaction(db, async (transaction) => {
        const deckDoc = await transaction.get(deckRef);
        
        if (!deckDoc.exists()) {
          throw new CardServiceError(ERROR_MESSAGES.DECK_NOT_FOUND, 'NOT_FOUND');
        }
        
        const deckData = this.convertTimestampsToDates(deckDoc.data()) as Deck;
        const newTotal = Math.max(0, deckData.totalCards + increment);
        
        transaction.update(deckRef, {
          totalCards: newTotal
        });
      });
    } catch (error) {
      if (error instanceof CardServiceError) {
        throw error;
      }
      throw this.handleFirebaseError(error, 'Failed to update card count');
    }
  }
  
  /**
   * Resets daily statistics for all decks (typically called at midnight)
   * @param userId - User ID to reset stats for
   */
  static async resetDailyStats(userId: string): Promise<void> {
    try {
      const decks = await this.getUserDecks(userId);
      const batch = writeBatch(db);
      const today = this.getTodayDateString();
      
      decks.forEach((deck) => {
        if (deck.dailyStats.date !== today) {
          const deckRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.DECKS, deck.id);
          batch.update(deckRef, {
            dailyStats: {
              date: today,
              newCardsStudied: 0,
              reviewsCompleted: 0
            }
          });
        }
      });
      
      await batch.commit();
    } catch (error) {
      throw this.handleFirebaseError(error, 'Failed to reset daily stats');
    }
  }
  
  // Private helper methods
  
  /**
   * Validates deck data for creation
   */
  private static validateDeckData(deckData: CreateDeckInput): void {
    if (!deckData.userId) {
      throw new CardServiceError('User ID is required', 'VALIDATION_ERROR');
    }
    
    if (!deckData.name || deckData.name.trim().length === 0) {
      throw new CardServiceError('Deck name is required', 'VALIDATION_ERROR');
    }
    
    if (deckData.name.length > VALIDATION_LIMITS.MAX_DECK_NAME_LENGTH) {
      throw new CardServiceError('Deck name exceeds maximum length', 'VALIDATION_ERROR');
    }
    
    if (deckData.description && deckData.description.length > VALIDATION_LIMITS.MAX_DECK_DESCRIPTION_LENGTH) {
      throw new CardServiceError('Deck description exceeds maximum length', 'VALIDATION_ERROR');
    }
    
    if (deckData.settings) {
      this.validateDeckSettings(deckData.settings);
    }
  }
  
  /**
   * Validates deck update data
   */
  private static validateDeckUpdates(updates: UpdateDeckInput): void {
    if (updates.name !== undefined) {
      if (!updates.name || updates.name.trim().length === 0) {
        throw new CardServiceError('Deck name cannot be empty', 'VALIDATION_ERROR');
      }
      
      if (updates.name.length > VALIDATION_LIMITS.MAX_DECK_NAME_LENGTH) {
        throw new CardServiceError('Deck name exceeds maximum length', 'VALIDATION_ERROR');
      }
    }
    
    if (updates.description !== undefined && updates.description.length > VALIDATION_LIMITS.MAX_DECK_DESCRIPTION_LENGTH) {
      throw new CardServiceError('Deck description exceeds maximum length', 'VALIDATION_ERROR');
    }
    
    if (updates.settings) {
      this.validateDeckSettings(updates.settings);
    }
  }
  
  /**
   * Validates deck settings
   */
  private static validateDeckSettings(settings: Partial<DeckSettings>): void {
    if (settings.newCardsPerDay !== undefined) {
      if (settings.newCardsPerDay < VALIDATION_LIMITS.MIN_NEW_CARDS_PER_DAY || 
          settings.newCardsPerDay > VALIDATION_LIMITS.MAX_NEW_CARDS_PER_DAY) {
        throw new CardServiceError(
          `New cards per day must be between ${VALIDATION_LIMITS.MIN_NEW_CARDS_PER_DAY} and ${VALIDATION_LIMITS.MAX_NEW_CARDS_PER_DAY}`, 
          'VALIDATION_ERROR'
        );
      }
    }
    
    if (settings.cardsPerBatch !== undefined) {
      if (settings.cardsPerBatch < VALIDATION_LIMITS.MIN_CARDS_PER_BATCH || 
          settings.cardsPerBatch > VALIDATION_LIMITS.MAX_CARDS_PER_BATCH) {
        throw new CardServiceError(
          `Cards per batch must be between ${VALIDATION_LIMITS.MIN_CARDS_PER_BATCH} and ${VALIDATION_LIMITS.MAX_CARDS_PER_BATCH}`, 
          'VALIDATION_ERROR'
        );
      }
    }
    
    if (settings.graduationThreshold !== undefined) {
      if (settings.graduationThreshold < VALIDATION_LIMITS.MIN_GRADUATION_THRESHOLD || 
          settings.graduationThreshold > VALIDATION_LIMITS.MAX_GRADUATION_THRESHOLD) {
        throw new CardServiceError(
          `Graduation threshold must be between ${VALIDATION_LIMITS.MIN_GRADUATION_THRESHOLD} and ${VALIDATION_LIMITS.MAX_GRADUATION_THRESHOLD}`, 
          'VALIDATION_ERROR'
        );
      }
    }
  }
  
  /**
   * Gets today's date as a string in YYYY-MM-DD format
   */
  private static getTodayDateString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }
  
  /**
   * Converts Date objects to Firestore Timestamps
   */
  private static convertDatesToTimestamps(data: any): any {
    const converted = { ...data };
    
    if (converted.createdAt instanceof Date) {
      converted.createdAt = Timestamp.fromDate(converted.createdAt);
    }
    if (converted.lastStudied instanceof Date) {
      converted.lastStudied = Timestamp.fromDate(converted.lastStudied);
    }
    
    return converted;
  }
  
  /**
   * Converts Firestore Timestamps to Date objects
   */
  private static convertTimestampsToDates(data: any): any {
    const converted = { ...data };
    
    if (converted.createdAt && typeof converted.createdAt.toDate === 'function') {
      converted.createdAt = converted.createdAt.toDate();
    }
    if (converted.lastStudied && typeof converted.lastStudied.toDate === 'function') {
      converted.lastStudied = converted.lastStudied.toDate();
    }
    
    return converted;
  }
  
  /**
   * Handles Firebase errors and converts them to CardServiceError
   */
  private static handleFirebaseError(error: any, defaultMessage: string): CardServiceError {
    console.error('DeckService Firebase Error:', error);
    
    if (error instanceof CardServiceError) {
      return error;
    }
    
    // Map Firebase error codes to our error types
    const errorCode = error?.code || 'unknown';
    let serviceErrorCode: CardServiceErrorCode = 'FIREBASE_ERROR';
    let message = defaultMessage;
    
    switch (errorCode) {
      case 'permission-denied':
        serviceErrorCode = 'PERMISSION_DENIED';
        message = ERROR_MESSAGES.PERMISSION_DENIED;
        break;
      case 'unavailable':
      case 'deadline-exceeded':
        serviceErrorCode = 'NETWORK_ERROR';
        message = ERROR_MESSAGES.NETWORK_ERROR;
        break;
      case 'aborted':
        serviceErrorCode = 'CONCURRENT_UPDATE';
        message = ERROR_MESSAGES.CONCURRENT_UPDATE;
        break;
      default:
        message = error?.message || defaultMessage;
    }
    
    return new CardServiceError(message, serviceErrorCode, error);
  }
}