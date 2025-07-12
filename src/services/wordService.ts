import { getFirestore, collection, getDocs, setDoc, doc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';

export type WordType = 'known' | 'tracking' | 'ignored';
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
  async deleteWord(uid: string, word: string) {
    const ref = doc(db, 'users', uid, 'words', word);
    await deleteDoc(ref);
  },
}; 