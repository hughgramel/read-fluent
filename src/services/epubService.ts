import { db } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';

const storage = getStorage();

export async function uploadEpub(userId: string, file: File, metadata: any) {
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