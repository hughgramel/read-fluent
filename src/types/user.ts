export type AccountType = 'free' | 'premium' | 'enterprise';

export type FocusSessionDuration = 25 | 30 | 45 | 60;

export interface UserPreferences {
  // Focus session preferences
  defaultSessionDuration: FocusSessionDuration;
  enableSoundEffects: boolean;
  enableNotifications: boolean;
  
  // Game preferences
  autoSaveEnabled: boolean;
  darkMode: boolean;
  showTutorialTips: boolean;
}

export interface UserStats {
  totalFocusSessions: number;
  totalFocusMinutes: number;
  longestStreak: number;
  currentStreak: number;
  lastSessionDate: Date | null;
}

export interface UserProfile {
  displayName: string | null;
  photoURL: string | null;
  timezone: string;
  country: string | null;
}

export interface User {
  // Firebase Auth fields
  uid: string;
  email: string;
  emailVerified: boolean;
  
  // Custom fields
  accountType: AccountType;
  profile: UserProfile;
  
  // Subscription info
  subscriptionStatus: 'active' | 'canceled' | 'expired' | null;
  subscriptionEndDate: Date | null;
  
  // Metadata
  createdAt: Date;
  lastLoginAt: Date;
  lastUpdatedAt: Date;
}


// Helper function to create a new user document
export function createNewUserDocument(
  uid: string,
  email: string,
  displayName: string | null = null,
  photoURL: string | null = null
): Omit<User, 'emailVerified'> {
  const now = new Date();
  
  return {
    uid,
    email,
    accountType: 'free',
    profile: {
      displayName,
      photoURL,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      country: null,
    },
    subscriptionStatus: null,
    subscriptionEndDate: null,
    createdAt: now,
    lastLoginAt: now,
    lastUpdatedAt: now,
  };
}