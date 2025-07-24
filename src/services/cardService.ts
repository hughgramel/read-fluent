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
  limit,
  Timestamp,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { 
  Card, 
  SentenceCard, 
  CreateCardInput, 
  CreateSentenceCardInput,
  UpdateCardInput,
  UpdateSentenceCardInput,
  CardServiceError,
  CardServiceErrorCode,
  isBasicCard,
  isSentenceCard
} from '../types/spaced-repetition';
import { 
  COLLECTIONS, 
  ERROR_MESSAGES, 
  VALIDATION_LIMITS,
  MIN_STAGE,
  MAX_STAGE,
  CARD_TYPES
} from '../constants/spaced-repetition';

const db = getFirestore();

/**
 * CardService provides comprehensive CRUD operations and deck-specific queries
 * for the spaced repetition card system with Firebase integration
 */
export class CardService {
  
  /**
   * Creates a new card in Firebase
   * @param cardData - Card data without id and timestamps
   * @returns Promise resolving to the created card's ID
   */
  static async createCard(cardData: CreateCardInput | CreateSentenceCardInput): Promise<string> {
    try {
      console.log('[CardService] Creating card with data:', cardData);
      
      // Validate input data
      this.validateCardData(cardData);
      
      // Generate new card ID
      const cardRef = doc(collection(db, COLLECTIONS.USERS, cardData.userId, COLLECTIONS.CARDS));
      const cardId = cardRef.id;
      
      console.log('[CardService] Generated card ID:', cardId);
      console.log('[CardService] Collection path:', `${COLLECTIONS.USERS}/${cardData.userId}/${COLLECTIONS.CARDS}`);
      
      // Prepare card document with timestamps
      const cardDoc: Card | SentenceCard = {
        ...cardData,
        id: cardId,
        createdAt: new Date(),
        totalReviews: 0
        // lastReviewed is omitted for new cards (will be undefined)
      } as Card | SentenceCard;
      
      console.log('[CardService] Card document before conversion:', cardDoc);
      
      // Convert Date objects to Firestore Timestamps
      const firestoreDoc = this.convertDatesToTimestamps(cardDoc);
      
      console.log('[CardService] Card document after conversion:', firestoreDoc);
      
      // Save to Firebase
      await setDoc(cardRef, firestoreDoc);
      
      console.log('[CardService] Card created successfully with ID:', cardId);
      return cardId;
    } catch (error) {
      console.error('[CardService] Error creating card:', error);
      throw this.handleFirebaseError(error, 'Failed to create card');
    }
  }
  
  /**
   * Retrieves a card by ID
   * @param userId - User ID who owns the card
   * @param cardId - Card ID to retrieve
   * @returns Promise resolving to the card or null if not found
   */
  static async getCard(userId: string, cardId: string): Promise<Card | SentenceCard | null> {
    try {
      const cardRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.CARDS, cardId);
      const cardSnap = await getDoc(cardRef);
      
      if (!cardSnap.exists()) {
        return null;
      }
      
      const cardData = cardSnap.data();
      return this.convertTimestampsToDates(cardData) as Card | SentenceCard;
    } catch (error) {
      throw this.handleFirebaseError(error, 'Failed to retrieve card');
    }
  }
  
  /**
   * Updates an existing card
   * @param userId - User ID who owns the card
   * @param cardId - Card ID to update
   * @param updates - Partial card data to update
   */
  static async updateCard(
    userId: string, 
    cardId: string, 
    updates: UpdateCardInput | UpdateSentenceCardInput
  ): Promise<void> {
    try {
      // Validate updates
      this.validateCardUpdates(updates);
      
      const cardRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.CARDS, cardId);
      
      // Check if card exists
      const cardSnap = await getDoc(cardRef);
      if (!cardSnap.exists()) {
        throw new CardServiceError(ERROR_MESSAGES.CARD_NOT_FOUND, 'NOT_FOUND');
      }
      
      // Convert Date objects to Timestamps if present
      const firestoreUpdates = this.convertDatesToTimestamps(updates);
      
      // Update the card
      await updateDoc(cardRef, firestoreUpdates);
    } catch (error) {
      if (error instanceof CardServiceError) {
        throw error;
      }
      throw this.handleFirebaseError(error, 'Failed to update card');
    }
  }
  
  /**
   * Deletes a card
   * @param userId - User ID who owns the card
   * @param cardId - Card ID to delete
   */
  static async deleteCard(userId: string, cardId: string): Promise<void> {
    try {
      const cardRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.CARDS, cardId);
      
      // Check if card exists
      const cardSnap = await getDoc(cardRef);
      if (!cardSnap.exists()) {
        throw new CardServiceError(ERROR_MESSAGES.CARD_NOT_FOUND, 'NOT_FOUND');
      }
      
      await deleteDoc(cardRef);
    } catch (error) {
      if (error instanceof CardServiceError) {
        throw error;
      }
      throw this.handleFirebaseError(error, 'Failed to delete card');
    }
  }
  
  /**
   * Retrieves all cards for a specific deck
   * @param userId - User ID who owns the cards
   * @param deckId - Deck ID to get cards for
   * @returns Promise resolving to array of cards
   */
  static async getCardsByDeck(userId: string, deckId: string): Promise<(Card | SentenceCard)[]> {
    try {
      const cardsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.CARDS);
      const q = query(
        cardsRef,
        where('deckId', '==', deckId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const cards: (Card | SentenceCard)[] = [];
      
      querySnapshot.forEach((doc) => {
        const cardData = this.convertTimestampsToDates(doc.data());
        cards.push(cardData as Card | SentenceCard);
      });
      
      return cards;
    } catch (error) {
      throw this.handleFirebaseError(error, 'Failed to retrieve cards by deck');
    }
  }
  
  /**
   * Retrieves cards that are due for review
   * @param userId - User ID who owns the cards
   * @param deckId - Deck ID to get due cards for
   * @returns Promise resolving to array of due cards
   */
  static async getDueCards(userId: string, deckId: string): Promise<(Card | SentenceCard)[]> {
    try {
      const cardsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.CARDS);
      const now = Timestamp.now();
      
      // Query for cards that are due (nextReview <= now OR relearning = true)
      const dueQuery = query(
        cardsRef,
        where('deckId', '==', deckId),
        where('isNew', '==', false),
        where('nextReview', '<=', now)
      );
      
      const relearningQuery = query(
        cardsRef,
        where('deckId', '==', deckId),
        where('relearning', '==', true)
      );
      
      const [dueSnapshot, relearningSnapshot] = await Promise.all([
        getDocs(dueQuery),
        getDocs(relearningQuery)
      ]);
      
      const dueCards = new Map<string, Card | SentenceCard>();
      
      // Add due cards
      dueSnapshot.forEach((doc) => {
        const cardData = this.convertTimestampsToDates(doc.data());
        dueCards.set(doc.id, cardData as Card | SentenceCard);
      });
      
      // Add relearning cards (avoid duplicates)
      relearningSnapshot.forEach((doc) => {
        if (!dueCards.has(doc.id)) {
          const cardData = this.convertTimestampsToDates(doc.data());
          dueCards.set(doc.id, cardData as Card | SentenceCard);
        }
      });
      
      return Array.from(dueCards.values());
    } catch (error) {
      throw this.handleFirebaseError(error, 'Failed to retrieve due cards');
    }
  }
  
  /**
   * Retrieves new cards for a deck up to the specified limit
   * @param userId - User ID who owns the cards
   * @param deckId - Deck ID to get new cards for
   * @param cardLimit - Maximum number of new cards to retrieve
   * @returns Promise resolving to array of new cards
   */
  static async getNewCards(userId: string, deckId: string, cardLimit: number): Promise<(Card | SentenceCard)[]> {
    try {
      const cardsRef = collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.CARDS);
      const q = query(
        cardsRef,
        where('deckId', '==', deckId),
        where('isNew', '==', true),
        orderBy('createdAt', 'asc'),
        limit(cardLimit)
      );
      
      const querySnapshot = await getDocs(q);
      const newCards: (Card | SentenceCard)[] = [];
      
      querySnapshot.forEach((doc) => {
        const cardData = this.convertTimestampsToDates(doc.data());
        newCards.push(cardData as Card | SentenceCard);
      });
      
      return newCards;
    } catch (error) {
      throw this.handleFirebaseError(error, 'Failed to retrieve new cards');
    }
  }
  
  /**
   * Processes a correct answer for a card with enhanced validation and error handling
   * @param userId - User ID who owns the card
   * @param cardId - Card ID to process
   */
  static async processCorrectAnswer(userId: string, cardId: string): Promise<void> {
    if (!userId || !cardId) {
      throw new CardServiceError('User ID and Card ID are required', 'VALIDATION_ERROR');
    }

    try {
      const cardRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.CARDS, cardId);
      
      await runTransaction(db, async (transaction) => {
        const cardDoc = await transaction.get(cardRef);
        
        if (!cardDoc.exists()) {
          throw new CardServiceError(ERROR_MESSAGES.CARD_NOT_FOUND, 'NOT_FOUND');
        }
        
        const cardData = this.convertTimestampsToDates(cardDoc.data()) as Card;
        
        // Validate card state
        if (cardData.stage < MIN_STAGE || cardData.stage > MAX_STAGE) {
          throw new CardServiceError(ERROR_MESSAGES.INVALID_STAGE, 'VALIDATION_ERROR');
        }
        
        // Update card based on whether it's new or review
        if (cardData.isNew) {
          // Increment correct count for new cards
          const newCorrectCount = cardData.correctCount + 1;
          const updates = {
            correctCount: newCorrectCount,
            totalReviews: cardData.totalReviews + 1,
            lastReviewed: Timestamp.now()
          };
          
          console.log(`[CardService] New card ${cardId} correct answer: correctCount ${cardData.correctCount} -> ${newCorrectCount}`);
          transaction.update(cardRef, updates);
        } else {
          // Progress stage for review cards (toward -1)
          const newStage = Math.min(cardData.stage + 1, MAX_STAGE);
          const updates = {
            stage: newStage,
            relearning: false,
            totalReviews: cardData.totalReviews + 1,
            lastReviewed: Timestamp.now()
          };
          
          console.log(`[CardService] Review card ${cardId} correct answer: stage ${cardData.stage} -> ${newStage}`);
          transaction.update(cardRef, updates);
        }
      });
    } catch (error) {
      if (error instanceof CardServiceError) {
        throw error;
      }
      throw this.handleFirebaseError(error, 'Failed to process correct answer');
    }
  }
  
  /**
   * Processes an incorrect answer for a card with enhanced validation and relearning logic
   * @param userId - User ID who owns the card
   * @param cardId - Card ID to process
   */
  static async processIncorrectAnswer(userId: string, cardId: string): Promise<void> {
    if (!userId || !cardId) {
      throw new CardServiceError('User ID and Card ID are required', 'VALIDATION_ERROR');
    }

    try {
      const cardRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.CARDS, cardId);
      
      await runTransaction(db, async (transaction) => {
        const cardDoc = await transaction.get(cardRef);
        
        if (!cardDoc.exists()) {
          throw new CardServiceError(ERROR_MESSAGES.CARD_NOT_FOUND, 'NOT_FOUND');
        }
        
        const cardData = this.convertTimestampsToDates(cardDoc.data()) as Card;
        
        // Validate card state
        if (cardData.stage < MIN_STAGE || cardData.stage > MAX_STAGE) {
          throw new CardServiceError(ERROR_MESSAGES.INVALID_STAGE, 'VALIDATION_ERROR');
        }
        
        // Update card based on whether it's new or review
        if (cardData.isNew) {
          // Reset correct count for new cards - they stay in learning phase
          const updates = {
            correctCount: 0,
            totalReviews: cardData.totalReviews + 1,
            lastReviewed: Timestamp.now()
          };
          
          console.log(`[CardService] New card ${cardId} incorrect answer: correctCount reset to 0`);
          transaction.update(cardRef, updates);
        } else {
          // Reset stage to minimum and set relearning flag for review cards
          const updates = {
            stage: MIN_STAGE,
            relearning: true,
            totalReviews: cardData.totalReviews + 1,
            lastReviewed: Timestamp.now()
          };
          
          console.log(`[CardService] Review card ${cardId} incorrect answer: stage reset to ${MIN_STAGE}, relearning = true`);
          transaction.update(cardRef, updates);
        }
      });
    } catch (error) {
      if (error instanceof CardServiceError) {
        throw error;
      }
      throw this.handleFirebaseError(error, 'Failed to process incorrect answer');
    }
  }
  
  /**
   * Graduates a new card to review status with enhanced validation and graduation logic
   * @param userId - User ID who owns the card
   * @param cardId - Card ID to graduate
   */
  static async graduateNewCard(userId: string, cardId: string): Promise<void> {
    if (!userId || !cardId) {
      throw new CardServiceError('User ID and Card ID are required', 'VALIDATION_ERROR');
    }

    try {
      const cardRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.CARDS, cardId);
      
      await runTransaction(db, async (transaction) => {
        const cardDoc = await transaction.get(cardRef);
        
        if (!cardDoc.exists()) {
          throw new CardServiceError(ERROR_MESSAGES.CARD_NOT_FOUND, 'NOT_FOUND');
        }
        
        const cardData = this.convertTimestampsToDates(cardDoc.data()) as Card;
        
        // Validate that this is actually a new card
        if (!cardData.isNew) {
          throw new CardServiceError('Card is not a new card and cannot be graduated', 'VALIDATION_ERROR');
        }
        
        // Validate card state before graduation
        if (cardData.stage < MIN_STAGE || cardData.stage > MAX_STAGE) {
          throw new CardServiceError(ERROR_MESSAGES.INVALID_STAGE, 'VALIDATION_ERROR');
        }
        
        // Graduate the card to review status
        const graduationStage = MIN_STAGE + 1; // Start at -6 for first review
        const updates = {
          isNew: false,
          stage: graduationStage,
          correctCount: 0, // Reset for review tracking
          relearning: false
        };
        
        console.log(`[CardService] Graduating new card ${cardId}: isNew false, stage -> ${graduationStage}`);
        transaction.update(cardRef, updates);
      });
    } catch (error) {
      if (error instanceof CardServiceError) {
        throw error;
      }
      throw this.handleFirebaseError(error, 'Failed to graduate new card');
    }
  }
  
  // Private helper methods
  
  /**
   * Validates card data for creation
   */
  private static validateCardData(cardData: CreateCardInput | CreateSentenceCardInput): void {
    if (!cardData.userId || !cardData.deckId) {
      throw new CardServiceError('User ID and Deck ID are required', 'VALIDATION_ERROR');
    }
    
    if (!cardData.front || !cardData.back) {
      throw new CardServiceError('Front and back content are required', 'VALIDATION_ERROR');
    }
    
    if (cardData.front.length > VALIDATION_LIMITS.MAX_CARD_CONTENT_LENGTH ||
        cardData.back.length > VALIDATION_LIMITS.MAX_CARD_CONTENT_LENGTH) {
      throw new CardServiceError('Card content exceeds maximum length', 'VALIDATION_ERROR');
    }
    
    if (!Object.values(CARD_TYPES).includes(cardData.type)) {
      throw new CardServiceError(ERROR_MESSAGES.INVALID_CARD_TYPE, 'VALIDATION_ERROR');
    }
    
    if (cardData.type === CARD_TYPES.SENTENCE) {
      const sentenceCard = cardData as CreateSentenceCardInput;
      if (!sentenceCard.translation) {
        throw new CardServiceError('Translation is required for sentence cards', 'VALIDATION_ERROR');
      }
      if (sentenceCard.translation.length > VALIDATION_LIMITS.MAX_CARD_CONTENT_LENGTH) {
        throw new CardServiceError('Translation content exceeds maximum length', 'VALIDATION_ERROR');
      }
    }
    
    if (cardData.stage < MIN_STAGE || cardData.stage > MAX_STAGE) {
      throw new CardServiceError(ERROR_MESSAGES.INVALID_STAGE, 'VALIDATION_ERROR');
    }
  }
  
  /**
   * Validates card update data
   */
  private static validateCardUpdates(updates: UpdateCardInput | UpdateSentenceCardInput): void {
    if (updates.front && updates.front.length > VALIDATION_LIMITS.MAX_CARD_CONTENT_LENGTH) {
      throw new CardServiceError('Front content exceeds maximum length', 'VALIDATION_ERROR');
    }
    
    if (updates.back && updates.back.length > VALIDATION_LIMITS.MAX_CARD_CONTENT_LENGTH) {
      throw new CardServiceError('Back content exceeds maximum length', 'VALIDATION_ERROR');
    }
    
    if ('translation' in updates && updates.translation && 
        updates.translation.length > VALIDATION_LIMITS.MAX_CARD_CONTENT_LENGTH) {
      throw new CardServiceError('Translation content exceeds maximum length', 'VALIDATION_ERROR');
    }
    
    if (updates.stage !== undefined && (updates.stage < MIN_STAGE || updates.stage > MAX_STAGE)) {
      throw new CardServiceError(ERROR_MESSAGES.INVALID_STAGE, 'VALIDATION_ERROR');
    }
  }
  
  /**
   * Converts Date objects to Firestore Timestamps and sanitizes data
   */
  private static convertDatesToTimestamps(data: any): any {
    const converted = { ...data };
    
    // Convert Date objects to Timestamps
    if (converted.createdAt instanceof Date) {
      converted.createdAt = Timestamp.fromDate(converted.createdAt);
    }
    
    // Handle lastReviewed field
    if (converted.lastReviewed instanceof Date) {
      converted.lastReviewed = Timestamp.fromDate(converted.lastReviewed);
    } else if (converted.lastReviewed === undefined || converted.lastReviewed === null) {
      // Remove undefined/null values as Firebase doesn't support them
      delete converted.lastReviewed;
    }
    
    // Handle nextReview field
    if (converted.nextReview instanceof Date) {
      converted.nextReview = Timestamp.fromDate(converted.nextReview);
    } else if (converted.nextReview === undefined || converted.nextReview === null) {
      // Remove undefined/null values as Firebase doesn't support them
      delete converted.nextReview;
    }
    
    // Sanitize all fields to remove undefined values
    const sanitized = this.sanitizeForFirestore(converted);
    
    console.log('[CardService] Data after sanitization:', sanitized);
    return sanitized;
  }
  
  /**
   * Recursively removes undefined values from an object
   */
  private static sanitizeForFirestore(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeForFirestore(item));
    }
    
    if (typeof obj === 'object' && obj.constructor === Object) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          sanitized[key] = this.sanitizeForFirestore(value);
        }
      }
      return sanitized;
    }
    
    return obj;
  }
  
  /**
   * Converts Firestore Timestamps to Date objects
   */
  private static convertTimestampsToDates(data: any): any {
    const converted = { ...data };
    
    if (converted.createdAt && typeof converted.createdAt.toDate === 'function') {
      converted.createdAt = converted.createdAt.toDate();
    }
    if (converted.lastReviewed && typeof converted.lastReviewed.toDate === 'function') {
      converted.lastReviewed = converted.lastReviewed.toDate();
    }
    if (converted.nextReview && typeof converted.nextReview.toDate === 'function') {
      converted.nextReview = converted.nextReview.toDate();
    }
    
    return converted;
  }
  
  /**
   * Handles Firebase errors and converts them to CardServiceError
   */
  private static handleFirebaseError(error: any, defaultMessage: string): CardServiceError {
    console.error('CardService Firebase Error:', error);
    
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