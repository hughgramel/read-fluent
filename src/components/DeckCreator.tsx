'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { DeckService } from '@/services/deckService';
import { Deck, CreateDeckInput, CardServiceError } from '@/types/spaced-repetition';
import { VALIDATION_LIMITS, DEFAULT_DECK_SETTINGS } from '@/constants/spaced-repetition';
import { useAuth } from '@/contexts/AuthContext';

interface DeckCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onDeckCreated: (deck: Deck) => void;
}

interface FormData {
  name: string;
  description: string;
}

interface FormErrors {
  name?: string;
  description?: string;
  general?: string;
}

export function DeckCreator({ isOpen, onClose, onDeckCreated }: DeckCreatorProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset form when popup opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        description: ''
      });
      setErrors({});
    }
  }, [isOpen]);

  // Focus name input when popup opens
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setErrors({ general: 'You must be logged in to create decks' });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Prepare deck data
      const deckData: CreateDeckInput = {
        userId: user.uid,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        settings: DEFAULT_DECK_SETTINGS,
        dailyStats: {
          date: new Date().toISOString().split('T')[0],
          newCardsStudied: 0,
          reviewsCompleted: 0
        }
      };

      // Create the deck
      const deckId = await DeckService.createDeck(deckData);

      // Get the created deck to pass to callback
      const createdDeck = await DeckService.getDeck(user.uid, deckId);

      if (createdDeck) {
        onDeckCreated(createdDeck);
      }

      // Close popup and reset form
      handleClose();

    } catch (error) {
      console.error('Failed to create deck:', error);

      if (error instanceof CardServiceError) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'Failed to create deck. Please try again.' });
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

  const handleInputChange = (field: keyof FormData, value: string) => {
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
        className="card-themed w-full max-w-md max-h-[90vh] overflow-y-auto mx-auto"
        style={{
          backgroundColor: 'var(--background)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-color)',
          transform: 'translateZ(0)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold theme-text">Create New Deck</h2>
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
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <p className="text-sm theme-text-secondary mt-1">
              Optional description to help you remember what this deck is for
            </p>
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description}</p>
            )}
          </div>

          {/* Default Settings Info */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--card-background, #f8f9fa)', border: '1px solid var(--border-color)' }}>
            <h4 className="text-sm font-medium theme-text mb-2">Default Settings</h4>
            <div className="text-sm theme-text-secondary space-y-1">
              <div>• New cards per day: {DEFAULT_DECK_SETTINGS.newCardsPerDay}</div>
              <div>• Cards per batch: {DEFAULT_DECK_SETTINGS.cardsPerBatch}</div>
              <div>• Passes until graduating: {DEFAULT_DECK_SETTINGS.graduationThreshold}</div>
            </div>
            <p className="text-xs theme-text-secondary mt-2">
              You can change these settings after creating the deck
            </p>
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
              {isSubmitting ? 'Creating...' : 'Create Deck'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}