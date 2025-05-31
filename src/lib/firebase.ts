import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  // TODO: Replace with your Firebase config object
  // You can find this in your Firebase Console -> Project Settings -> General -> Your Apps
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

// Test Firebase connection
export async function testFirebaseConnection() {
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

export { app, auth, db }; 