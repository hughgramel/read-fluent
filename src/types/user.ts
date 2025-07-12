export type AccountType = 'free' | 'premium' | 'enterprise';

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  borderColor: string;
  accentColor: string;
  shadowColor: string;
  secondaryTextColor: string;
}

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
  customTheme?: ThemeConfig; // Custom theme configuration
  viewMode?: 'scroll-section' | 'scroll-book' | 'paginated-single' | 'paginated-two';
  disableWordsReadPopup?: boolean; // disables the words read popup
  dailyGoal?: number; // daily reading goal in words (default: 1500)
  
  // Reader-specific settings (moved from localStorage)
  readerContainerStyle?: 'contained' | 'border' | 'none' | 'full-width';
  sentencesPerPage?: number;
  ttsSpeed?: number;
  ttsVoice?: string;
  disableWordHighlighting?: boolean;
  disableSentenceHighlighting?: boolean;
  invisibleText?: boolean;
  showCurrentWordWhenInvisible?: boolean;
  highlightSentenceOnHover?: boolean;
  lineSpacing?: number;
  disableWordSpans?: boolean;
  disableSentenceSpans?: boolean;
  showAudioBarOnStart?: boolean; // NEW: show audio bar on start (default true)
  enableHighlightWords?: boolean; // Enable word highlighting based on status
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
  preferences?: UserPreferences;
  
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
    preferences: {
      darkMode: false,
      dailyGoal: 1500,
      showAudioBarOnStart: true, // NEW default
    },
    subscriptionStatus: null,
    subscriptionEndDate: null,
    createdAt: now,
    lastLoginAt: now,
    lastUpdatedAt: now,
  };
}