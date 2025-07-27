import { getFirestore, collection, getDocs, addDoc, query, where, orderBy, deleteDoc, doc } from 'firebase/firestore';

export interface ReadingSession {
  id?: string;
  bookId?: string; // Optional for backward compatibility
  bookTitle: string;
  sectionId: string;
  sectionTitle: string;
  wordCount: number;
  timestamp: Date;
  userId: string;
}

const db = getFirestore();

export const ReadingSessionService = {
  async addSession(session: Omit<ReadingSession, 'id'>): Promise<void> {
    // Check if a session already exists for this user, book, and section
    const sessionsRef = collection(db, 'readingSessions');
    const existingQuery = query(
      sessionsRef,
      where('userId', '==', session.userId),
      where('bookId', '==', session.bookId),
      where('sectionId', '==', session.sectionId)
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    // If a session already exists, don't create a duplicate
    if (!existingSnapshot.empty) {
      console.log('Session already exists for', session.sectionId, '- skipping duplicate');
      return;
    }
    
    // Add new session only if it doesn't exist
    await addDoc(sessionsRef, {
      ...session,
      timestamp: new Date(),
    });
  },

  async getUserSessions(userId: string): Promise<ReadingSession[]> {
    const sessionsRef = collection(db, 'readingSessions');
    const q = query(
      sessionsRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp.toDate(),
        // bookId may be missing in old sessions
      } as ReadingSession;
    });
  },

  async getBookSessions(userId: string, bookId: string): Promise<ReadingSession[]> {
    const sessionsRef = collection(db, 'readingSessions');
    const q = query(
      sessionsRef,
      where('userId', '==', userId),
      where('bookId', '==', bookId),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp.toDate(),
      } as ReadingSession;
    });
  },

  async removeSession({ userId, bookId, sectionId }: { userId: string; bookId?: string; sectionId: string }): Promise<void> {
    const sessionsRef = collection(db, 'readingSessions');
    let q;
    if (bookId) {
      q = query(
        sessionsRef,
        where('userId', '==', userId),
        where('bookId', '==', bookId),
        where('sectionId', '==', sectionId)
      );
    } else {
      q = query(
        sessionsRef,
        where('userId', '==', userId),
        where('sectionId', '==', sectionId)
      );
    }
    const snapshot = await getDocs(q);
    const batchDeletes = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'readingSessions', docSnap.id)));
    await Promise.all(batchDeletes);
  }
}; 