import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GlobalSettings } from '../GlobalSettings';
import { GlobalSettingsService } from '../../services/globalSettingsService';
import { GlobalReviewSettings } from '../../types/spaced-repetition';

// Mock the service
vi.mock('../../services/globalSettingsService');

const mockGlobalSettingsService = vi.mocked(GlobalSettingsService);

describe('GlobalSettings', () => {
  const mockUserId = 'test-user-123';
  const mockSettings: GlobalReviewSettings = {
    userId: mockUserId,
    studyOrder: 'reviews-first'
  };

  const defaultProps = {
    userId: mockUserId,
    isOpen: true,
    onClose: vi.fn(),
    onSettingsUpdated: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<GlobalSettings {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Global Settings')).not.toBeInTheDocument();
  });

  it('should render loading state initially', async () => {
    mockGlobalSettingsService.getGlobalSettings.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<GlobalSettings {...defaultProps} />);
    
    expect(screen.getByText('Loading settings...')).toBeInTheDocument();
  });

  it('should load and display settings', async () => {
    mockGlobalSettingsService.getGlobalSettings.mockResolvedValue(mockSettings);

    render(<GlobalSettings {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Global Settings')).toBeInTheDocument();
    });

    expect(screen.getByText('Study Order')).toBeInTheDocument();
    expect(screen.getByText('Reviews First')).toBeInTheDocument();
    expect(screen.getByText('New Cards First')).toBeInTheDocument();
    
    // Check that the correct radio button is selected
    const reviewsFirstRadio = screen.getByDisplayValue('reviews-first');
    expect(reviewsFirstRadio).toBeChecked();
  });

  it('should handle loading error', async () => {
    const mockError = new Error('Failed to load');
    mockGlobalSettingsService.getGlobalSettings.mockRejectedValue(mockError);

    render(<GlobalSettings {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load settings. Please try again.')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should allow changing study order', async () => {
    mockGlobalSettingsService.getGlobalSettings.mockResolvedValue(mockSettings);

    render(<GlobalSettings {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Study Order')).toBeInTheDocument();
    });

    const newFirstRadio = screen.getByDisplayValue('new-first');
    fireEvent.click(newFirstRadio);

    expect(newFirstRadio).toBeChecked();
  });

  it('should save settings when save button is clicked', async () => {
    mockGlobalSettingsService.getGlobalSettings.mockResolvedValue(mockSettings);
    mockGlobalSettingsService.updateGlobalSettings.mockResolvedValue();

    render(<GlobalSettings {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Study Order')).toBeInTheDocument();
    });

    // Change setting
    const newFirstRadio = screen.getByDisplayValue('new-first');
    fireEvent.click(newFirstRadio);

    // Save
    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockGlobalSettingsService.updateGlobalSettings).toHaveBeenCalledWith(
        mockUserId,
        { ...mockSettings, studyOrder: 'new-first' }
      );
    });

    expect(defaultProps.onSettingsUpdated).toHaveBeenCalledWith(
      { ...mockSettings, studyOrder: 'new-first' }
    );
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should handle save error', async () => {
    mockGlobalSettingsService.getGlobalSettings.mockResolvedValue(mockSettings);
    mockGlobalSettingsService.updateGlobalSettings.mockRejectedValue(new Error('Save failed'));

    render(<GlobalSettings {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Study Order')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to save settings. Please try again.')).toBeInTheDocument();
    });
  });

  it('should reset settings to defaults', async () => {
    const resetSettings: GlobalReviewSettings = {
      userId: mockUserId,
      studyOrder: 'reviews-first'
    };

    mockGlobalSettingsService.getGlobalSettings.mockResolvedValue({
      ...mockSettings,
      studyOrder: 'new-first'
    });
    mockGlobalSettingsService.resetGlobalSettings.mockResolvedValue(resetSettings);

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<GlobalSettings {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Study Order')).toBeInTheDocument();
    });

    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(mockGlobalSettingsService.resetGlobalSettings).toHaveBeenCalledWith(mockUserId);
    });

    expect(defaultProps.onSettingsUpdated).toHaveBeenCalledWith(resetSettings);
    
    confirmSpy.mockRestore();
  });

  it('should not reset if user cancels confirmation', async () => {
    mockGlobalSettingsService.getGlobalSettings.mockResolvedValue(mockSettings);

    // Mock window.confirm to return false
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<GlobalSettings {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Study Order')).toBeInTheDocument();
    });

    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);

    expect(mockGlobalSettingsService.resetGlobalSettings).not.toHaveBeenCalled();
    
    confirmSpy.mockRestore();
  });

  it('should close when cancel button is clicked', async () => {
    mockGlobalSettingsService.getGlobalSettings.mockResolvedValue(mockSettings);

    render(<GlobalSettings {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Study Order')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should close when backdrop is clicked', async () => {
    mockGlobalSettingsService.getGlobalSettings.mockResolvedValue(mockSettings);

    render(<GlobalSettings {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Study Order')).toBeInTheDocument();
    });

    // Click on the backdrop (the outer div with fixed positioning)
    const backdrop = document.querySelector('.fixed.inset-0');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(defaultProps.onClose).toHaveBeenCalled();
    }
  });

  it('should close when escape key is pressed', async () => {
    mockGlobalSettingsService.getGlobalSettings.mockResolvedValue(mockSettings);

    render(<GlobalSettings {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Study Order')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should disable buttons while saving', async () => {
    mockGlobalSettingsService.getGlobalSettings.mockResolvedValue(mockSettings);
    mockGlobalSettingsService.updateGlobalSettings.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<GlobalSettings {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Study Order')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    expect(screen.getByText('Cancel')).toBeDisabled();
    expect(screen.getByText('Reset to Defaults')).toBeDisabled();
  });
});