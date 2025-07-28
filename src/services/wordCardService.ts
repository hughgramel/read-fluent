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
  Timestamp
} from 'firebase/firestore';

export interface WordCard {
  id: string;
  userId: string;
  targetWord: string;
  sentence: string;
  sentenceTranslation: string;
  definition: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWordCardInput {
  userId: string;
  targetWord: string;
  sentence: string;
  sentenceTranslation: string;
  definition: string;
}

const db = getFirestore();

export class WordCardService {
  /**
   * Creates a new word card
   */
  static async createWordCard(cardData: CreateWordCardInput): Promise<string> {
    try {
      const cardRef = doc(collection(db, 'users', cardData.userId, 'wordCards'));
      const cardId = cardRef.id;
      
      const cardDoc: WordCard = {
        ...cardData,
        id: cardId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Convert Date objects to Firestore Timestamps
      const firestoreDoc = {
        ...cardDoc,
        createdAt: Timestamp.fromDate(cardDoc.createdAt),
        updatedAt: Timestamp.fromDate(cardDoc.updatedAt)
      };
      
      await setDoc(cardRef, firestoreDoc);
      return cardId;
    } catch (error) {
      console.error('[WordCardService] Error creating word card:', error);
      throw new Error('Failed to create word card');
    }
  }
  
  /**
   * Retrieves all word cards for a user
   */
  static async getWordCards(userId: string): Promise<WordCard[]> {
    try {
      const cardsRef = collection(db, 'users', userId, 'wordCards');
      const q = query(cardsRef, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const cards: WordCard[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        cards.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as WordCard);
      });
      
      return cards;
    } catch (error) {
      console.error('[WordCardService] Error retrieving word cards:', error);
      throw new Error('Failed to retrieve word cards');
    }
  }
  
  /**
   * Deletes a word card
   */
  static async deleteWordCard(userId: string, cardId: string): Promise<void> {
    try {
      const cardRef = doc(db, 'users', userId, 'wordCards', cardId);
      await deleteDoc(cardRef);
    } catch (error) {
      console.error('[WordCardService] Error deleting word card:', error);
      throw new Error('Failed to delete word card');
    }
  }
} 