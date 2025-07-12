import { useEffect } from 'react';
import { WordType } from '@/components/reader/ReaderTypes';

interface UseReaderKeyboardProps {
  onPrevPage: () => void;
  onNextPage: () => void;
  onMarkPageComplete: () => void;
  onUnmarkPageComplete: () => void;
  onToggleInvisibleText: () => void;
  onToggleSectionSidebar: () => void;
  onRepeatSentence: () => void;
  isPageRead: boolean;
  setIsWHeld: (held: boolean) => void;
  hoveredWord: string | null;
  updateWordStatus: (word: string, type: WordType) => void;
  enableHighlightWords: boolean;
}

export function useReaderKeyboard({
  onPrevPage,
  onNextPage,
  onMarkPageComplete,
  onUnmarkPageComplete,
  onToggleInvisibleText,
  onToggleSectionSidebar,
  onRepeatSentence,
  isPageRead,
  setIsWHeld,
  hoveredWord,
  updateWordStatus,
  enableHighlightWords,
}: UseReaderKeyboardProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Word status shortcuts when hovering over a word
      if (enableHighlightWords && hoveredWord) {
        if (e.key === '1') {
          updateWordStatus(hoveredWord, 'known');
          return;
        } else if (e.key === '2') {
          updateWordStatus(hoveredWord, 'tracking');
          return;
        } else if (e.key === '3') {
          updateWordStatus(hoveredWord, 'ignored');
          return;
        } else if (e.key === '4') {
          // For "unknown" we need to remove the word from the database
          updateWordStatus(hoveredWord, 'unknown' as WordType);
          return;
        }
      }
      
      // Regular shortcuts
      if (e.key === 'ArrowLeft') {
        onPrevPage();
      } else if (e.key === 'ArrowRight') {
        onNextPage();
      } else if (e.key === 'Enter') {
        if (isPageRead) {
          onUnmarkPageComplete();
        } else {
          onMarkPageComplete();
        }
      } else if (e.key === 'w' || e.key === 'W') {
        setIsWHeld(true);
      } else if (e.key === 'i' || e.key === 'I') {
        onToggleInvisibleText();
      } else if (e.key === 's' || e.key === 'S') {
        onToggleSectionSidebar();
      } else if (e.key === 'r' || e.key === 'R') {
        onRepeatSentence();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W') {
        setIsWHeld(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    onPrevPage,
    onNextPage,
    onMarkPageComplete,
    onUnmarkPageComplete,
    onToggleInvisibleText,
    onToggleSectionSidebar,
    onRepeatSentence,
    isPageRead,
    setIsWHeld,
    hoveredWord,
    updateWordStatus,
    enableHighlightWords,
  ]);
} 