import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GlobalReviewSettings, CardServiceError } from '../types/spaced-repetition';
import { COLLECTIONS, DEFAULT_GLOBAL_SETTINGS } from '../constants/spaced-repetition';
import { validateGlobalReviewSettings } from '../utils/spaced-repetition-validation';

/**
 * Service for managing global review settings
 */
export class GlobalSettingsService {
  /**
   * Gets global review settings for a user
   */
  static async getGlobalSettings(userId: string): Promise<GlobalReviewSettings> {
    try {
      const settingsRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.REVIEW_SETTINGS, 'global');
      const settingsSnap = await getDoc(settingsRef);
      
      if (settingsSnap.exists()) {
        const settings = settingsSnap.data() as GlobalReviewSettings;
        
        // Validate the settings before returning
        if (validateGlobalReviewSettings(settings)) {
          return settings;
        } else {
          // If invalid, return defaults and update Firebase
          const defaultSettings = {
            userId,
            ...DEFAULT_GLOBAL_SETTINGS
          };
          await this.updateGlobalSettings(userId, defaultSettings);
          return defaultSettings;
        }
      } else {
        // Create default settings if they don't exist
        const defaultSettings = {
          userId,
          ...DEFAULT_GLOBAL_SETTINGS
        };
        await this.updateGlobalSettings(userId, defaultSettings);
        return defaultSettings;
      }
    } catch (error) {
      console.error('Error fetching global settings:', error);
      throw new CardServiceError(
        'Failed to fetch global settings',
        'FIREBASE_ERROR',
        error
      );
    }
  }

  /**
   * Updates global review settings for a user
   */
  static async updateGlobalSettings(userId: string, settings: GlobalReviewSettings): Promise<void> {
    try {
      // Validate settings before saving
      if (!validateGlobalReviewSettings(settings)) {
        throw new CardServiceError(
          'Invalid global settings provided',
          'VALIDATION_ERROR',
          settings
        );
      }

      const settingsRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.REVIEW_SETTINGS, 'global');
      await setDoc(settingsRef, settings, { merge: true });
    } catch (error) {
      if (error instanceof CardServiceError) {
        throw error;
      }
      
      console.error('Error updating global settings:', error);
      throw new CardServiceError(
        'Failed to update global settings',
        'FIREBASE_ERROR',
        error
      );
    }
  }

  /**
   * Resets global settings to defaults for a user
   */
  static async resetGlobalSettings(userId: string): Promise<GlobalReviewSettings> {
    try {
      const defaultSettings = {
        userId,
        ...DEFAULT_GLOBAL_SETTINGS
      };
      
      await this.updateGlobalSettings(userId, defaultSettings);
      return defaultSettings;
    } catch (error) {
      console.error('Error resetting global settings:', error);
      throw new CardServiceError(
        'Failed to reset global settings',
        'FIREBASE_ERROR',
        error
      );
    }
  }
}