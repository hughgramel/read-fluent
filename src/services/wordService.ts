import { getFirestore, collection, getDocs, setDoc, doc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { isNumeric } from '@/components/reader/ReaderUtils';

export type WordType = 'known' | 'tracking' | 'ignored' | 'unknown';
export interface Word {
  word: string;
  type: WordType;
}

const db = getFirestore();

export const WordService = {
  async getWords(uid: string): Promise<Word[]> {
    const ref = collection(db, 'users', uid, 'words');
    const snap = await getDocs(ref);
    return snap.docs.map(doc => ({ word: doc.id, ...(doc.data() as Omit<Word, 'word'>) }));
  },
  async addWord(uid: string, word: string, type: WordType = 'tracking') {
    const ref = doc(db, 'users', uid, 'words', word);
    await setDoc(ref, { type });
  },
  async addWords(uid: string, words: string[], type: WordType = 'tracking') {
    const batch = writeBatch(db);
    words.forEach(word => {
      const ref = doc(db, 'users', uid, 'words', word);
      batch.set(ref, { type });
    });
    await batch.commit();
  },
  async updateWord(uid: string, word: string, type: WordType) {
    const ref = doc(db, 'users', uid, 'words', word);
    await updateDoc(ref, { type });
  },
  async updateWords(uid: string, words: string[], type: WordType) {
    const batch = writeBatch(db);
    words.forEach(word => {
      const ref = doc(db, 'users', uid, 'words', word);
      batch.update(ref, { type });
    });
    await batch.commit();
  },
  async removeWord(uid: string, word: string) {
    const ref = doc(db, 'users', uid, 'words', word);
    await deleteDoc(ref);
  },
  async batchUpdateWords(uid: string, words: string[], type: WordType) {
    const batch = writeBatch(db);
    
    // Filter out empty, invalid, or numeric words
    const validWords = words.filter(word => {
      if (!word || typeof word !== 'string' || word.trim() === '') {
        console.warn('Skipping invalid word:', word);
        return false;
      }
      
      // Skip numbers (including decimal numbers, negative numbers, etc.)
      if (isNumeric(word)) {
        console.warn('Skipping numeric word:', word);
        return false;
      }
      
      return true;
    });
    
    validWords.forEach(word => {
      try {
        const ref = doc(db, 'users', uid, 'words', word);
        // Use setDoc with merge: true to handle both new and existing words
        batch.set(ref, { type }, { merge: true });
      } catch (error) {
        console.error('Error creating document reference for word:', word, error);
        throw error;
      }
    });
    
    // Always commit the batch, even if it's empty
    await batch.commit();
  },
}; 