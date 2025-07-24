'use client';

import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { DeckService } from '@/services/deckService';
import { CardService } from '@/services/cardService';
import { Deck } from '@/types/spaced-repetition';
import { DeckCard } from './DeckCard';
import { DeckCreator } from './DeckCreator';
import { useAuth } from '@/contexts/AuthContext';

export interface DeckListProps {
  onDeckReview: (deckId: string) => void;
  refreshTrigger?: number;
  minimalistMobile?: boolean;
}

export function DeckList({ onDeckReview, refreshTrigger, minimalistMobile = false }: DeckListProps) {
  const { user } = useAuth();
  const [decks, setDecks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [refreshTriggerState, setRefreshTrigger] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 640);
  }, []);

  // Remove deck from state when deleted
  const handleDeckDeleted = (deckId: string) => {
    setDecks(prev => prev.filter(deck => deck.id !== deckId));
  };

  // Load decks when component mounts or refresh trigger changes
  useEffect(() => {
    if (user) {
      loadDecks();
    }
  }, [user, refreshTriggerState]);

  const loadDecks = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      // Load all cards for user into cache first
      await CardService.loadAllCardsForUser(user.uid);
      // Get all user decks
      const userDecks = await DeckService.getUserDecks(user.uid);
      // Get due card counts and new card counts for each deck from cache
      const decksWithStats = await Promise.all(
        userDecks.map(async (deck) => {
          try {
            const dueCards = CardService.getDueCardsFromCache(user.uid, deck.id);
            const dailyProgress = await DeckService.getDailyProgress(user.uid, deck.id);
            const newCards = CardService.getNewCardsFromCache(user.uid, deck.id, 1000);
            const allCards = CardService.getCardsByDeckFromCache(user.uid, deck.id);
            return {
              ...deck,
              dueCount: dueCards.length,
              newCount: newCards.length,
              dailyNewCardsDone: dailyProgress.newCardsStudied,
              totalCards: allCards.length,
              settings: deck.settings
            };
          } catch (error) {
            console.error(`Failed to get stats for deck ${deck.id}:`, error);
            return {
              ...deck,
              dueCount: 0,
              newCount: 0,
              dailyNewCardsDone: 0,
              totalCards: 0,
              settings: deck.settings
            };
          }
        })
      );
      setDecks(decksWithStats);
    } catch (error) {
      console.error('Failed to load decks:', error);
      setError('Failed to load decks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeckCreated = (newDeck: Deck) => {
    // Add the new deck to the list with 0 due cards
    const deckWithStats: any = {
      ...newDeck,
      dueCount: 0,
      newCount: 0,
      dailyNewCardsDone: 0,
      totalCards: 0,
      settings: newDeck.settings
    };
    
    setDecks(prev => [deckWithStats, ...prev]);
    setIsCreatorOpen(false);
    setRefreshTrigger(prev => prev + 1); // Trigger refresh after deck creation
  };

  const handleDeckUpdated = (updatedDeck: Deck) => {
    setDecks(prev => 
      prev.map(deck => 
        deck.id === updatedDeck.id 
          ? { 
              ...updatedDeck, 
              dueCount: deck.dueCount,
              newCount: deck.newCount,
              dailyNewCardsDone: deck.dailyNewCardsDone,
              totalCards: deck.totalCards,
              settings: deck.settings
            }
          : deck
      )
    );
  };

  const handleCreateDeckClick = () => {
    setIsCreatorOpen(true);
  };

  const handleCreatorClose = () => {
    setIsCreatorOpen(false);
  };

  if (isLoading) {
    return (
      <div className="w-full flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-xl sm:text-2xl font-bold theme-text">Your Decks</h2>
        </div>
        
        {/* Loading skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 sm:gap-6 rounded-2xl p-4 sm:p-6 animate-pulse"
              style={{
                background: 'var(--card-background, #fff)',
                boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.08)',
                border: '1.5px solid var(--border-color)',
                minHeight: 80,
              }}
            >
              <div
                className="rounded-full flex-shrink-0"
                style={{
                  width: 48,
                  height: 48,
                  background: 'var(--border-color)',
                }}
              />
              <div className="flex-1 space-y-2">
                <div
                  className="h-5 sm:h-6 rounded"
                  style={{
                    background: 'var(--border-color)',
                    width: '60%'
                  }}
                />
                <div
                  className="h-3 sm:h-4 rounded"
                  style={{
                    background: 'var(--border-color)',
                    width: '80%'
                  }}
                />
              </div>
              <div
                className="h-6 sm:h-8 rounded-full flex-shrink-0"
                style={{
                  background: 'var(--border-color)',
                  width: 60
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-xl sm:text-2xl font-bold theme-text">Your Decks</h2>
        </div>
        
        <div className="p-4 sm:p-6 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-center text-sm sm:text-base">{error}</p>
          <button
            onClick={loadDecks}
            className="mt-4 mx-auto block px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors w-full sm:w-auto"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full flex flex-col gap-6">
        {/* Header with Create Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-xl sm:text-2xl font-bold theme-text">Your Decks</h2>
          <button
            onClick={handleCreateDeckClick}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium hover:scale-105 transition-transform btn-primary w-full sm:w-auto"
            style={{
              background: 'var(--secondary-color, #67b9e7)',
              color: 'var(--button-text-color, white)',
              border: 'none',
              outline: 'none',
            }}
          >
            <Plus size={20} />
            <span>Create Deck</span>
          </button>
        </div>

        {/* Decks List */}
        {decks.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div
              className="rounded-2xl p-6 sm:p-8 mx-auto max-w-md"
              style={{
                background: 'var(--card-background, #fff)',
                boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.08)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div className="theme-text-secondary text-base sm:text-lg mb-4">
                No decks yet
              </div>
              <p className="theme-text-secondary text-sm mb-6">
                Create your first deck to start studying with spaced repetition
              </p>
              <button
                onClick={handleCreateDeckClick}
                className="btn-primary px-6 py-3 font-medium w-full sm:w-auto"
              >
                Create Your First Deck
              </button>
            </div>
          </div>
        ) : (
          <div className={minimalistMobile && isMobile ? "flex flex-col gap-3" : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"}>
            {decks.map(deck => (
              <DeckCard 
                key={deck.id} 
                deck={deck} 
                onReview={() => onDeckReview(deck.id)}
                reviewsLeft={deck.dueCount ?? 0}
                newCardsLeftToday={Math.max(0, Math.min(deck.newCount, deck.settings.newCardsPerDay - (deck.dailyNewCardsDone || 0)))}
                totalCards={deck.totalCards || (deck.cards ? deck.cards.length : 0)}
                minimalistMobile={minimalistMobile && isMobile}
              />
            ))}
          </div>
        )}
      </div>

      {/* Deck Creator Modal */}
      <DeckCreator
        isOpen={isCreatorOpen}
        onClose={handleCreatorClose}
        onDeckCreated={handleDeckCreated}
      />
    </>
  );
}