'use client';

import React, { useState } from 'react';
import { FaRegClone, FaCog } from 'react-icons/fa';
import { Deck } from '@/types/spaced-repetition';
import { DeckSettings } from './DeckSettings';
import { MouseEventHandler } from 'react';

export interface DeckCardProps {
  deck: any;
  onReview?: React.MouseEventHandler<HTMLDivElement>;
  onDeckUpdated?: (deck: any) => void;
  onDeckDeleted?: () => void;
  refreshTrigger?: number;
  reviewsLeft?: number;
  newCardsLeftToday?: number;
  totalCards?: number;
  minimalistMobile?: boolean;
}

export function DeckCard({ deck, onReview, onDeckUpdated, onDeckDeleted, minimalistMobile = false, reviewsLeft = 0, newCardsLeftToday = 0 }: DeckCardProps) {
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
    if (onDeckUpdated) onDeckUpdated(updatedDeck);
    setIsSettingsOpen(false);
  };

  // Called when deck is deleted from DeckSettings
  const handleDeckDeleted = () => {
    setIsSettingsOpen(false);
    if (onDeckDeleted) {
      onDeckDeleted();
    }
  };

  if (minimalistMobile) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    return (
      <>
        <div
          className="flex items-center gap-4 rounded-2xl shadow-md p-4 mb-2"
          style={{
            background: 'var(--card-background, #fff)',
            border: 'none',
            color: 'var(--primary-color)',
            minHeight: 80,
            boxShadow: '0 4px 24px 0 rgba(31,38,135,0.18)',
          }}
          onClick={onReview}
        >
          {/* Emoji circle */}
          <div
            className="flex items-center justify-center rounded-full mr-2"
            style={{
              width: 56,
              height: 56,
              background: 'var(--secondary-color, #f8e1e7)',
              fontSize: 32,
              color: '#b91c1c',
              flexShrink: 0,
            }}
          >
            {deck.emoji || '📚'}
          </div>
          {/* Deck info */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-lg theme-text truncate flex-1" style={{ fontWeight: 700 }}>{deck.name}</span>
              {/* Deck settings button */}
              <button
                onClick={e => { e.stopPropagation(); setIsSettingsOpen(true); }}
                className="ml-1 p-1 rounded-full hover:text-[var(--primary-color)] transition-colors"
                style={{ background: 'none', color: 'var(--primary-color)', border: 'none' }}
                title="Deck Settings"
                tabIndex={-1}
              >
                <FaCog size={18} />
              </button>
            </div>
            <div className="flex gap-2 mt-1">
              <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: '#2563eb', color: 'white' }}>{reviewsLeft} reviews</span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: '#10b981', color: 'white' }}>{newCardsLeftToday} new</span>
            </div>
          </div>
        </div>
        {/* Deck Settings Modal */}
        <DeckSettings
          deck={deck}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSettingsUpdated={onDeckUpdated ? onDeckUpdated : (deck => {})}
          onDeckDeleted={onDeckDeleted ? (() => onDeckDeleted()) : undefined}
          showEmojiField={true}
        />
      </>
    );
  }
  return (
    <>
      <div
        className="flex items-center gap-6 rounded-2xl shadow-lg p-6 hover:scale-[1.01] transition-transform cursor-pointer card-themed-accent"
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
            {deck.newCount !== undefined && deck.settings && deck.dailyNewCardsDone !== undefined && (
              <div className="text-emerald-600 font-medium">
                {Math.max(0, Math.min(deck.newCount, deck.settings.newCardsPerDay - deck.dailyNewCardsDone))} new cards left today
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
            className="p-2 rounded-full hover:scale-100 transition-transform"
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
            className="rounded-full px-6 py-2 font-semibold text-base shadow-md hover:scale-100 transition-transform btn-primary"
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