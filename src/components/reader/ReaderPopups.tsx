import React, { useEffect, useState } from 'react';
import { WordsReadPopupState, UnmarkedPopupState } from './ReaderTypes';

interface ReaderPopupsProps {
  showWordsReadPopup: WordsReadPopupState;
  showUnmarkedPopup: UnmarkedPopupState;
  showCopyConfirm: boolean;
  showSentenceSaved: boolean;
}

export function ReaderPopups({
  showWordsReadPopup,
  showUnmarkedPopup,
  showCopyConfirm,
  showSentenceSaved,
}: ReaderPopupsProps) {
  // Custom toast state
  const [customToast, setCustomToast] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: any) => {
      setCustomToast(e.detail);
      setTimeout(() => setCustomToast(null), 2000);
    };
    window.addEventListener('show-toast', handler);
    return () => window.removeEventListener('show-toast', handler);
  }, []);

  return (
    <>
      {/* Words read popup */}
      {showWordsReadPopup.visible && (
        <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1000 }} className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg text-lg font-bold animate-fade-in">
          Marked read! ({showWordsReadPopup.wordCount.toLocaleString()} words)
        </div>
      )}

      {/* Unmarked popup */}
      {showUnmarkedPopup.visible && (
        <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1000 }} className="bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg text-lg font-bold animate-fade-in">
          Marked unread! (-{showUnmarkedPopup.wordCount.toLocaleString()} words)
        </div>
      )}

      {/* Copy confirmation popup */}
      {showCopyConfirm && (
        <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1000 }} className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold animate-fade-in">
          Copied!
        </div>
      )}

      {/* Sentence saved popup */}
      {showSentenceSaved && (
        <div style={{ position: 'fixed', bottom: 80, right: 32, zIndex: 1000 }} className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold animate-fade-in">
          Sentence saved!
        </div>
      )}

      {/* Custom toast popup */}
      {customToast && (
        <div style={{ position: 'fixed', bottom: 128, right: 32, zIndex: 1000 }} className="bg-gray-900 text-white px-5 py-3 rounded-lg shadow-lg text-base font-semibold animate-fade-in">
          {customToast}
        </div>
      )}
    </>
  );
} 