'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { DeckService } from '@/services/deckService';
import { Deck, DeckSettings as DeckSettingsType, CardServiceError } from '@/types/spaced-repetition';
import { VALIDATION_LIMITS, DEFAULT_DECK_SETTINGS } from '@/constants/spaced-repetition';
import { useAuth } from '@/contexts/AuthContext';

interface DeckSettingsProps {
  deck: Deck;
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated: (deck: Deck) => void;
  onDeckDeleted?: () => void;
}

interface FormData {
  name: string;
  description: string;
  newCardsPerDay: number;
  cardsPerBatch: number;
  graduationThreshold: number;
}

interface FormErrors {
  name?: string;
  description?: string;
  newCardsPerDay?: string;
  cardsPerBatch?: string;
  graduationThreshold?: string;
  general?: string;
}

export function DeckSettings({ deck, isOpen, onClose, onSettingsUpdated, onDeckDeleted }: DeckSettingsProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    newCardsPerDay: DEFAULT_DECK_SETTINGS.newCardsPerDay,
    cardsPerBatch: DEFAULT_DECK_SETTINGS.cardsPerBatch,
    graduationThreshold: DEFAULT_DECK_SETTINGS.graduationThreshold
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dailyProgress, setDailyProgress] = useState<{ newCardsStudied: number; reviewsCompleted: number }>({
    newCardsStudied: 0,
    reviewsCompleted: 0
  });
  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Initialize form data when deck changes or modal opens
  useEffect(() => {
    if (isOpen && deck && user) {
      setFormData({
        name: deck.name,
        description: deck.description || '',
        newCardsPerDay: deck.settings.newCardsPerDay,
        cardsPerBatch: deck.settings.cardsPerBatch,
        graduationThreshold: deck.settings.graduationThreshold
      });
      setErrors({});
      
      // Load daily progress
      const loadDailyProgress = async () => {
        try {
          const progress = await DeckService.getDailyProgress(user.uid, deck.id);
          setDailyProgress(progress);
        } catch (error) {
          console.error("Failed to load daily progress:", error);
        }
      };
      
      loadDailyProgress();
    }
  }, [isOpen, deck, user]);

  // Focus name input when modal opens
  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle escape key and click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Deck name is required';
    } else if (formData.name.length > VALIDATION_LIMITS.MAX_DECK_NAME_LENGTH) {
      newErrors.name = `Name must be less than ${VALIDATION_LIMITS.MAX_DECK_NAME_LENGTH} characters`;
    }

    // Validate description
    if (formData.description.length > VALIDATION_LIMITS.MAX_DECK_DESCRIPTION_LENGTH) {
      newErrors.description = `Description must be less than ${VALIDATION_LIMITS.MAX_DECK_DESCRIPTION_LENGTH} characters`;
    }

    // Validate new cards per day
    if (formData.newCardsPerDay < VALIDATION_LIMITS.MIN_NEW_CARDS_PER_DAY || 
        formData.newCardsPerDay > VALIDATION_LIMITS.MAX_NEW_CARDS_PER_DAY) {
      newErrors.newCardsPerDay = `Must be between ${VALIDATION_LIMITS.MIN_NEW_CARDS_PER_DAY} and ${VALIDATION_LIMITS.MAX_NEW_CARDS_PER_DAY}`;
    }

    // Validate cards per batch
    if (formData.cardsPerBatch < VALIDATION_LIMITS.MIN_CARDS_PER_BATCH || 
        formData.cardsPerBatch > VALIDATION_LIMITS.MAX_CARDS_PER_BATCH) {
      newErrors.cardsPerBatch = `Must be between ${VALIDATION_LIMITS.MIN_CARDS_PER_BATCH} and ${VALIDATION_LIMITS.MAX_CARDS_PER_BATCH}`;
    }

    // Validate graduation threshold
    if (formData.graduationThreshold < VALIDATION_LIMITS.MIN_GRADUATION_THRESHOLD || 
        formData.graduationThreshold > VALIDATION_LIMITS.MAX_GRADUATION_THRESHOLD) {
      newErrors.graduationThreshold = `Must be between ${VALIDATION_LIMITS.MIN_GRADUATION_THRESHOLD} and ${VALIDATION_LIMITS.MAX_GRADUATION_THRESHOLD}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setErrors({ general: 'You must be logged in to update deck settings' });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Update deck basic info if changed
      const nameChanged = formData.name.trim() !== deck.name;
      const descriptionChanged = formData.description !== (deck.description || '');

      if (nameChanged || descriptionChanged) {
        await DeckService.updateDeck(user.uid, deck.id, {
          name: formData.name.trim(),
          description: formData.description || undefined
        });
      }

      // Update deck settings if changed
      const settingsChanged = 
        formData.newCardsPerDay !== deck.settings.newCardsPerDay ||
        formData.cardsPerBatch !== deck.settings.cardsPerBatch ||
        formData.graduationThreshold !== deck.settings.graduationThreshold;

      if (settingsChanged) {
        const newSettings: DeckSettingsType = {
          newCardsPerDay: formData.newCardsPerDay,
          cardsPerBatch: formData.cardsPerBatch,
          graduationThreshold: formData.graduationThreshold
        };

        await DeckService.updateDeckSettings(user.uid, deck.id, newSettings);
      }

      // Get updated deck and notify parent
      const updatedDeck = await DeckService.getDeck(user.uid, deck.id);
      if (updatedDeck) {
        onSettingsUpdated(updatedDeck);
      }

    } catch (error) {
      console.error('Failed to update deck settings:', error);

      if (error instanceof CardServiceError) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'Failed to update deck settings. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear field-specific error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        minHeight: '100vh',
        minWidth: '100vw'
      }}
    >
      <div
        ref={modalRef}
        className="card-themed w-full max-w-lg max-h-[90vh] overflow-y-auto mx-auto"
        style={{
          backgroundColor: 'var(--background)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-color)',
          transform: 'translateZ(0)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold theme-text">Deck Settings</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            style={{ color: 'var(--secondary-text-color)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium theme-text border-b pb-2" style={{ borderColor: 'var(--border-color)' }}>
              Basic Information
            </h3>
            
            {/* Deck Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium theme-text mb-2">
                Deck Name
              </label>
              <input
                ref={nameInputRef}
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={isSubmitting}
                placeholder="Enter deck name..."
                className="input-themed w-full"
                style={{
                  backgroundColor: 'var(--background)',
                  borderColor: errors.name ? '#ef4444' : 'var(--border-color)',
                  color: 'var(--text-color)'
                }}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium theme-text mb-2">
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                disabled={isSubmitting}
                placeholder="Enter deck description..."
                rows={3}
                className="input-themed w-full resize-none"
                style={{
                  backgroundColor: 'var(--background)',
                  borderColor: errors.description ? '#ef4444' : 'var(--border-color)',
                  color: 'var(--text-color)'
                }}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description}</p>
              )}
            </div>
          </div>

          {/* Today's Progress */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium theme-text border-b pb-2" style={{ borderColor: 'var(--border-color)' }}>
              Today's Progress
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg" style={{ borderColor: 'var(--border-color)' }}>
                <div className="text-sm theme-text-secondary">New Cards</div>
                <div className="text-2xl font-bold theme-text">{dailyProgress.newCardsStudied}/{formData.newCardsPerDay}</div>
              </div>
              <div className="p-4 border rounded-lg" style={{ borderColor: 'var(--border-color)' }}>
                <div className="text-sm theme-text-secondary">Reviews</div>
                <div className="text-2xl font-bold theme-text">{dailyProgress.reviewsCompleted}</div>
              </div>
            </div>
          </div>

          {/* Study Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium theme-text border-b pb-2" style={{ borderColor: 'var(--border-color)' }}>
              Study Settings
            </h3>

            {/* New Cards Per Day */}
            <div>
              <label htmlFor="newCardsPerDay" className="block text-sm font-medium theme-text mb-2">
                New Cards Per Day
              </label>
              <input
                id="newCardsPerDay"
                type="number"
                min={VALIDATION_LIMITS.MIN_NEW_CARDS_PER_DAY}
                max={VALIDATION_LIMITS.MAX_NEW_CARDS_PER_DAY}
                value={formData.newCardsPerDay}
                onChange={(e) => handleInputChange('newCardsPerDay', parseInt(e.target.value) || 0)}
                disabled={isSubmitting}
                className="input-themed w-full"
                style={{
                  backgroundColor: 'var(--background)',
                  borderColor: errors.newCardsPerDay ? '#ef4444' : 'var(--border-color)',
                  color: 'var(--text-color)'
                }}
              />
              <p className="text-sm theme-text-secondary mt-1">
                Maximum number of new cards to introduce each day
              </p>
              {errors.newCardsPerDay && (
                <p className="text-red-500 text-sm mt-1">{errors.newCardsPerDay}</p>
              )}
            </div>

            {/* Cards Per Batch */}
            <div>
              <label htmlFor="cardsPerBatch" className="block text-sm font-medium theme-text mb-2">
                Cards Per Batch
              </label>
              <input
                id="cardsPerBatch"
                type="number"
                min={VALIDATION_LIMITS.MIN_CARDS_PER_BATCH}
                max={VALIDATION_LIMITS.MAX_CARDS_PER_BATCH}
                value={formData.cardsPerBatch}
                onChange={(e) => handleInputChange('cardsPerBatch', parseInt(e.target.value) || 0)}
                disabled={isSubmitting}
                className="input-themed w-full"
                style={{
                  backgroundColor: 'var(--background)',
                  borderColor: errors.cardsPerBatch ? '#ef4444' : 'var(--border-color)',
                  color: 'var(--text-color)'
                }}
              />
              <p className="text-sm theme-text-secondary mt-1">
                Number of new cards to present together in each batch
              </p>
              {errors.cardsPerBatch && (
                <p className="text-red-500 text-sm mt-1">{errors.cardsPerBatch}</p>
              )}
            </div>

            {/* Graduation Threshold */}
            <div>
              <label htmlFor="graduationThreshold" className="block text-sm font-medium theme-text mb-2">
                Passes Until Graduating
              </label>
              <input
                id="graduationThreshold"
                type="number"
                min={VALIDATION_LIMITS.MIN_GRADUATION_THRESHOLD}
                max={VALIDATION_LIMITS.MAX_GRADUATION_THRESHOLD}
                value={formData.graduationThreshold}
                onChange={(e) => handleInputChange('graduationThreshold', parseInt(e.target.value) || 0)}
                disabled={isSubmitting}
                className="input-themed w-full"
                style={{
                  backgroundColor: 'var(--background)',
                  borderColor: errors.graduationThreshold ? '#ef4444' : 'var(--border-color)',
                  color: 'var(--text-color)'
                }}
              />
              <p className="text-sm theme-text-secondary mt-1">
                Number of correct answers needed for a new card to graduate to review status
              </p>
              {errors.graduationThreshold && (
                <p className="text-red-500 text-sm mt-1">{errors.graduationThreshold}</p>
              )}
            </div>
          </div>

          {/* General Error */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{
                borderColor: 'var(--border-color)',
                color: 'var(--secondary-text-color)',
                backgroundColor: 'var(--background)'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          {/* Delete Deck Button */}
          {user && !isSubmitting && (
            <div className="pt-6 flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('Are you sure you want to delete this deck? This cannot be undone.')) {
                    try {
                      setIsSubmitting(true);
                      await DeckService.deleteDeck(user.uid, deck.id);
                      setIsSubmitting(false);
                      onClose();
                      if (typeof onDeckDeleted === 'function') onDeckDeleted();
                    } catch (error) {
                      setIsSubmitting(false);
                      setErrors({ general: 'Failed to delete deck. Please try again.' });
                    }
                  }
                }}
                className="px-4 py-2 rounded-md bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                style={{ minWidth: 120 }}
              >
                Delete Deck
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}