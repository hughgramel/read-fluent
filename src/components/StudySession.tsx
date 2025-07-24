'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, SentenceCard, StudyProgress, SessionStats } from '@/types/spaced-repetition';
import { StudySession as StudySessionService } from '@/services/studySession';
import { FaCheck, FaTimes, FaArrowLeft } from 'react-icons/fa';

interface StudySessionProps {
  userId: string;
  onComplete: (stats: SessionStats) => void;
  onExit: () => void;
}

export function StudySession({ userId, onComplete, onExit }: StudySessionProps) {
  const [studySession, setStudySession] = useState<StudySessionService | null>(null);
  const [currentCard, setCurrentCard] = useState<Card | SentenceCard | null>(null);
  const [showBack, setShowBack] = useState(false);
  const [progress, setProgress] = useState<StudyProgress>({
    reviewsRemaining: 0,
    newCardsRemaining: 0,
    currentPhase: 'complete',
    totalProgress: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [graduationMessage, setGraduationMessage] = useState<string | null>(null);
  const [graduationThreshold, setGraduationThreshold] = useState<number>(3);
  const [currentCardProgress, setCurrentCardProgress] = useState<number>(0);

  // Initialize study session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsLoading(true);
        const session = await StudySessionService.create(userId);
        setStudySession(session);
        
        const nextCard = await session.getNextCard();
        setCurrentCard(nextCard);
        
        // Get graduation threshold for the current card and set initial progress
        if (nextCard && nextCard.isNew) {
          const deckSettings = await session.getDeckSettings(nextCard.deckId);
          setGraduationThreshold(deckSettings?.graduationThreshold || 3);
          // Set progress to current session progress for this card
          const sessionProgress = session.getCardSessionProgress(nextCard.id);
          setCurrentCardProgress(sessionProgress);
        }
        
        const currentProgress = session.getStudyProgress();
        setProgress(currentProgress);
        
        if (!nextCard) {
          // Session is complete immediately
          const stats = session.getSessionStats();
          onComplete(stats);
        }
      } catch (err) {
        console.error('Failed to initialize study session:', err);
        setError('Failed to start study session. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, [userId, onComplete]);

  // Handle keyboard shortcuts
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (!currentCard || isLoading) return;

    switch (event.key) {
      case ' ':
      case 'Enter':
        event.preventDefault();
        if (!showBack) {
          setShowBack(true);
        }
        break;
      case 'x':
      case 'X':
        event.preventDefault();
        if (showBack) {
          handleAnswer(false);
        }
        break;
      case 'c':
      case 'C':
        event.preventDefault();
        if (showBack) {
          handleAnswer(true);
        }
        break;
      case 'Escape':
        event.preventDefault();
        onExit();
        break;
    }
  }, [currentCard, showBack, isLoading]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Handle answer processing
  const handleAnswer = async (correct: boolean) => {
    if (!studySession || !currentCard) return;

    try {
      // Store current card info to check if it was graduated
      const wasNew = currentCard.isNew;
      const deckSettings = await studySession.getDeckSettings(currentCard.deckId);
      const threshold = deckSettings?.graduationThreshold || 3;
      
      // Process the answer first
      await studySession.processAnswer(currentCard.id, correct);
      
      // Get the updated session progress for this card
      let newProgress = 0;
      if (wasNew) {
        newProgress = studySession.getCardSessionProgress(currentCard.id);
        setCurrentCardProgress(newProgress);
      }
      
      const willGraduate = wasNew && correct && (newProgress >= threshold);
      
      // If this card will graduate, show a brief success message
      if (willGraduate) {
        setGraduationMessage("Card graduated to review status!");
        // Show graduation message for a moment
        await new Promise(resolve => setTimeout(resolve, 1000));
        setGraduationMessage(null);
      }
      
      // Get next card
      const nextCard = await studySession.getNextCard();
      
      // Update progress
      const currentProgress = studySession.getStudyProgress();
      setProgress(currentProgress);
      
      if (nextCard) {
        // If there's a next card, continue the session
        setCurrentCard(nextCard);
        setShowBack(false);
        
        // Update graduation threshold for new cards and set session progress
        if (nextCard.isNew) {
          const deckSettings = await studySession.getDeckSettings(nextCard.deckId);
          setGraduationThreshold(deckSettings?.graduationThreshold || 3);
          // Set progress to current session progress for this card
          const sessionProgress = studySession.getCardSessionProgress(nextCard.id);
          setCurrentCardProgress(sessionProgress);
        }
      } else if (studySession.isActive()) {
        // If the session is still active but no card is returned,
        // try getting the next card again (this can happen with incorrect answers)
        const retryCard = await studySession.getNextCard();
        if (retryCard) {
          setCurrentCard(retryCard);
          setShowBack(false);
          
          // Update graduation threshold for new cards and set session progress
          if (retryCard.isNew) {
            const deckSettings = await studySession.getDeckSettings(retryCard.deckId);
            setGraduationThreshold(deckSettings?.graduationThreshold || 3);
            // Set progress to current session progress for this card
            const sessionProgress = studySession.getCardSessionProgress(retryCard.id);
            setCurrentCardProgress(sessionProgress);
          }
        } else {
          // Only end the session if there are truly no more cards
          const stats = studySession.getSessionStats();
          onComplete(stats);
        }
      } else {
        // Session is complete
        const stats = studySession.getSessionStats();
        onComplete(stats);
      }
    } catch (err) {
      console.error('Failed to process answer:', err);
      setError('Failed to process answer. Please try again.');
    } finally {
    }
  };

  // Handle card reveal
  const handleCardClick = () => {
    if (!showBack && currentCard) {
      setShowBack(true);
    }
  };

  // Only show loading spinner when initializing (no currentCard yet)
  if (isLoading && !currentCard) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center page-container">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--primary-color)' }}></div>
          <p className="theme-text text-lg">Loading study session...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center page-container">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="theme-text text-xl font-bold mb-4">Study Session Error</h2>
          <p className="theme-text-secondary mb-6">{error}</p>
          <button
            onClick={onExit}
            className="btn-primary px-6 py-3 text-lg"
          >
            Return to Review
          </button>
        </div>
      </div>
    );
  }

  // Render session complete state (handled by parent component)
  if (!currentCard) {
    return null;
  }

  const isSentenceCard = currentCard.type === 'sentence';

  return (
    <div className="fixed inset-0 z-50 page-container">
      {/* Header with progress and exit button */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-6 z-10">
        <button
          onClick={onExit}
          className="flex items-center gap-2 px-4 py-2 rounded-lg theme-text-secondary hover:theme-text transition-colors"
          style={{ background: 'rgba(var(--primary-color-rgb), 0.1)' }}
        >
          <FaArrowLeft />
          <span>Exit</span>
        </button>
        
        <div className="theme-text-secondary text-lg font-medium">
          {progress.currentPhase === 'reviews' && progress.reviewsRemaining > 0 && (
            `${progress.reviewsRemaining} reviews left`
          )}
          {progress.currentPhase === 'new-cards' && progress.newCardsRemaining > 0 && (
            `${progress.newCardsRemaining} new cards left`
          )}
          {progress.currentPhase === 'complete' && 'Session complete'}
        </div>
      </div>

      {/* Main card display area */}
      <div className="flex items-center justify-center min-h-screen px-6 py-20">
        <div className="w-full max-w-2xl">
          {/* Card */}
          <div
            className="card-themed-primary cursor-pointer transition-all duration-300 hover:scale-[1.02] min-h-[300px] flex flex-col justify-center relative"
            onClick={handleCardClick}
            style={{
              padding: '2rem',
              borderRadius: '1rem',
              boxShadow: '0 8px 32px 0 rgba(var(--primary-color-rgb), 0.15)',
            }}
          >
            {/* Graduation progress indicators for new cards */}
            {currentCard.isNew && (
              <div className="absolute top-4 left-0 right-0 flex justify-center gap-2">
                {Array.from({ length: graduationThreshold }).map((_, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-full border-2 transition-colors"
                    style={{
                      borderColor: 'var(--primary-color)',
                      backgroundColor: i < currentCardProgress ? '#22c55e' : 'transparent'
                    }}
                  />
                ))}
              </div>
            )}
            {/* Front content */}
            <div className="text-center mb-6">
              <div className="theme-text text-2xl font-medium leading-relaxed">
                {currentCard.front}
              </div>
              {isSentenceCard && showBack && (
                <div className="theme-text-secondary text-lg mt-4 italic">
                  {(currentCard as SentenceCard).translation}
                </div>
              )}
            </div>

            {/* Back content (revealed) */}
            {showBack && (
              <div className="border-t pt-6 mt-6" style={{ borderColor: 'var(--border-color)' }}>
                <div className="text-center theme-text text-xl leading-relaxed">
                  {currentCard.back}
                </div>
              </div>
            )}

            {/* Reveal instruction */}
            {!showBack && (
              <div className="text-center mt-8">
                <p className="theme-text-secondary text-sm">
                  Click or press Space to reveal answer
                </p>
              </div>
            )}
          </div>

          {/* Answer buttons (only shown when back is revealed) */}
          {showBack && (
            <div className="flex justify-center gap-6 mt-8">
              <button
                onClick={() => handleAnswer(false)}
                disabled={isLoading}
                className="flex items-center gap-3 px-8 py-4 rounded-xl text-white font-semibold text-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: '#ef4444',
                  boxShadow: '0 4px 16px 0 rgba(239, 68, 68, 0.3)',
                }}
              >
                <FaTimes size={20} />
                <span>Incorrect (X)</span>
              </button>
              
              <button
                onClick={() => handleAnswer(true)}
                disabled={isLoading}
                className="flex items-center gap-3 px-8 py-4 rounded-xl text-white font-semibold text-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: '#22c55e',
                  boxShadow: '0 4px 16px 0 rgba(34, 197, 94, 0.3)',
                }}
              >
                <FaCheck size={20} />
                <span>Correct (C)</span>
              </button>
            </div>
          )}

          {/* Keyboard shortcuts hint */}
          <div className="text-center mt-6">
            <p className="theme-text-secondary text-sm">
              {!showBack 
                ? 'Space: Reveal • Esc: Exit'
                : 'X: Incorrect • C: Correct • Esc: Exit'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Loading overlay for answer processing */}
      {isLoading && currentCard && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--primary-color)' }}></div>
        </div>
      )}
      
      {/* Graduation success message */}
      {graduationMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl transform scale-110 transition-all">
            <div className="text-center">
              <div className="text-green-500 text-5xl mb-4">🎓</div>
              <h3 className="text-xl font-bold mb-2 theme-text">Congratulations!</h3>
              <p className="theme-text">{graduationMessage}</p>
              <p className="text-sm theme-text-secondary mt-2">This card will now appear in your review schedule</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}