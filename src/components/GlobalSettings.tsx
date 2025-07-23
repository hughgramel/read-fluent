'use client';

import React, { useState, useEffect } from 'react';
import { GlobalReviewSettings } from '../types/spaced-repetition';
import { GlobalSettingsService } from '../services/globalSettingsService';
import { STUDY_ORDER } from '../constants/spaced-repetition';

interface GlobalSettingsProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated?: (settings: GlobalReviewSettings) => void;
}

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({
  userId,
  isOpen,
  onClose,
  onSettingsUpdated
}) => {
  const [settings, setSettings] = useState<GlobalReviewSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load settings when component opens
  useEffect(() => {
    if (isOpen && userId) {
      loadSettings();
    }
  }, [isOpen, userId]);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const globalSettings = await GlobalSettingsService.getGlobalSettings(userId);
      setSettings(globalSettings);
    } catch (err) {
      console.error('Error loading global settings:', err);
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setError(null);

    try {
      await GlobalSettingsService.updateGlobalSettings(userId, settings);
      onSettingsUpdated?.(settings);
      onClose();
    } catch (err) {
      console.error('Error saving global settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleStudyOrderChange = (studyOrder: 'reviews-first' | 'new-first') => {
    if (settings) {
      setSettings({
        ...settings,
        studyOrder
      });
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const defaultSettings = await GlobalSettingsService.resetGlobalSettings(userId);
      setSettings(defaultSettings);
      onSettingsUpdated?.(defaultSettings);
    } catch (err) {
      console.error('Error resetting global settings:', err);
      setError('Failed to reset settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ 
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      minHeight: '100vh',
      minWidth: '100vw'
    }}
      onClick={handleBackdropClick}
    >
      <div 
        className="card-themed rounded-2xl shadow-xl w-full max-w-md mx-auto"
        style={{
          background: 'var(--card-background, #fff)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: 'var(--border-color, #e5e7eb)' }}>
          <h2 
            className="text-2xl font-bold theme-text"
            style={{ color: 'var(--text-color, #1f2937)' }}
          >
            Global Settings
          </h2>
          <p 
            className="text-sm mt-1 theme-text-secondary"
            style={{ color: 'var(--secondary-text-color, #6b7280)' }}
          >
            Configure your global review preferences
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div 
                  className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2"
                  style={{ borderColor: 'var(--primary-color, #7b2ff2)' }}
                ></div>
                <p className="theme-text-secondary">Loading settings...</p>
              </div>
            </div>
          ) : error ? (
            <div className="py-4">
              <div 
                className="p-4 rounded-lg mb-4"
                style={{ 
                  backgroundColor: 'var(--error-background, #fef2f2)',
                  color: 'var(--error-color, #dc2626)',
                  border: '1px solid var(--error-border, #fecaca)'
                }}
              >
                {error}
              </div>
              <button
                onClick={loadSettings}
                className="btn-primary w-full py-2 px-4 rounded-lg font-medium"
                style={{
                  background: 'var(--primary-color, #7b2ff2)',
                  color: 'var(--button-text-color, white)'
                }}
              >
                Retry
              </button>
            </div>
          ) : settings ? (
            <div className="space-y-6">
              {/* Study Order Setting */}
              <div>
                <label 
                  className="block text-sm font-medium mb-3 theme-text"
                  style={{ color: 'var(--text-color, #1f2937)' }}
                >
                  Study Order
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="studyOrder"
                      value={STUDY_ORDER.REVIEWS_FIRST}
                      checked={settings.studyOrder === STUDY_ORDER.REVIEWS_FIRST}
                      onChange={(e) => handleStudyOrderChange(e.target.value as 'reviews-first')}
                      className="mr-3"
                      style={{ accentColor: 'var(--primary-color, #7b2ff2)' }}
                    />
                    <div>
                      <span 
                        className="font-medium theme-text"
                        style={{ color: 'var(--text-color, #1f2937)' }}
                      >
                        Reviews First
                      </span>
                      <p 
                        className="text-sm theme-text-secondary"
                        style={{ color: 'var(--secondary-text-color, #6b7280)' }}
                      >
                        Review due cards before learning new ones (recommended)
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="studyOrder"
                      value={STUDY_ORDER.NEW_FIRST}
                      checked={settings.studyOrder === STUDY_ORDER.NEW_FIRST}
                      onChange={(e) => handleStudyOrderChange(e.target.value as 'new-first')}
                      className="mr-3"
                      style={{ accentColor: 'var(--primary-color, #7b2ff2)' }}
                    />
                    <div>
                      <span 
                        className="font-medium theme-text"
                        style={{ color: 'var(--text-color, #1f2937)' }}
                      >
                        New Cards First
                      </span>
                      <p 
                        className="text-sm theme-text-secondary"
                        style={{ color: 'var(--secondary-text-color, #6b7280)' }}
                      >
                        Learn new cards before reviewing due ones
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div 
          className="p-6 border-t flex justify-between"
          style={{ borderColor: 'var(--border-color, #e5e7eb)' }}
        >
          <button
            onClick={handleReset}
            disabled={saving || loading}
            className="px-4 py-2 rounded-lg font-medium text-sm hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'var(--secondary-background, #f3f4f6)',
              color: 'var(--secondary-text-color, #6b7280)',
              border: '1px solid var(--border-color, #e5e7eb)'
            }}
          >
            Reset to Defaults
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg font-medium text-sm hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'var(--secondary-background, #f3f4f6)',
                color: 'var(--text-color, #1f2937)',
                border: '1px solid var(--border-color, #e5e7eb)'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading || !settings}
              className="btn-primary px-6 py-2 rounded-lg font-medium text-sm hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'var(--primary-color, #7b2ff2)',
                color: 'var(--button-text-color, white)'
              }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};