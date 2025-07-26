'use client';

import React, { useState, useEffect } from 'react';
import { FaCog, FaPlus } from 'react-icons/fa';
import { CardCreatorPopup } from '@/components/CardCreatorPopup';
import { StudySession } from '@/components/StudySession';
import { SessionComplete } from '@/components/SessionComplete';
import { DeckList } from '@/components/DeckList';
import { GlobalSettings } from '@/components/GlobalSettings';
import { CardBrowser } from '@/components/CardBrowser';
import { SessionStats, GlobalReviewSettings } from '@/types/spaced-repetition';
import { CardService } from '@/services/cardService';
import { DeckService } from '@/services/deckService';
import { useAuth } from '@/hooks/useAuth';
import { MIN_STAGE } from '@/constants/spaced-repetition';

export default function ReviewPage() {
  const [isCardCreatorOpen, setIsCardCreatorOpen] = useState(false);
  const [isStudySessionActive, setIsStudySessionActive] = useState(false);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [isCardBrowserOpen, setIsCardBrowserOpen] = useState(false);
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

  // Add effect to reload card cache and refresh decks when sessionStats changes (session completes)
  useEffect(() => {
    if (sessionStats && user) {
      (async () => {
        await CardService.loadAllCardsForUser(user.uid);
        setDeckRefreshTrigger(prev => prev + 1);
      })();
    }
  }, [sessionStats, user]);

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

  const handleSessionStatsClose = async () => {
    if (user) {
      await CardService.loadAllCardsForUser(user.uid);
      setDeckRefreshTrigger(prev => prev + 1);
    }
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

  // Add test card button handler
  const handleAddTestCards = async () => {
    if (!user) return;
    const decks = await DeckService.getUserDecks(user.uid);
    if (decks.length === 0) return;
    const deck = decks[0];
    const now = new Date();
    // Create 5 review cards due today
    const testCards = [
      { front: 'test1', back: 'back1' },
      { front: 'test2', back: 'back2' },
      { front: 'test3', back: 'back3' },
      { front: 'test4', back: 'back4' },
      { front: 'test5', back: 'back5' },
    ];
    for (const card of testCards) {
      await CardService.createCard({
        ...card,
        userId: user.uid,
        deckId: deck.id,
        isNew: false,
        stage: -6,
        nextReview: now,
        relearning: false,
        correctCount: 0,
        type: 'basic',
      });
    }
    // Reload card cache and refresh UI
    await CardService.loadAllCardsForUser(user.uid);
    if (typeof window !== 'undefined') window.location.reload();
  };

  const handleCreateDeckClick = () => {
    setIsCardCreatorOpen(true);
  };

  return (
    <div 
      className="page-container w-full min-h-screen flex items-center justify-center px-2 sm:px-0 relative"
      style={{ 
        fontFamily: 'var(--font-family)'
      }}
    > 
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-2xl sm:text-3xl font-bold theme-text mb-4">Review</h1>
        <p className="theme-text-secondary text-base sm:text-lg">Coming soon!</p>
      </div>
    </div>
  );

  // return (
  //   <div 
  //     className="page-container w-full min-h-screen pt-8 pb-4 px-2 sm:pt-0 sm:pb-0 sm:px-0 relative"
  //     style={{ 
  //       fontFamily: 'var(--font-family)'
  //     }}
  //   >
  //     <>
  //       {/* Floating Settings Button - top right */}
  //       <button
  //         onClick={() => setIsGlobalSettingsOpen(true)}
  //         className="fixed top-4 right-4 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-md border border-gray-200 hover:bg-gray-50 transition-colors sm:absolute sm:top-8 sm:right-8"
  //         title="Global Settings"
  //         style={{ padding: 0 }}
  //       >
  //         <FaCog size={24} className="text-gray-600" />
  //       </button>
  //       <div className="w-full flex flex-col items-center">
  //         {/* Study All Button */}
  //         <div className="mb-10 sm:mb-12 w-full flex justify-center">
  //           <div 
  //             className="card-themed-primary rounded-2xl shadow-lg p-6 sm:p-8 text-center w-full max-w-xs sm:max-w-xl md:max-w-2xl lg:max-w-3xl relative"
  //             style={{ minHeight: 260 }}
  //           >
  //             <h2 className="text-xl sm:text-2xl font-semibold theme-text mb-4 mt-2">
  //               Ready to Study?
  //             </h2>
  //             <div className="mb-6">
  //               {isLoadingDueCount ? (
  //                 <div className="flex items-center justify-center">
  //                   <div 
  //                     className="animate-spin rounded-full h-6 w-6 border-b-2 mr-2"
  //                     style={{ borderColor: 'var(--primary-color)' }}
  //                   ></div>
  //                   <span className="theme-text-secondary text-sm sm:text-base">Loading due cards...</span>
  //                 </div>
  //               ) : (
  //                 <p className="theme-text-secondary text-base sm:text-lg">
  //                   {totalDueCount > 0 
  //                     ? `${totalDueCount} card${totalDueCount === 1 ? '' : 's'} due for review`
  //                     : 'No cards due for review'
  //                   }
  //                 </p>
  //               )}
  //             </div>
  //             <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
  //               <button
  //                 onClick={handleStartStudySession}
  //                 disabled={isLoadingDueCount || totalDueCount === 0}
  //                 className="btn-primary px-6 sm:px-8 py-3 text-base sm:text-lg font-semibold rounded-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 w-full sm:w-auto"
  //               >
  //                 {totalDueCount > 0 ? 'Study All' : 'No Cards Due'}
  //               </button>
  //               <button
  //                 onClick={() => setIsCardCreatorOpen(true)}
  //                 className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 text-base sm:text-lg font-semibold rounded-xl hover:scale-105 transition-transform w-full sm:w-auto"
  //                 style={{
  //                   background: 'var(--secondary-color)',
  //                   color: 'white',
  //                   border: 'none'
  //                 }}
  //               >
  //                 <FaPlus size={16} />
  //                 Add Card
  //               </button>
  //             </div>
  //           </div>
  //         </div>

  //         {/* Decks List */}
  //         <div className="w-full flex flex-col items-center mt-8 sm:mt-0">
  //           <div className="flex flex-row items-center justify-center gap-4 mb-4">
  //             <h2 className="text-xl sm:text-2xl font-bold theme-text mb-0">Your Decks</h2>
  //             <button
  //               onClick={handleCreateDeckClick}
  //               className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium hover:scale-105 transition-transform btn-primary"
  //               style={{
  //                 background: 'var(--secondary-color, #67b9e7)',
  //                 color: 'var(--button-text-color, white)',
  //                 border: 'none',
  //                 outline: 'none',
  //               }}
  //             >
  //               + Create Deck
  //             </button>
  //           </div>
  //           <div className="w-full max-w-xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
  //             <DeckList 
  //               onDeckReview={handleDeckReview}
  //               refreshTrigger={deckRefreshTrigger}
  //               minimalistMobile={true}
  //             />
  //           </div>
  //         </div>
  //       </div>

  //       {/* Card Creator Popup */}
  //       <CardCreatorPopup
  //         isOpen={isCardCreatorOpen}
  //         onClose={() => setIsCardCreatorOpen(false)}
  //         onCardCreated={handleCardCreated}
  //       />

  //       {/* Study Session */}
  //       {isStudySessionActive && user && (
  //         <StudySession
  //           userId={user.uid}
  //           onComplete={handleSessionComplete}
  //           onExit={handleSessionExit}
  //         />
  //       )}

  //       {/* Session Complete */}
  //       {sessionStats && (
  //         <SessionComplete
  //           stats={sessionStats}
  //           onClose={handleSessionStatsClose}
  //           onStartNewSession={handleStartNewSession}
  //         />
  //       )}

  //       {/* Global Settings */}
  //       {user && (
  //         <GlobalSettings
  //           userId={user.uid}
  //           isOpen={isGlobalSettingsOpen}
  //           onClose={() => setIsGlobalSettingsOpen(false)}
  //           onSettingsUpdated={handleGlobalSettingsUpdated}
  //         />
  //       )}

  //       {/* Card Browser */}
  //       {isCardBrowserOpen && (
  //         <CardBrowser
  //           isOpen={isCardBrowserOpen}
  //           onClose={() => setIsCardBrowserOpen(false)}
  //         />
  //       )}
  //     </>
  //   </div>
  // );
} 