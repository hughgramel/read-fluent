'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, SentenceCard, StudyProgress, SessionStats } from '@/types/spaced-repetition';
import { StudySession as StudySessionService } from '@/services/studySession';
import { DeckService } from '@/services/deckService';
import { CardService } from '@/services/cardService';
import { FaCheck, FaTimes, FaArrowLeft } from 'react-icons/fa';

interface StudySessionProps {
  userId: string;
  onComplete: (stats: SessionStats) => void;
  onExit: () => void;
}

// Type guard for Card/SentenceCard
function isCard(card: any): card is Card | SentenceCard {
  return card && typeof card === 'object' && 'deckId' in card && 'front' in card && 'back' in card;
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
  const [deckStats, setDeckStats] = useState<{ newCount: number; dailyNewCardsDone: number; newCardsPerDay: number; dueCount: number } | null>(null);
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false);
  const [preloadedCard, setPreloadedCard] = useState<Card | SentenceCard | null>(null);
  const [preloadQueue, setPreloadQueue] = useState<(Card | SentenceCard)[]>([]);
  const [lastAnsweredAt, setLastAnsweredAt] = useState<number>(0);

  // Fetch deck stats at session start and after each answer
  const fetchDeckStats = async (deckId: string) => {
    if (!deckId || !userId) return;
    // Use cache for stats
    const newCards = CardService.getNewCardsFromCache(userId, deckId, 1000);
    const dueCards = CardService.getDueCardsFromCache(userId, deckId);
    const deck = await DeckService.getDeck(userId, deckId);
    const daily = await DeckService.getDailyProgress(userId, deckId);
    setDeckStats({
      newCount: newCards.length,
      dailyNewCardsDone: daily.newCardsStudied,
      newCardsPerDay: deck?.settings?.newCardsPerDay || 20,
      dueCount: dueCards.length
    });
  };

  // Initialize study session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsLoading(true);
        // Load all cards for user into cache first
        await CardService.loadAllCardsForUser(userId);
        const session = await StudySessionService.create(userId);
        setStudySession(session);
        const nextCard = await session.getNextCard();
        setCurrentCard(nextCard);
        if (nextCard) {
          fetchDeckStats(nextCard.deckId);
          if (nextCard.isNew) {
            const deckSettings = await session.getDeckSettings(nextCard.deckId);
            setGraduationThreshold(deckSettings?.graduationThreshold || 3);
            const sessionProgress = session.getCardSessionProgress(nextCard.id);
            setCurrentCardProgress(sessionProgress);
          }
        }
        const currentProgress = session.getStudyProgress();
        setProgress(currentProgress);
        if (!nextCard) {
          const stats = session.getSessionStats();
          await CardService.uploadUpdatedCards(userId);
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

  // Preload a buffer of the next 3 cards
  const preloadNextCards = useCallback(async (session: StudySessionService, count: number) => {
    if (!session) return;
    const newCards: (Card | SentenceCard)[] = [];
    for (let i = 0; i < count; i++) {
      const next = await session.getNextCard();
      if (next) newCards.push(next);
      else break;
    }
    setPreloadQueue(q => [...q, ...newCards]);
  }, []);

  // Always keep the buffer full after every answer or card change
  useEffect(() => {
    if (studySession && (currentCard || preloadQueue.length === 0)) {
      if (preloadQueue.length < 3) {
        preloadNextCards(studySession, 3 - preloadQueue.length);
      }
    }
  }, [studySession, currentCard, preloadQueue.length, preloadNextCards]);

  // Handle answer processing
  const handleAnswer = useCallback(async (correct: boolean) => {
    // Debounce: prevent double submissions within 50ms
    if (!studySession || !currentCard || isProcessingAnswer || Date.now() - lastAnsweredAt < 50) return;
    setIsProcessingAnswer(true);
    setLastAnsweredAt(Date.now());
    try {
      const wasNew = currentCard.isNew;
      const deckSettings = await studySession.getDeckSettings(currentCard.deckId);
      const threshold = deckSettings?.graduationThreshold || 3;
      await studySession.processAnswer(currentCard.id, correct);
      let newProgress = 0;
      if (wasNew) {
        newProgress = studySession.getCardSessionProgress(currentCard.id);
        setCurrentCardProgress(newProgress);
      }
      const willGraduate = wasNew && correct && (newProgress >= threshold);
      if (willGraduate) {
        setGraduationMessage("Card graduated to review status!");
        setTimeout(() => setGraduationMessage(null), 1000);
      }
      // Use preloaded buffer for instant transition
      setPreloadQueue(q => {
        const nextCard = q[0];
        const rest = q.slice(1);
        if (nextCard && isCard(nextCard)) {
          setCurrentCard(nextCard);
          setShowBack(false);
          fetchDeckStats(nextCard.deckId);
          if (nextCard.isNew) {
            (async () => {
              const deckSettings = await studySession.getDeckSettings(nextCard.deckId);
              setGraduationThreshold(deckSettings?.graduationThreshold || 3);
              const sessionProgress = studySession.getCardSessionProgress(nextCard.id);
              setCurrentCardProgress(sessionProgress);
            })();
          }
        }
        // Always refill the buffer after using a card
        if (studySession && rest.length < 3) {
          preloadNextCards(studySession, 3 - rest.length);
        }
        return rest;
      });
      await CardService.uploadUpdatedCards(userId);
    } catch (err) {
      console.error('Failed to process answer:', err);
      setError('Failed to process answer. Please try again.');
    } finally {
      setIsProcessingAnswer(false);
    }
  }, [studySession, currentCard, fetchDeckStats, onComplete, userId, isProcessingAnswer, preloadQueue.length, preloadNextCards, lastAnsweredAt]);

  // Handle keyboard shortcuts
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (!currentCard || isLoading) return;

    switch (event.key) {
      case ' ':
        event.preventDefault();
        if (!showBack) {
          setShowBack(true);
        } else if (showBack) {
          handleAnswer(true); // Spacebar as pass after reveal
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (showBack) {
          handleAnswer(true);
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (showBack) {
          handleAnswer(false);
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
  }, [currentCard, showBack, isLoading, handleAnswer, onExit]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Handle card reveal
  const handleCardClick = () => {
    if (!showBack && currentCard) {
      setShowBack(true);
    }
  };

  // Memoize deckStats calculation
  const newCardsLeftToday = useMemo(() => {
    if (!deckStats) return 0;
    return Math.max(0, Math.min(deckStats.newCount, deckStats.newCardsPerDay - deckStats.dailyNewCardsDone));
  }, [deckStats]);

  // Memoize progress display
  const progressDisplay = useMemo(() => {
    if (progress.currentPhase === 'reviews') {
      if (deckStats && typeof deckStats.dueCount === 'number') {
        return `${deckStats.dueCount} reviews left today`;
      }
      // Fallback to progress.reviewsRemaining if deckStats not loaded
      if (progress.reviewsRemaining > 0) {
        return `${progress.reviewsRemaining} reviews left today`;
      }
    }
    if (progress.currentPhase === 'new-cards') {
      if (deckStats && typeof newCardsLeftToday === 'number') {
        return `${newCardsLeftToday} new cards left today`;
      }
      // Fallback to progress.newCardsRemaining if deckStats not loaded
      if (progress.newCardsRemaining > 0) {
        return `${progress.newCardsRemaining} new cards left today`;
      }
    }
    if (progress.currentPhase === 'complete') {
      return 'Session complete';
    }
    return '';
  }, [progress, deckStats, newCardsLeftToday]);

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

  if (!currentCard) {
    return null;
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

  const isSentenceCard = currentCard.type === 'sentence';

  // Memoize the card display for performance
  const MemoizedCard = React.memo(function CardDisplay({ card, showBack, onClick, graduationThreshold, currentCardProgress, isSentenceCard }: any) {
    return (
      <div
        className="card-themed-primary cursor-pointer transition-all duration-150 hover:scale-[1.01] min-h-[300px] flex flex-col justify-center relative"
        onClick={onClick}
        style={{
          padding: '2rem',
          borderRadius: '1rem',
          boxShadow: '0 8px 32px 0 rgba(var(--primary-color-rgb), 0.15)',
        }}
      >
        {/* Graduation progress indicators for new cards */}
        {card.isNew && (
          <div className="absolute top-4 left-0 right-0 flex justify-center gap-2">
            {Array.from({ length: graduationThreshold }).map((_: any, i: number) => (
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
            {card.front}
          </div>
          {isSentenceCard && showBack && (
            <div className="theme-text-secondary text-lg mt-4 italic">
              {(card as SentenceCard).translation}
            </div>
          )}
        </div>
        {/* Back content (revealed) */}
        {showBack && (
          <div className="border-t pt-6 mt-6" style={{ borderColor: 'var(--border-color)' }}>
            <div className="text-center theme-text text-xl leading-relaxed">
              {card.back}
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
    );
  });

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
          {progressDisplay}
        </div>
      </div>
      {/* Main card display area */}
      <div className="flex items-center justify-center min-h-screen px-6 py-20">
        <div className="w-full max-w-2xl">
          {/* Card */}
          <MemoizedCard
            card={currentCard}
            showBack={showBack}
            onClick={handleCardClick}
            graduationThreshold={graduationThreshold}
            currentCardProgress={currentCardProgress}
            isSentenceCard={isSentenceCard}
          />
          {/* Answer buttons (only shown when back is revealed) */}
          {showBack && (
            <div className="flex justify-center gap-6 mt-8">
              <button
                onClick={() => handleAnswer(false)}
                disabled={isLoading}
                className="flex items-center gap-3 px-8 py-4 rounded-xl text-white font-semibold text-lg transition-all duration-150 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="flex items-center gap-3 px-8 py-4 rounded-xl text-white font-semibold text-lg transition-all duration-150 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: '#22c55e',
                  boxShadow: '0 4px 16px 0 rgba(34, 197, 94, 0.3)',
                }}
              >
                <FaCheck size={20} />
                <span>Correct (C or Space)</span>
              </button>
            </div>
          )}
          {/* Keyboard shortcuts hint */}
          <div className="text-center mt-6">
            <p className="theme-text-secondary text-sm">
              {!showBack
                ? 'Space: Reveal • Esc: Exit'
                : 'Space/C: Correct • X: Incorrect • Esc: Exit'}
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