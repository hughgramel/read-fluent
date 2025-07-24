'use client';

import React, { useState, useEffect } from 'react';
import { Card, SentenceCard, Deck, CardServiceError } from '@/types/spaced-repetition';
import { CardService } from '@/services/cardService';
import { DeckService } from '@/services/deckService';
import { useAuth } from '@/contexts/AuthContext';
import { FaSearch, FaFilter, FaTimes } from 'react-icons/fa';
import { ReviewEngine } from '@/services/reviewEngine';

interface CardBrowserProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CardWithDeck extends Card {
  deckName: string;
}

type FilterType = 'all' | 'new' | 'learning' | 'review';
type SortType = 'created' | 'deck' | 'stage' | 'nextReview';

export function CardBrowser({ isOpen, onClose }: CardBrowserProps) {
  const { user } = useAuth();
  const [cards, setCards] = useState<CardWithDeck[]>([]);
  const [filteredCards, setFilteredCards] = useState<CardWithDeck[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeck, setSelectedDeck] = useState<string>('all');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('created');

  // Load cards and decks
  useEffect(() => {
    if (isOpen && user) {
      loadData();
    }
  }, [isOpen, user]);

  // Apply filters when data or filters change
  useEffect(() => {
    applyFilters();
  }, [cards, searchTerm, selectedDeck, filterType, sortType]);

  const loadData = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load decks first
      const userDecks = await DeckService.getUserDecks(user.uid);
      setDecks(userDecks);

      // Load all cards for all decks
      const allCards: CardWithDeck[] = [];
      
      for (const deck of userDecks) {
        try {
          const deckCards = await CardService.getCardsByDeck(user.uid, deck.id);
          const cardsWithDeck = deckCards.map(card => ({
            ...card,
            deckName: deck.name
          }));
          allCards.push(...cardsWithDeck);
        } catch (error) {
          console.error(`Failed to load cards for deck ${deck.id}:`, error);
        }
      }

      setCards(allCards);
    } catch (error) {
      console.error('Failed to load card browser data:', error);
      
      if (error instanceof CardServiceError) {
        setError(error.message);
      } else {
        setError('Failed to load cards. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...cards];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(card => 
        card.front.toLowerCase().includes(term) ||
        card.back.toLowerCase().includes(term) ||
        (card.type === 'sentence' && typeof (card as any).translation === 'string' && (card as any).translation.toLowerCase().includes(term)) ||
        card.deckName.toLowerCase().includes(term)
      );
    }

    // Apply deck filter
    if (selectedDeck !== 'all') {
      filtered = filtered.filter(card => card.deckId === selectedDeck);
    }

    // Apply type filter
    switch (filterType) {
      case 'new':
        filtered = filtered.filter(card => card.isNew);
        break;
      case 'learning':
        filtered = filtered.filter(card => !card.isNew && card.stage < -1);
        break;
      case 'review':
        filtered = filtered.filter(card => !card.isNew && card.stage === -1);
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortType) {
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'deck':
          return a.deckName.localeCompare(b.deckName);
        case 'stage':
          return b.stage - a.stage;
        case 'nextReview':
          return new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime();
        default:
          return 0;
      }
    });

    setFilteredCards(filtered);
  };

  const getCardStatusBadge = (card: Card) => {
    if (card.isNew) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          New ({card.correctCount})
        </span>
      );
    } else if (card.stage < -1) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          Learning (Stage {card.stage})
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Review (Stage {card.stage})
        </span>
      );
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
      <div
        className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl"
        style={{
          backgroundColor: 'var(--background)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-color)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h2 className="text-2xl font-bold theme-text">Card Browser</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            style={{ color: 'var(--secondary-text-color)' }}
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b space-y-4" style={{ borderColor: 'var(--border-color)' }}>
          {/* Search */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 theme-text-secondary" size={16} />
            <input
              type="text"
              placeholder="Search cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border input-themed"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-color)'
              }}
            />
          </div>

          {/* Filter controls */}
          <div className="flex flex-wrap gap-4">
            {/* Deck filter */}
            <select
              value={selectedDeck}
              onChange={(e) => setSelectedDeck(e.target.value)}
              className="px-3 py-2 rounded-lg border select-themed"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-color)'
              }}
            >
              <option value="all">All Decks</option>
              {decks.map(deck => (
                <option key={deck.id} value={deck.id}>{deck.name}</option>
              ))}
            </select>

            {/* Type filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="px-3 py-2 rounded-lg border select-themed"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-color)'
              }}
            >
              <option value="all">All Types</option>
              <option value="new">New Cards</option>
              <option value="learning">Learning</option>
              <option value="review">Review</option>
            </select>

            {/* Sort */}
            <select
              value={sortType}
              onChange={(e) => setSortType(e.target.value as SortType)}
              className="px-3 py-2 rounded-lg border select-themed"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-color)'
              }}
            >
              <option value="created">Created Date</option>
              <option value="deck">Deck Name</option>
              <option value="stage">Stage</option>
              <option value="nextReview">Next Review</option>
            </select>

            {/* Results count */}
            <div className="flex items-center px-3 py-2 theme-text-secondary">
              {filteredCards.length} of {cards.length} cards
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--primary-color)' }}></div>
              <span className="ml-3 theme-text">Loading cards...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-red-500 text-4xl mb-4">⚠️</div>
                <p className="theme-text text-lg font-medium mb-2">Error Loading Cards</p>
                <p className="theme-text-secondary mb-4">{error}</p>
                <button
                  onClick={loadData}
                  className="btn-primary px-4 py-2"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-6xl mb-4">📚</div>
                <p className="theme-text text-lg font-medium mb-2">No Cards Found</p>
                <p className="theme-text-secondary">
                  {cards.length === 0 
                    ? "You haven't created any cards yet."
                    : "No cards match your current filters."
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-4">
                {filteredCards.map((card) => (
                  <div
                    key={card.id}
                    className="p-4 rounded-lg border hover:shadow-md transition-shadow card-themed"
                    style={{
                      backgroundColor: 'var(--card-background, #fff)',
                      borderColor: 'var(--border-color)',
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium theme-text-secondary">{card.deckName}</span>
                        {getCardStatusBadge(card)}
                      </div>
                      <div className="text-sm theme-text-secondary">
                        {card.isNew ? 'New Card' : `Next: ${formatDate(card.nextReview)}`}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <div className="text-sm font-medium theme-text-secondary mb-1">Front:</div>
                        <div className="theme-text">{card.front}</div>
                      </div>
                      
                      {card.type === 'sentence' && typeof (card as any).translation === 'string' && (
                        <div>
                          <div className="text-sm font-medium theme-text-secondary mb-1">Translation:</div>
                          <div className="theme-text italic">{(card as any).translation}</div>
                        </div>
                      )}
                      
                      <div>
                        <div className="text-sm font-medium theme-text-secondary mb-1">Back:</div>
                        <div className="theme-text">{card.back}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <div className="text-sm theme-text-secondary">
                        Created: {formatDate(card.createdAt)}
                      </div>
                      <div className="text-sm theme-text-secondary">
                        Reviews: {card.totalReviews}
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                          disabled={!user}
                          onClick={async () => {
                            if (!user) return;
                            if (window.confirm('Delete this card?')) {
                              await CardService.deleteCard(user.uid, card.id);
                              setCards(prev => prev.filter(c => c.id !== card.id));
                            }
                          }}
                        >
                          Delete
                        </button>
                        <button
                          className="px-3 py-1 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                          disabled={!user}
                          onClick={async () => {
                            if (!user) return;
                            // Advance to next stage
                            let newStage = card.stage;
                            if (card.isNew) {
                              // Simulate graduation
                              await CardService.graduateNewCard(user.uid, card.id);
                              newStage = -6;
                            } else {
                              newStage = Math.min(card.stage + 1, -1);
                              await CardService.updateCard(user.uid, card.id, { stage: newStage });
                            }
                            // Calculate next review date
                            const nextReviewDate = await ReviewEngine.calculateNextReviewDate(newStage, card.deckId, user.uid);
                            const now = new Date();
                            const days = Math.round((nextReviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            console.log(`[CardBrowser] Card ${card.id} advanced to stage ${newStage}. Next review in ${days} days on ${nextReviewDate}`);
                            // Update UI
                            setCards(prev => prev.map(c => c.id === card.id ? { ...c, isNew: false, stage: newStage, nextReview: nextReviewDate } : c));
                          }}
                        >
                          Advance to Next Stage
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}