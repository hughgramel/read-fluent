import { useEffect } from 'react';

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
}: UseReaderKeyboardProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  ]);
} 