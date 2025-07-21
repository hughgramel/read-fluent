import { getFirestore, collection, getDocs, setDoc, doc, serverTimestamp, addDoc, query, orderBy, deleteDoc } from 'firebase/firestore';

export interface UserSentence {
  id?: string;
  text: string;
  createdAt: Date;
  targetWord?: string; // Added
}

const db = getFirestore();

export const SentenceService = {
  async addSentence(uid: string, text: string, targetWord?: string): Promise<void> {
    const ref = collection(db, 'users', uid, 'sentences');
    await addDoc(ref, {
      text,
      createdAt: serverTimestamp(),
      ...(targetWord ? { targetWord } : {}),
    });
  },
  async getSentences(uid: string): Promise<UserSentence[]> {
    const ref = collection(db, 'users', uid, 'sentences');
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<UserSentence, 'id' | 'createdAt'>), createdAt: doc.data().createdAt?.toDate?.() || new Date() }));
  },
  async removeSentence(uid: string, sentenceId: string): Promise<void> {
    const ref = doc(db, 'users', uid, 'sentences', sentenceId);
    await deleteDoc(ref);
  },
}; 