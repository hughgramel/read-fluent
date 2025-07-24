'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { CardService } from '@/services/cardService';
import { DeckService } from '@/services/deckService';
import {
  CreateCardInput,
  CreateSentenceCardInput,
  Card,
  SentenceCard,
  Deck,
  CardServiceError
} from '@/types/spaced-repetition';
import {
  CARD_TYPES,
  MIN_STAGE,
  VALIDATION_LIMITS
} from '@/constants/spaced-repetition';
import { useAuth } from '@/contexts/AuthContext';

interface CardCreatorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onCardCreated?: (card: Card | SentenceCard) => void;
  deckId?: string; // Optional pre-selected deck
}

interface FormData {
  front: string;
  back: string;
  translation: string;
  type: 'basic' | 'sentence';
  deckId: string;
}

interface FormErrors {
  front?: string;
  back?: string;
  translation?: string;
  deckId?: string;
  general?: string;
}

export function CardCreatorPopup({
  isOpen,
  onClose,
  onCardCreated,
  deckId: preselectedDeckId
}: CardCreatorPopupProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    front: '',
    back: '',
    translation: '',
    type: 'basic',
    deckId: preselectedDeckId || ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoadingDecks, setIsLoadingDecks] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'theme'>('single');
  const [themeBulkText, setThemeBulkText] = useState('');
  const [themeBulkError, setThemeBulkError] = useState<string | null>(null);

  // Refs for focus management
  const frontInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Load user's decks when popup opens
  useEffect(() => {
    if (isOpen && user) {
      loadUserDecks();
    }
  }, [isOpen, user]);

  // Focus front input when popup opens
  useEffect(() => {
    if (isOpen && frontInputRef.current) {
      setTimeout(() => {
        frontInputRef.current?.focus();
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

  // Reset form when popup opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        front: '',
        back: '',
        translation: '',
        type: 'basic',
        deckId: preselectedDeckId || ''
      });
      setErrors({});
    }
  }, [isOpen, preselectedDeckId]);

  const loadUserDecks = async () => {
    if (!user) return;

    setIsLoadingDecks(true);
    try {
      const userDecks = await DeckService.getUserDecks(user.uid);
      setDecks(userDecks);

      // If no preselected deck and user has decks, select the first one
      if (!preselectedDeckId && userDecks.length > 0) {
        setFormData(prev => ({ ...prev, deckId: userDecks[0].id }));
      }
    } catch (error) {
      console.error('Failed to load decks:', error);
      setErrors({ general: 'Failed to load decks. Please try again.' });
    } finally {
      setIsLoadingDecks(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate front content
    if (!formData.front.trim()) {
      newErrors.front = 'Front content is required';
    } else if (formData.front.length > VALIDATION_LIMITS.MAX_CARD_CONTENT_LENGTH) {
      newErrors.front = `Front content must be less than ${VALIDATION_LIMITS.MAX_CARD_CONTENT_LENGTH} characters`;
    }

    // Validate back content
    if (!formData.back.trim()) {
      newErrors.back = 'Back content is required';
    } else if (formData.back.length > VALIDATION_LIMITS.MAX_CARD_CONTENT_LENGTH) {
      newErrors.back = `Back content must be less than ${VALIDATION_LIMITS.MAX_CARD_CONTENT_LENGTH} characters`;
    }

    // Validate translation for sentence cards
    if (formData.type === 'sentence') {
      if (!formData.translation.trim()) {
        newErrors.translation = 'Translation is required for sentence cards';
      } else if (formData.translation.length > VALIDATION_LIMITS.MAX_CARD_CONTENT_LENGTH) {
        newErrors.translation = `Translation must be less than ${VALIDATION_LIMITS.MAX_CARD_CONTENT_LENGTH} characters`;
      }
    }

    // Validate deck selection
    if (!formData.deckId) {
      newErrors.deckId = 'Please select a deck';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setErrors({ general: 'You must be logged in to create cards' });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Prepare card data based on type
      const baseCardData = {
        userId: user.uid,
        deckId: formData.deckId,
        front: formData.front.trim(),
        back: formData.back.trim(),
        type: formData.type,
        stage: MIN_STAGE + 1, // Start at -6 (new cards start one stage above minimum)
        nextReview: new Date(), // Will be set properly by the service
        relearning: false,
        isNew: true,
        correctCount: 0
      };

      let cardData: CreateCardInput | CreateSentenceCardInput;

      if (formData.type === CARD_TYPES.SENTENCE) {
        cardData = {
          ...baseCardData,
          type: CARD_TYPES.SENTENCE,
          translation: formData.translation.trim()
        } as CreateSentenceCardInput;
      } else {
        cardData = {
          ...baseCardData,
          type: CARD_TYPES.BASIC
        } as CreateCardInput;
      }

      // Create the card
      const cardId = await CardService.createCard(cardData);

      // Get the created card to pass to callback
      const createdCard = await CardService.getCard(user.uid, cardId);

      if (createdCard && onCardCreated) {
        onCardCreated(createdCard);
      }

      // Close popup and reset form
      handleClose();

    } catch (error) {
      console.error('Failed to create card:', error);

      if (error instanceof CardServiceError) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'Failed to create card. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk add handler
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setThemeBulkError(null);
    if (!user) {
      setThemeBulkError('You must be logged in to create cards');
      return;
    }
    if (!formData.deckId) {
      setThemeBulkError('Please select a deck');
      return;
    }
    const lines = themeBulkText.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) {
      setThemeBulkError('Please enter at least one card.');
      return;
    }
    const cards: { front: string; back: string }[] = [];
    for (const line of lines) {
      const [front, back] = line.split(',').map(s => s.trim());
      if (!front || !back) {
        setThemeBulkError('Each line must have a front and back, separated by a comma.');
        return;
      }
      cards.push({ front, back });
    }
    setIsSubmitting(true);
    try {
      for (const card of cards) {
        const cardData: CreateCardInput = {
          userId: user.uid,
          deckId: formData.deckId,
          front: card.front,
          back: card.back,
          type: 'basic',
          stage: MIN_STAGE + 1,
          nextReview: new Date(),
          relearning: false,
          isNew: true,
          correctCount: 0
        };
        const cardId = await CardService.createCard(cardData);
        if (onCardCreated) {
          const createdCard = await CardService.getCard(user.uid, cardId);
          if (createdCard) onCardCreated(createdCard);
        }
      }
      setThemeBulkText('');
      handleClose();
    } catch (error) {
      setThemeBulkError('Failed to create cards. Please try again.');
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

  const handleTypeChange = (type: 'basic' | 'sentence') => {
    setFormData(prev => ({ ...prev, type }));
    // Clear translation error when switching away from sentence type
    if (type === 'basic' && errors.translation) {
      setErrors(prev => ({ ...prev, translation: undefined }));
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
          <h2 className="text-xl font-semibold theme-text">Create New Card</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            style={{ color: 'var(--secondary-text-color)' }}
          >
            <X size={20} />
          </button>
        </div>
        {/* Tab Switcher */}
        <div className="flex gap-2 mb-4">
          <button
            className={`flex-1 py-2 rounded-t-lg font-semibold ${activeTab === 'single' ? 'bg-[var(--primary-color)] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}
            onClick={() => setActiveTab('single')}
            disabled={isSubmitting}
          >
            Single Card
          </button>
          <button
            className={`flex-1 py-2 rounded-t-lg font-semibold ${activeTab === 'theme' ? 'bg-[var(--primary-color)] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}
            onClick={() => setActiveTab('theme')}
            disabled={isSubmitting}
          >
            On Theme (Bulk)
          </button>
        </div>
        {/* Bulk Add Section */}
        {activeTab === 'theme' && (
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            <div>
              <label htmlFor="deck" className="block text-sm font-medium theme-text mb-2">
                Deck
              </label>
              <select
                id="deck"
                value={formData.deckId}
                onChange={(e) => handleInputChange('deckId', e.target.value)}
                disabled={isSubmitting || isLoadingDecks}
                className="select-themed w-full"
                style={{
                  backgroundColor: 'var(--background)',
                  borderColor: errors.deckId ? '#ef4444' : 'var(--border-color)',
                  color: 'var(--text-color)'
                }}
              >
                <option value="">
                  {isLoadingDecks ? 'Loading decks...' : 'Select a deck'}
                </option>
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </select>
              {errors.deckId && (
                <p className="text-red-500 text-sm mt-1">{errors.deckId}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium theme-text mb-2">
                Bulk Cards (front,back per line)
              </label>
              <textarea
                value={themeBulkText}
                onChange={e => setThemeBulkText(e.target.value)}
                rows={8}
                className="input-themed w-full resize-none"
                placeholder="Front 1,Back 1\nFront 2,Back 2\n..."
                style={{
                  backgroundColor: 'var(--background)',
                  borderColor: themeBulkError ? '#ef4444' : 'var(--border-color)',
                  color: 'var(--text-color)'
                }}
                disabled={isSubmitting}
              />
              {themeBulkError && (
                <p className="text-red-500 text-sm mt-1">{themeBulkError}</p>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                disabled={isSubmitting || isLoadingDecks}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Cards'}
              </button>
            </div>
          </form>
        )}
        {/* Single Card Form */}
        {activeTab === 'single' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Card Type Selection */}
          <div>
            <label className="block text-sm font-medium theme-text mb-2">
              Card Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="cardType"
                  value="basic"
                  checked={formData.type === 'basic'}
                  onChange={() => handleTypeChange('basic')}
                  disabled={isSubmitting}
                  className="mr-2"
                />
                <span className="theme-text">Basic Card</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="cardType"
                  value="sentence"
                  checked={formData.type === 'sentence'}
                  onChange={() => handleTypeChange('sentence')}
                  disabled={isSubmitting}
                  className="mr-2"
                />
                <span className="theme-text">Sentence Card</span>
              </label>
            </div>
          </div>

          {/* Deck Selection */}
          <div>
            <label htmlFor="deck" className="block text-sm font-medium theme-text mb-2">
              Deck
            </label>
            <select
              id="deck"
              value={formData.deckId}
              onChange={(e) => handleInputChange('deckId', e.target.value)}
              disabled={isSubmitting || isLoadingDecks}
              className="select-themed w-full"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: errors.deckId ? '#ef4444' : 'var(--border-color)',
                color: 'var(--text-color)'
              }}
            >
              <option value="">
                {isLoadingDecks ? 'Loading decks...' : 'Select a deck'}
              </option>
              {decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                </option>
              ))}
            </select>
            {errors.deckId && (
              <p className="text-red-500 text-sm mt-1">{errors.deckId}</p>
            )}
          </div>

          {/* Front Content */}
          <div>
            <label htmlFor="front" className="block text-sm font-medium theme-text mb-2">
              Front
            </label>
            <input
              ref={frontInputRef}
              id="front"
              type="text"
              value={formData.front}
              onChange={(e) => handleInputChange('front', e.target.value)}
              disabled={isSubmitting}
              placeholder="Enter the front of the card..."
              className="input-themed w-full"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: errors.front ? '#ef4444' : 'var(--border-color)',
                color: 'var(--text-color)'
              }}
            />
            {errors.front && (
              <p className="text-red-500 text-sm mt-1">{errors.front}</p>
            )}
          </div>

          {/* Translation (only for sentence cards) */}
          {formData.type === 'sentence' && (
            <div>
              <label htmlFor="translation" className="block text-sm font-medium theme-text mb-2">
                Translation
              </label>
              <input
                id="translation"
                type="text"
                value={formData.translation}
                onChange={(e) => handleInputChange('translation', e.target.value)}
                disabled={isSubmitting}
                placeholder="Enter the translation..."
                className="input-themed w-full"
                style={{
                  backgroundColor: 'var(--background)',
                  borderColor: errors.translation ? '#ef4444' : 'var(--border-color)',
                  color: 'var(--text-color)'
                }}
              />
              {errors.translation && (
                <p className="text-red-500 text-sm mt-1">{errors.translation}</p>
              )}
            </div>
          )}

          {/* Back Content */}
          <div>
            <label htmlFor="back" className="block text-sm font-medium theme-text mb-2">
              Back
            </label>
            <textarea
              id="back"
              value={formData.back}
              onChange={(e) => handleInputChange('back', e.target.value)}
              disabled={isSubmitting}
              placeholder="Enter the back of the card..."
              rows={3}
              className="input-themed w-full resize-none"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: errors.back ? '#ef4444' : 'var(--border-color)',
                color: 'var(--text-color)'
              }}
            />
            {errors.back && (
              <p className="text-red-500 text-sm mt-1">{errors.back}</p>
            )}
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
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              disabled={isSubmitting || isLoadingDecks}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Card'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}