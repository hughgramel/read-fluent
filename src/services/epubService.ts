import { db } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore';

const storage = getStorage();

// Add BookMetadata type
export interface BookMetadata {
  id: string;
  userId: string;
  bookId: string;
  title: string;
  author: string;
  fileName: string;
  totalWords: number;
  storagePath: string;
  downloadURL: string;
  dateAdded: string;
  currentSection?: number; // Optional, for reading progress
  completed?: boolean; // Optional, for completed status
}

export async function uploadEpub(userId: string, file: File, metadata: Record<string, unknown>) {
  console.log('[epubService] uploadEpub called:', { userId, fileName: file.name, metadata });
  try {
    const storageRef = ref(storage, `epubs/${userId}/${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    const epubDoc = {
      ...metadata,
      fileName: file.name,
      storagePath: storageRef.fullPath,
      downloadURL,
      uploadedAt: new Date().toISOString(),
      userId,
    };
    const docRef = await addDoc(collection(db, 'epubs'), epubDoc);
    console.log('[epubService] uploadEpub success:', { docId: docRef.id, ...epubDoc });
    return { id: docRef.id, ...epubDoc };
  } catch (error) {
    console.error('[epubService] uploadEpub error:', error);
    throw error;
  }
}

export async function getUserEpubs(userId: string) {
  console.log('[epubService] getUserEpubs called:', { userId });
  try {
    const q = query(collection(db, 'epubs'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const result = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('[epubService] getUserEpubs success:', { count: result.length });
    return result;
  } catch (error) {
    console.error('[epubService] getUserEpubs error:', error);
    throw error;
  }
}

export async function deleteEpub(epubId: string, storagePath: string) {
  console.log('[epubService] deleteEpub called:', { epubId, storagePath });
  try {
    await deleteDoc(doc(db, 'epubs', epubId));
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
    console.log('[epubService] deleteEpub success:', { epubId });
  } catch (error) {
    console.error('[epubService] deleteEpub error:', error);
    throw error;
  }
}

// Upload the full book JSON to Firebase Storage
export async function uploadBookJson(userId: string, bookId: string, bookObj: Record<string, unknown>) {
  const json = JSON.stringify(bookObj);
  const storageRef = ref(storage, `books/${userId}/${bookId}.json`);
  await uploadBytes(storageRef, new Blob([json], { type: 'application/json' }));
  const downloadURL = await getDownloadURL(storageRef);
  return { storagePath: storageRef.fullPath, downloadURL };
}

// Save book metadata to Firestore
export async function saveBookMetadata(userId: string, bookId: string, metadata: Record<string, unknown>) {
  const docRef = await addDoc(collection(db, 'books'), {
    ...metadata,
    userId,
    bookId,
    dateAdded: new Date().toISOString(),
  });
  return { id: docRef.id, ...metadata };
}

// Get all books metadata for a user
export async function getBooks(userId: string): Promise<BookMetadata[]> {
  console.log('[epubService] getBooks called:', { userId });
  try {
    const q = query(collection(db, 'books'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    console.log('[epubService] getBooks snapshot size:', snapshot.size);
    // Removed fallback that fetched all books for debugging
    snapshot.forEach(doc => {
      console.log('[epubService] doc:', doc.id, doc.data());
    });
    return snapshot.docs.map(doc => {
      const data = doc.data() as Omit<BookMetadata, 'id'>;
      return { ...data, id: doc.id };
    });
  } catch (error) {
    console.error('[epubService] getBooks error:', error);
    throw error;
  }
}

// Download the full book JSON from Storage
export async function getBookJson(downloadURL: string) {
  const res = await fetch(downloadURL);
  if (!res.ok) throw new Error('Failed to fetch book JSON');
  return await res.json();
}

// Delete book metadata and JSON file
export async function deleteBook(bookId: string, storagePath: string) {
  // Delete Firestore metadata
  const q = query(collection(db, 'books'), where('bookId', '==', bookId));
  const snapshot = await getDocs(q);
  for (const d of snapshot.docs) {
    await deleteDoc(doc(db, 'books', d.id));
  }
  // Delete JSON from Storage
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
}

// Update book metadata in Firestore (e.g., currentSection)
export async function updateBookMetadata(userId: string, bookId: string, updates: Partial<BookMetadata>) {
  const q = query(collection(db, 'books'), where('userId', '==', userId), where('bookId', '==', bookId));
  const snapshot = await getDocs(q);
  for (const d of snapshot.docs) {
    await updateDoc(d.ref, updates);
  }
}

// Archive BookMetadata type
export interface ArchivedBookMetadata {
  id?: string;
  userId: string;
  bookId: string;
  title: string;
  author: string;
  totalWords: number;
  dateStarted: string;
  dateEnded: string;
  completed: boolean;
  wordsRead: number;
}

// Archive a book (save minimal info to archivedBooks collection)
export async function archiveBook(userId: string, bookId: string, data: Omit<ArchivedBookMetadata, 'id' | 'userId' | 'bookId'> & { dateStarted: string; dateEnded: string; completed: boolean; wordsRead: number }) {
  const docRef = await addDoc(collection(db, 'archivedBooks'), {
    userId,
    bookId,
    title: data.title,
    author: data.author,
    totalWords: data.totalWords,
    dateStarted: data.dateStarted,
    dateEnded: data.dateEnded,
    completed: data.completed,
    wordsRead: data.wordsRead,
  });
  return { id: docRef.id, ...data };
}

// Get all archived books for a user
export async function getArchivedBooks(userId: string): Promise<ArchivedBookMetadata[]> {
  const q = query(collection(db, 'archivedBooks'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<ArchivedBookMetadata, 'id'>) }));
}

// Delete an archived book
export async function deleteArchivedBook(archivedBookId: string) {
  await deleteDoc(doc(db, 'archivedBooks', archivedBookId));
} 