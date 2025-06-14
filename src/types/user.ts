export type AccountType = 'free' | 'premium' | 'enterprise';

export interface UserPreferences {
  darkMode: boolean;
  readerFont?: string; // e.g. 'serif', 'sans', 'merriweather', etc.
  readerWidth?: number; // e.g. 600, 700, 900 (pixels)
  readerFontSize?: number; // e.g. 18 (pixels)
  language?: string;
  nativeLanguage?: string; // user's native language
  // Add more preferences as needed
  disableWordUnderlines?: boolean; // disables word underlines and popups
  theme?: string;
  viewMode?: 'scroll-section' | 'scroll-book' | 'paginated-single' | 'paginated-two';
}

export interface UserStats {
  totalWordsRead: number;
  totalSentencesRead: number;
  totalCharactersRead: number;
  totalTimeSpentReading: number;
  lastReadingDate: Date | null;
}

export interface UserProfile {
  displayName: string | null;
  photoURL: string | null;
  language: string;
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
      language: 'en',
    },
    subscriptionStatus: null,
    subscriptionEndDate: null,
    createdAt: now,
    lastLoginAt: now,
    lastUpdatedAt: now,
  };
}