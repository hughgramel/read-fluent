'use client';

import React, { useState } from 'react';
import { FaRegClone, FaCog } from 'react-icons/fa';
import { Deck } from '@/types/spaced-repetition';
import { DeckSettings } from './DeckSettings';

interface DeckCardProps {
  deck: Deck & { 
    dueCount?: number;
    newCount?: number;
    dailyNewCardsDone?: number;
  };
  onReview: (deckId: string) => void;
  onDeckUpdated: (deck: Deck) => void;
  onDeckDeleted?: (deckId: string) => void;
}

export function DeckCard({ deck, onReview, onDeckUpdated, onDeckDeleted }: DeckCardProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleReviewClick = () => {
    onReview(deck.id);
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  const handleSettingsUpdated = (updatedDeck: Deck) => {
    onDeckUpdated(updatedDeck);
    setIsSettingsOpen(false);
  };

  // Called when deck is deleted from DeckSettings
  const handleDeckDeleted = () => {
    setIsSettingsOpen(false);
    if (onDeckDeleted) onDeckDeleted(deck.id);
  };

  return (
    <>
      <div
        className="flex items-center gap-6 rounded-2xl shadow-lg p-6 hover:scale-[1.025] transition-transform cursor-pointer card-themed-accent"
        style={{
          background: 'var(--card-background, #fff)',
          boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.08)',
          border: '1.5px solid var(--primary-color)',
          minHeight: 90,
        }}
        onClick={handleReviewClick}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 60,
            height: 60,
            background: 'var(--primary-color)',
            color: 'var(--button-text-color, white)',
            fontSize: 32,
            boxShadow: '0 2px 8px 0 rgba(31, 38, 135, 0.10)',
          }}
        >
          <FaRegClone />
        </div>
        
        <div className="flex-1 flex flex-col justify-center">
          <div className="font-bold text-xl theme-text mb-1" style={{ letterSpacing: 0.5 }}>
            {deck.name}
          </div>
          <div className="theme-text-secondary text-base">
            {deck.dueCount && deck.dueCount > 0 ? `${deck.dueCount} cards to review` : 'No cards due'}
            <span className="ml-2">• {deck.totalCards} total cards</span>
          </div>
          {/* Enhanced card counts display */}
          <div className="flex flex-col gap-1 text-sm mt-1">
            {deck.newCount !== undefined && (
              <div className="text-emerald-600 font-medium">
                {deck.newCount} new cards remaining
              </div>
            )}
          </div>
          {deck.description && (
            <div className="theme-text-secondary text-sm mt-1 opacity-75">
              {deck.description}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSettingsClick}
            className="p-2 rounded-full hover:scale-105 transition-transform"
            style={{
              background: 'var(--secondary-color, #67b9e7)',
              color: 'var(--button-text-color, white)',
              border: 'none',
              outline: 'none',
            }}
            title="Deck Settings"
          >
            <FaCog size={16} />
          </button>
          
          <button
            className="rounded-full px-6 py-2 font-semibold text-base shadow-md hover:scale-105 transition-transform btn-primary"
            style={{
              background: 'var(--primary-color)',
              color: 'var(--button-text-color, white)',
              border: 'none',
              outline: 'none',
            }}
          >
            Review
          </button>
        </div>
      </div>

      {/* Deck Settings Modal */}
      <DeckSettings
        deck={deck}
        isOpen={isSettingsOpen}
        onClose={handleSettingsClose}
        onSettingsUpdated={handleSettingsUpdated}
        onDeckDeleted={handleDeckDeleted}
      />
    </>
  );
}