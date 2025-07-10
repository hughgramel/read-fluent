import { getFirestore, collection, getDocs, setDoc, doc, serverTimestamp, addDoc, query, orderBy } from 'firebase/firestore';

export interface UserSentence {
  id?: string;
  text: string;
  createdAt: Date;
}

const db = getFirestore();

export const SentenceService = {
  async addSentence(uid: string, text: string): Promise<void> {
    const ref = collection(db, 'users', uid, 'sentences');
    await addDoc(ref, {
      text,
      createdAt: serverTimestamp(),
    });
  },
  async getSentences(uid: string): Promise<UserSentence[]> {
    const ref = collection(db, 'users', uid, 'sentences');
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<UserSentence, 'id' | 'createdAt'>), createdAt: doc.data().createdAt?.toDate?.() || new Date() }));
  },
}; 