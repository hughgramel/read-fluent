import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  // TODO: Replace with your Firebase config object
  // You can find this in your Firebase Console -> Project Settings -> General -> Your Apps
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "placeholder-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "placeholder-domain.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "placeholder-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "placeholder-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:placeholder"
};

// Initialize Firebase only if we have a valid API key
let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'placeholder-api-key') {
  // Only initialize Firebase on the client side with real config
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

// Test Firebase connection
export async function testFirebaseConnection() {
  if (!auth || !db) {
    console.log('🚧 Firebase not initialized (missing configuration)');
    return false;
  }

  try {
    // Test auth
    await auth.signOut();
    console.log('✅ Firebase Authentication is connected');

    // Test Firestore
    const testCollection = collection(db, '_test_connection');
    const testDoc = doc(testCollection, 'test');
    await setDoc(testDoc, { timestamp: new Date() });
    await deleteDoc(testDoc);
    console.log('✅ Firestore is connected');

    return true;
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return false;
  }
}

export async function uploadFileAndGetUrl(path: string, file: Blob | Uint8Array | ArrayBuffer) {
  if (!storage) {
    throw new Error('Firebase Storage not initialized');
  }
  const ref = storageRef(storage, path);
  await uploadBytes(ref, file);
  return await getDownloadURL(ref);
}

export { app, auth, db, storage }; 