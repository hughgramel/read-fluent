'use client';

import React, { useState, useEffect } from 'react';
import { FaCog, FaPlus } from 'react-icons/fa';
import { CardCreatorPopup } from '@/components/CardCreatorPopup';
import { StudySession } from '@/components/StudySession';
import { SessionComplete } from '@/components/SessionComplete';
import { DeckList } from '@/components/DeckList';
import { GlobalSettings } from '@/components/GlobalSettings';
import { SessionStats, GlobalReviewSettings } from '@/types/spaced-repetition';
import { CardService } from '@/services/cardService';
import { DeckService } from '@/services/deckService';
import { useAuth } from '@/hooks/useAuth';

export default function ReviewPage() {
  const [isCardCreatorOpen, setIsCardCreatorOpen] = useState(false);
  const [isStudySessionActive, setIsStudySessionActive] = useState(false);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [deckRefreshTrigger, setDeckRefreshTrigger] = useState(0);
  const [totalDueCount, setTotalDueCount] = useState(0);
  const [isLoadingDueCount, setIsLoadingDueCount] = useState(true);
  const { user } = useAuth();

  // Load total due count when component mounts or refresh trigger changes
  useEffect(() => {
    if (user) {
      loadTotalDueCount();
    }
  }, [user, deckRefreshTrigger]);

  const loadTotalDueCount = async () => {
    if (!user) return;

    setIsLoadingDueCount(true);
    try {
      // Get all user decks
      const decks = await DeckService.getUserDecks(user.uid);
      
      // Get due card counts for each deck and sum them
      let totalDue = 0;
      for (const deck of decks) {
        try {
          const dueCards = await CardService.getDueCards(user.uid, deck.id);
          totalDue += dueCards.length;
        } catch (error) {
          console.error(`Failed to get due cards for deck ${deck.id}:`, error);
        }
      }
      
      setTotalDueCount(totalDue);
    } catch (error) {
      console.error('Failed to load total due count:', error);
      setTotalDueCount(0);
    } finally {
      setIsLoadingDueCount(false);
    }
  };

  const handleCardCreated = (card: any) => {
    console.log('Card created:', card);
    // Refresh the decks list to update card counts
    setDeckRefreshTrigger(prev => prev + 1);
  };

  const handleStartStudySession = () => {
    if (user) {
      setIsStudySessionActive(true);
    }
  };

  const handleSessionComplete = (stats: SessionStats) => {
    setIsStudySessionActive(false);
    setSessionStats(stats);
    // Refresh the decks list and due count to update after study session
    setDeckRefreshTrigger(prev => prev + 1);
  };

  const handleSessionExit = () => {
    setIsStudySessionActive(false);
  };

  const handleSessionStatsClose = () => {
    setSessionStats(null);
  };

  const handleStartNewSession = () => {
    setSessionStats(null);
    if (user) {
      setIsStudySessionActive(true);
    }
  };

  const handleDeckReview = (deckId: string) => {
    // For now, start a general study session
    // In the future, this could be enhanced to start a deck-specific session
    handleStartStudySession();
  };

  const handleGlobalSettingsUpdated = (settings: GlobalReviewSettings) => {
    console.log('Global settings updated:', settings);
    // Refresh the decks list and due count to reflect any changes in study order
    setDeckRefreshTrigger(prev => prev + 1);
  };

  return (
    <div 
      className="page-container w-full min-h-screen"
      style={{ 
        fontFamily: 'var(--font-family)'
      }}
    >
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:ml-20 lg:pl-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold theme-text">Review</h1>
          
          {/* Settings Button */}
          <button
            onClick={() => setIsGlobalSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg theme-text-secondary hover:theme-text transition-colors self-start sm:self-auto"
            style={{ 
              background: 'rgba(var(--primary-color-rgb), 0.1)',
              border: '1px solid var(--border-color)'
            }}
            title="Global Settings"
          >
            <FaCog size={16} />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>

        {/* Study All Button */}
        <div className="mb-8 sm:mb-12">
          <div 
            className="card-themed-primary rounded-2xl shadow-lg p-6 sm:p-8 text-center"
            style={{ minHeight: 180 }}
          >
            <h2 className="text-xl sm:text-2xl font-semibold theme-text mb-4">
              Ready to Study?
            </h2>
            
            <div className="mb-6">
              {isLoadingDueCount ? (
                <div className="flex items-center justify-center">
                  <div 
                    className="animate-spin rounded-full h-6 w-6 border-b-2 mr-2"
                    style={{ borderColor: 'var(--primary-color)' }}
                  ></div>
                  <span className="theme-text-secondary text-sm sm:text-base">Loading due cards...</span>
                </div>
              ) : (
                <p className="theme-text-secondary text-base sm:text-lg">
                  {totalDueCount > 0 
                    ? `${totalDueCount} card${totalDueCount === 1 ? '' : 's'} due for review`
                    : 'No cards due for review'
                  }
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <button
                onClick={handleStartStudySession}
                disabled={isLoadingDueCount || totalDueCount === 0}
                className="btn-primary px-6 sm:px-8 py-3 text-base sm:text-lg font-semibold rounded-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 w-full sm:w-auto"
              >
                {totalDueCount > 0 ? 'Study All' : 'No Cards Due'}
              </button>
              
              <button
                onClick={() => setIsCardCreatorOpen(true)}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 text-base sm:text-lg font-semibold rounded-xl hover:scale-105 transition-transform w-full sm:w-auto"
                style={{
                  background: 'var(--secondary-color)',
                  color: 'white',
                  border: 'none'
                }}
              >
                <FaPlus size={16} />
                Add Card
              </button>
            </div>
          </div>
        </div>

        {/* Decks List */}
        <DeckList 
          onDeckReview={handleDeckReview}
          refreshTrigger={deckRefreshTrigger}
        />
      </div>

      {/* Card Creator Popup */}
      <CardCreatorPopup
        isOpen={isCardCreatorOpen}
        onClose={() => setIsCardCreatorOpen(false)}
        onCardCreated={handleCardCreated}
      />

      {/* Study Session */}
      {isStudySessionActive && user && (
        <StudySession
          userId={user.uid}
          onComplete={handleSessionComplete}
          onExit={handleSessionExit}
        />
      )}

      {/* Session Complete */}
      {sessionStats && (
        <SessionComplete
          stats={sessionStats}
          onClose={handleSessionStatsClose}
          onStartNewSession={handleStartNewSession}
        />
      )}

      {/* Global Settings */}
      {user && (
        <GlobalSettings
          userId={user.uid}
          isOpen={isGlobalSettingsOpen}
          onClose={() => setIsGlobalSettingsOpen(false)}
          onSettingsUpdated={handleGlobalSettingsUpdated}
        />
      )}
    </div>
  );
} 