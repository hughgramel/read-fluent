'use client';

import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SUPPORTED_LANGUAGES } from '@/i18n/config';
import i18n from '@/i18n/config';

interface I18nContextType {
  currentLanguage: string;
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
  changeLanguage: (languageCode: string) => Promise<void>;
  t: (key: string, options?: any) => string;
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t, i18n: i18nInstance } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize language from user profile or browser settings
  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        let initialLanguage = 'en';

        if (user?.uid) {
          // For now, we'll use browser detection until user profile is loaded
          // This will be improved when user profile data is properly loaded
          const browserLanguage = navigator.language.split('-')[0];
          const supportedLanguageCodes = SUPPORTED_LANGUAGES.map(lang => lang.code);
          
          if (supportedLanguageCodes.includes(browserLanguage)) {
            initialLanguage = browserLanguage;
          }
        } else {
          // Use browser language detection
          const browserLanguage = navigator.language.split('-')[0];
          const supportedLanguageCodes = SUPPORTED_LANGUAGES.map(lang => lang.code);
          
          if (supportedLanguageCodes.includes(browserLanguage)) {
            initialLanguage = browserLanguage;
          }
        }

        // Change language in i18next
        await i18nInstance.changeLanguage(initialLanguage);
        setCurrentLanguage(initialLanguage);
      } catch (error) {
        console.error('Error initializing language:', error);
        // Fallback to English
        await i18nInstance.changeLanguage('en');
        setCurrentLanguage('en');
      } finally {
        setIsLoading(false);
      }
    };

    initializeLanguage();
  }, [user, i18nInstance]);

  const changeLanguage = async (languageCode: string) => {
    try {
      setIsLoading(true);
      
      // Validate language code
      const supportedLanguageCodes = SUPPORTED_LANGUAGES.map(lang => lang.code);
      if (!supportedLanguageCodes.includes(languageCode)) {
        throw new Error(`Unsupported language code: ${languageCode}`);
      }

      // Change language in i18next
      await i18nInstance.changeLanguage(languageCode);
      setCurrentLanguage(languageCode);

      // Update user profile if user is logged in
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          'profile.language': languageCode,
          lastUpdatedAt: new Date()
        });
      }

      // Store in localStorage for persistence
      localStorage.setItem('i18nextLng', languageCode);
    } catch (error) {
      console.error('Error changing language:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value: I18nContextType = {
    currentLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
    changeLanguage,
    t,
    isLoading,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// Re-export useTranslation for convenience
export { useTranslation } from 'react-i18next';