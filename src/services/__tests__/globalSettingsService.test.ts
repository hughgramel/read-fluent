import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { GlobalSettingsService } from '../globalSettingsService';
import { GlobalReviewSettings, CardServiceError } from '../../types/spaced-repetition';
import { COLLECTIONS, DEFAULT_GLOBAL_SETTINGS } from '../../constants/spaced-repetition';

// Mock Firebase
vi.mock('firebase/firestore');
vi.mock('../../lib/firebase', () => ({
  db: {}
}));

const mockDoc = vi.mocked(doc);
const mockGetDoc = vi.mocked(getDoc);
const mockSetDoc = vi.mocked(setDoc);

describe('GlobalSettingsService', () => {
  const mockUserId = 'test-user-123';
  const mockSettings: GlobalReviewSettings = {
    userId: mockUserId,
    studyOrder: 'reviews-first'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getGlobalSettings', () => {
    it('should return existing settings when they exist and are valid', async () => {
      const mockDocRef = { id: 'global' };
      const mockSnapshot = {
        exists: () => true,
        data: () => mockSettings
      };

      mockDoc.mockReturnValue(mockDocRef as any);
      mockGetDoc.mockResolvedValue(mockSnapshot as any);

      const result = await GlobalSettingsService.getGlobalSettings(mockUserId);

      expect(mockDoc).toHaveBeenCalledWith(
        {},
        COLLECTIONS.USERS,
        mockUserId,
        COLLECTIONS.REVIEW_SETTINGS,
        'global'
      );
      expect(mockGetDoc).toHaveBeenCalledWith(mockDocRef);
      expect(result).toEqual(mockSettings);
    });

    it('should return and save default settings when document does not exist', async () => {
      const mockDocRef = { id: 'global' };
      const mockSnapshot = {
        exists: () => false
      };

      const expectedDefaults = {
        userId: mockUserId,
        ...DEFAULT_GLOBAL_SETTINGS
      };

      mockDoc.mockReturnValue(mockDocRef as any);
      mockGetDoc.mockResolvedValue(mockSnapshot as any);
      mockSetDoc.mockResolvedValue(undefined);

      const result = await GlobalSettingsService.getGlobalSettings(mockUserId);

      expect(mockSetDoc).toHaveBeenCalledWith(mockDocRef, expectedDefaults, { merge: true });
      expect(result).toEqual(expectedDefaults);
    });

    it('should return and save default settings when existing settings are invalid', async () => {
      const invalidSettings = { userId: mockUserId, studyOrder: 'invalid-order' as any };
      const mockDocRef = { id: 'global' };
      const mockSnapshot = {
        exists: () => true,
        data: () => invalidSettings
      };

      const expectedDefaults = {
        userId: mockUserId,
        ...DEFAULT_GLOBAL_SETTINGS
      };

      mockDoc.mockReturnValue(mockDocRef as any);
      mockGetDoc.mockResolvedValue(mockSnapshot as any);
      mockSetDoc.mockResolvedValue(undefined);

      const result = await GlobalSettingsService.getGlobalSettings(mockUserId);

      expect(mockSetDoc).toHaveBeenCalledWith(mockDocRef, expectedDefaults, { merge: true });
      expect(result).toEqual(expectedDefaults);
    });

    it('should throw CardServiceError when Firebase operation fails', async () => {
      const mockError = new Error('Firebase error');
      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockRejectedValue(mockError);

      await expect(GlobalSettingsService.getGlobalSettings(mockUserId))
        .rejects.toThrow(CardServiceError);
    });
  });

  describe('updateGlobalSettings', () => {
    it('should successfully update valid settings', async () => {
      const mockDocRef = { id: 'global' };
      
      mockDoc.mockReturnValue(mockDocRef as any);
      mockSetDoc.mockResolvedValue(undefined);

      await GlobalSettingsService.updateGlobalSettings(mockUserId, mockSettings);

      expect(mockDoc).toHaveBeenCalledWith(
        {},
        COLLECTIONS.USERS,
        mockUserId,
        COLLECTIONS.REVIEW_SETTINGS,
        'global'
      );
      expect(mockSetDoc).toHaveBeenCalledWith(mockDocRef, mockSettings, { merge: true });
    });

    it('should throw validation error for invalid settings', async () => {
      const invalidSettings = { userId: mockUserId, studyOrder: 'invalid' } as any;

      await expect(GlobalSettingsService.updateGlobalSettings(mockUserId, invalidSettings))
        .rejects.toThrow(CardServiceError);
      
      expect(mockSetDoc).not.toHaveBeenCalled();
    });

    it('should throw CardServiceError when Firebase operation fails', async () => {
      const mockError = new Error('Firebase error');
      const mockDocRef = { id: 'global' };
      
      mockDoc.mockReturnValue(mockDocRef as any);
      mockSetDoc.mockRejectedValue(mockError);

      await expect(GlobalSettingsService.updateGlobalSettings(mockUserId, mockSettings))
        .rejects.toThrow(CardServiceError);
    });
  });

  describe('resetGlobalSettings', () => {
    it('should reset settings to defaults', async () => {
      const mockDocRef = { id: 'global' };
      const expectedDefaults = {
        userId: mockUserId,
        ...DEFAULT_GLOBAL_SETTINGS
      };
      
      mockDoc.mockReturnValue(mockDocRef as any);
      mockSetDoc.mockResolvedValue(undefined);

      const result = await GlobalSettingsService.resetGlobalSettings(mockUserId);

      expect(mockSetDoc).toHaveBeenCalledWith(mockDocRef, expectedDefaults, { merge: true });
      expect(result).toEqual(expectedDefaults);
    });

    it('should throw CardServiceError when reset fails', async () => {
      const mockError = new Error('Firebase error');
      const mockDocRef = { id: 'global' };
      
      mockDoc.mockReturnValue(mockDocRef as any);
      mockSetDoc.mockRejectedValue(mockError);

      await expect(GlobalSettingsService.resetGlobalSettings(mockUserId))
        .rejects.toThrow(CardServiceError);
    });
  });
});