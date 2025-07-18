import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  User, 
  UserPreferences,
  UserProfile,
  createNewUserDocument 
} from '@/types/user';

export class UserService {
  private static COLLECTION = 'users';

  static async createUser(
    uid: string,
    email: string,
    displayName: string | null = null,
    photoURL: string | null = null
  ): Promise<void> {
    const userDoc = doc(db, this.COLLECTION, uid);
    const newUser = createNewUserDocument(uid, email, displayName, photoURL);
    await setDoc(userDoc, {
      ...newUser,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      lastUpdatedAt: serverTimestamp(),
    });
  }

  static async getUser(uid: string): Promise<User | null> {
    const userDoc = doc(db, this.COLLECTION, uid);
    const userSnap = await getDoc(userDoc);
    
    if (!userSnap.exists()) {
      return null;
    }
    
    return userSnap.data() as User;
  }

  static async updateUserPreferences(
    uid: string,
    preferences: Partial<UserPreferences>
  ): Promise<void> {
    try {
      console.log('[UserService] Updating preferences for user:', uid, 'preferences:', preferences);
      const userDoc = doc(db, this.COLLECTION, uid);
      // Fetch current preferences
      const snap = await getDoc(userDoc);
      let currentPrefs = {};
      if (snap.exists() && snap.data().preferences) {
        currentPrefs = snap.data().preferences;
      }
      // Merge new preferences with current
      const mergedPrefs = { ...currentPrefs, ...preferences };
      await updateDoc(userDoc, {
        preferences: mergedPrefs,
        lastUpdatedAt: serverTimestamp(),
      });
      console.log('[UserService] Successfully updated preferences for user:', uid);
    } catch (error) {
      console.error('[UserService] Failed to update preferences for user:', uid, 'error:', error);
      throw error;
    }
  }

  static async getUserPreferences(uid: string): Promise<UserPreferences | null> {
    try {
      console.log('[UserService] Getting preferences for user:', uid);
      const userDoc = doc(db, this.COLLECTION, uid);
      const snap = await getDoc(userDoc);
      const preferences = snap.exists() ? (snap.data().preferences as UserPreferences) : null;
      console.log('[UserService] Retrieved preferences for user:', uid, 'preferences:', preferences);
      return preferences;
    } catch (error) {
      console.error('[UserService] Failed to get preferences for user:', uid, 'error:', error);
      throw error;
    }
  }

  static async updateLastLogin(uid: string): Promise<void> {
    const userDoc = doc(db, this.COLLECTION, uid);
    await updateDoc(userDoc, {
      lastLoginAt: serverTimestamp(),
    });
  }

  static async updateAccountType(
    uid: string,
    accountType: User['accountType'],
    subscriptionStatus: User['subscriptionStatus'],
    subscriptionEndDate: Date | null
  ): Promise<void> {
    const userDoc = doc(db, this.COLLECTION, uid);
    await updateDoc(userDoc, {
      accountType,
      subscriptionStatus,
      subscriptionEndDate,
      lastUpdatedAt: serverTimestamp(),
    });
  }

  static async updateProfile(
    uid: string,
    profile: Partial<UserProfile>
  ): Promise<void> {
    const userDoc = doc(db, this.COLLECTION, uid);
    await updateDoc(userDoc, {
      'profile.displayName': profile.displayName,
      'profile.photoURL': profile.photoURL,
      lastUpdatedAt: serverTimestamp(),
    });
  }

  static async updateEmail(
    uid: string,
    email: string
  ): Promise<void> {
    const userDoc = doc(db, this.COLLECTION, uid);
    await updateDoc(userDoc, {
      email,
      lastUpdatedAt: serverTimestamp(),
    });
  }

  static async deleteUser(uid: string): Promise<void> {
    const userDoc = doc(db, this.COLLECTION, uid);
    await deleteDoc(userDoc);
  }

  // --- Achievement Methods --- //
  static async getUserAchievements(uid: string): Promise<string[]> {
    const achievementsCol = collection(db, this.COLLECTION, uid, 'achievements');
    const snapshot = await getDocs(achievementsCol);
    return snapshot.docs.map(doc => doc.id);
  }

  static async unlockAchievement(uid: string, achievementId: string): Promise<void> {
    const achievementDoc = doc(db, this.COLLECTION, uid, 'achievements', achievementId);
    await setDoc(achievementDoc, {
      achievementId,
      unlockedAt: serverTimestamp(),
    });
  }

  static async isAchievementUnlocked(uid: string, achievementId: string): Promise<boolean> {
    const achievementDoc = doc(db, this.COLLECTION, uid, 'achievements', achievementId);
    const docSnap = await getDoc(achievementDoc);
    return docSnap.exists();
  }

  // --- Daily Goal Methods --- //
  static async getDailyGoal(uid: string): Promise<number> {
    const userDoc = doc(db, this.COLLECTION, uid);
    const snap = await getDoc(userDoc);
    if (!snap.exists()) {
      return 1500; // default value
    }
    const data = snap.data();
    return data.preferences?.dailyGoal || 1500;
  }

  static async setDailyGoal(uid: string, goal: number): Promise<void> {
    const userDoc = doc(db, this.COLLECTION, uid);
    await updateDoc(userDoc, {
      'preferences.dailyGoal': goal,
      lastUpdatedAt: serverTimestamp(),
    });
  }
} 