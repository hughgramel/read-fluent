import React, { useState, useEffect, useRef } from 'react';
import { Clipboard } from 'lucide-react';
import { WordType } from './ReaderTypes';
import { getWordUnderline, getWordHighlight, cleanWord, isNumeric } from './ReaderUtils';
import { WordPopup } from './WordPopup';
import ReactMarkdown from 'react-markdown';
import { Components } from 'react-markdown';

interface ReaderContentProps {
  flatSentences: string[];
  readerFont: string;
  readerFontSize: number;
  readerWidth: number;
  lineSpacing: number;
  isMobile: boolean;
  invisibleText: boolean;

  disableWordHighlighting: boolean;
  disableSentenceHighlighting: boolean;
  highlightSentenceOnHover: boolean;
  showCurrentWordWhenInvisible: boolean;
  isWHeld: boolean;
  activeSentenceIndex: number | null;
  activeWordIndex: number | null;
  currentlyHighlightedSentence: number | null;
  isSentenceSelectMode: boolean;
  onSentenceClick: (sentence: string, sentenceIndex: number) => void;
  onCopyText: () => void;
  showCopyConfirm: boolean;
  enableHighlightWords: boolean;
  highlightInsteadOfUnderline?: boolean;
  getWordStatus: (word: string) => WordType | undefined;
  updateWordStatus: (word: string, status: WordType) => void;
  hoveredWord: string | null;
  onWordHover: (word: string | null) => void;
  onWordDefinitionHover?: (word: string | null, event?: React.MouseEvent) => void;
  onWordDefinitionLongPress?: (word: string, event: React.MouseEvent) => void;
  onWordDefinitionMouseUp?: () => void;
  getWordKey?: (word: string, idx: number) => string;
  disableWordDefinitionPopup?: boolean;
  showHeader?: boolean;
  readerSettings: {
    nativeLanguage: string;
    enableMarkdown: boolean;
    disableClipboardButton: boolean;
    targetLanguage?: string;
    dictionary?: string;
    wordPopupDefaultTab?: 'definition' | 'explain' | 'translate' | 'sentence' | 'word-explain';
    autoMarkAsLearningOnPopupOpen?: boolean;
  };
  setCurrentlyHighlightedSentence: (sentenceIndex: number | null) => void;
}

export function ReaderContent({
  flatSentences,
  readerFont,
  readerFontSize,
  readerWidth,
  lineSpacing,
  isMobile,
  invisibleText,

  disableWordHighlighting,
  disableSentenceHighlighting,
  highlightSentenceOnHover,
  showCurrentWordWhenInvisible,
  isWHeld,
  activeSentenceIndex,
  activeWordIndex,
  currentlyHighlightedSentence,
  isSentenceSelectMode,
  onSentenceClick,
  onCopyText,
  showCopyConfirm,
  enableHighlightWords,
  highlightInsteadOfUnderline = false,
  getWordStatus,
  updateWordStatus,
  hoveredWord,
  onWordHover,
  onWordDefinitionHover,
  onWordDefinitionLongPress,
  onWordDefinitionMouseUp,
  getWordKey,
  disableWordDefinitionPopup = false,
  showHeader = false,
  readerSettings,
  setCurrentlyHighlightedSentence,
}: ReaderContentProps) {
  // Track which word span is hovered (by word+index)
  const [hoveredWordKey, setHoveredWordKey] = useState<string | null>(null);
  const hoveredWordInfo = useRef<{ word: string; sentence: string; rect: DOMRect | null } | null>(null);
  const [popup, setPopup] = useState<null | { word: string; sentence: string; x: number; y: number; position: 'above' | 'below'; align: 'left' | 'right' }>(null);
  const wordPopupWordSpan = useRef<HTMLElement | null>(null);
  const wordPopupWordSentenceSpan = useRef<HTMLElement | null>(null);
  // Add a ref to track the last selected word span for popup
  const lastWordPopupWordSpan = useRef<HTMLElement | null>(null);
  // Add a ref to store the original styling before popup highlight
  const originalWordStyle = useRef<{ background: string; borderRadius: string; boxShadow: string; borderBottom: string } | null>(null);

  // Update hoveredWordInfo when hoveredWordKey changes
  useEffect(() => {
    if (!hoveredWordKey) {
      hoveredWordInfo.current = null;
    }
  }, [hoveredWordKey]);

  // Function to split sentence into words and separate punctuation from the last word
  const splitSentenceWithPunctuation = (sentence: string) => {
    // First, split by whitespace to get words
    const words = sentence.match(/\S+/g) || [];
    
    if (words.length === 0) return [];
    
    // Check if the last word ends with punctuation
    const lastWord = words[words.length - 1];
    const punctuationMatch = lastWord.match(/^(.+?)([.,!?;:]|["'\)\]}])*$/);
    
    if (punctuationMatch && punctuationMatch[2]) {
      // Split the last word into word and punctuation
      const wordPart = punctuationMatch[1];
      const punctuationPart = punctuationMatch[2];
      
      // Replace the last word with just the word part
      const result = [...words.slice(0, -1), wordPart];
      
      // Add punctuation as a separate item if it exists
      if (punctuationPart) {
        result.push(punctuationPart);
      }
      
      return result;
    }
    
    return words;
  };

  // Function to clean word for display (remove punctuation but preserve apostrophes for French)
  const cleanWordForDisplay = (word: string) => {
    return word.replace(/[.,!?;:]|["\)\]}]/g, '');
  };

  // Helper to clean asterisks from a word
  function cleanWordForLookup(word: string) {
    return word.replace(/\*+/g, '');
  }

  // Show popup (no auto-close timeout)
  const showPopup = (word: string, sentence: string, rect: DOMRect | null) => {
    if (disableWordDefinitionPopup) return;
    if (!rect) return;
    
    // Auto-mark word as learning when opening popup (if setting is enabled and word highlighting is on)
    if (readerSettings.autoMarkAsLearningOnPopupOpen && enableHighlightWords && updateWordStatus) {
      const currentStatus = getWordStatus(word);
      // Only mark as learning if the word is currently unknown
      if (!currentStatus || currentStatus === 'unknown') {
        updateWordStatus(word, 'tracking');
        // Update the word's styling to reflect the new status immediately
        if (wordPopupWordSpan.current) {
          const newStatus = 'tracking';
          const isHovered = false; // Not hovered when popup is open
          
          // Update the styling to reflect the new status
          if (highlightInsteadOfUnderline && enableHighlightWords) {
            wordPopupWordSpan.current.style.background = getWordHighlight(newStatus, isHovered);
            wordPopupWordSpan.current.style.borderRadius = '4px';
          } else if (enableHighlightWords) {
            wordPopupWordSpan.current.style.borderBottom = getWordUnderline(newStatus, isHovered);
          }
        }
      }
    }
    
    // Save the current status-based styling after any auto-marking has occurred
    if (wordPopupWordSpan.current) {
      saveCurrentStatusStyle(wordPopupWordSpan.current, word);
    }
    
    // Popup dimensions
    const popupWidth = 400;
    const popupHeight = 255;
    const padding = 16;
    
    // Calculate available space considering the entire page
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Account for header when calculating top space
    const headerHeight = showHeader ? (isMobile ? 56 : 64) : 0;
    const spaceAbove = rect.top - headerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    
    // Calculate horizontal positioning based on entire page width
    const spaceLeft = rect.left;
    const spaceRight = viewportWidth - rect.right;
    
    // Determine vertical position (prefer below, but go above if not enough space)
    const position = spaceBelow >= popupHeight + padding || spaceBelow > spaceAbove ? 'below' : 'above';
    
    // Determine horizontal alignment
    // Simple logic: prefer left alignment, only use right if there's clearly not enough space on the left
    // Check if there's enough space on the left (at least some minimum space)
    const hasMinimalLeftSpace = spaceLeft >= 50; // At least 50px on the left
    const hasGoodRightSpace = spaceRight >= popupWidth + padding; // Enough space on the right
    
    let align: 'left' | 'right';
    if (hasMinimalLeftSpace) {
      // Use left alignment if there's at least some space on the left
      align = 'left';
    } else if (hasGoodRightSpace) {
      // Use right alignment if there's clearly not enough space on the left but plenty on the right
      align = 'right';
    } else {
      // Default to left alignment - let the edge protection handle positioning
      align = 'left';
    }
    
    // Calculate final coordinates
    let x: number;
    let y: number;
    
    if (align === 'left') {
      // Left align: popup's left edge aligns with word's left edge
      x = rect.left;
      // Ensure popup doesn't go off the right edge
      if (x + popupWidth > viewportWidth - padding) {
        x = viewportWidth - popupWidth - padding;
      }
      // Ensure popup doesn't go off the left edge
      if (x < padding) {
        x = padding;
      }
    } else {
      // Right align: popup's right edge aligns with word's right edge
      x = rect.right - popupWidth;
      // Ensure popup doesn't go off the left edge
      if (x < padding) {
        x = padding;
      }
      // Also ensure popup doesn't go off the right edge (in case word is very wide)
      if (x + popupWidth > viewportWidth - padding) {
        x = viewportWidth - popupWidth - padding;
      }
    }
    
    if (position === 'below') {
      y = rect.bottom - 2; // Reduced from 6 to 2 to move up slightly
      // Ensure popup doesn't go off the bottom edge
      if (y + popupHeight > viewportHeight - padding) {
        y = viewportHeight - popupHeight - padding;
      }
    } else {
      y = rect.top - popupHeight - 10; // Increased from 6 to 10 to move up more when above
      // Ensure popup doesn't go off the top edge (account for header)
      if (y < headerHeight + padding) {
        y = headerHeight + padding;
      }
    }
    
    setPopup({ word, sentence, x, y, position, align });
  };

  useEffect(() => {
    const handleShiftClick = (e: KeyboardEvent) => {
      if (disableWordDefinitionPopup) return;
      if (e.key === 'Shift') {
        console.log('=== SHIFT KEY PRESSED ===');
        console.log('Current popup state:', popup ? `Open for "${popup.word}"` : 'No popup open');
        console.log('Hovered word key:', hoveredWordKey);
        console.log('Hovered word info:', hoveredWordInfo.current);
        console.log('Hovered word info details:', hoveredWordInfo.current ? {
          word: hoveredWordInfo.current.word,
          sentence: hoveredWordInfo.current.sentence.substring(0, 50) + '...',
          rect: hoveredWordInfo.current.rect
        } : 'null');
        
        // If hovering over a word, handle popup for that word
        if (hoveredWordKey && hoveredWordInfo.current) {
          const currentWord = hoveredWordInfo.current.word;
          const currentSentence = hoveredWordInfo.current.sentence;
          
          console.log('Hovering over word:', currentWord);
          console.log('Word position:', hoveredWordInfo.current.rect);
          
          // If popup is already open for this word, close it
          if (popup && popup.word === currentWord && popup.sentence === currentSentence) {
            console.log('Closing popup for same word');
            setPopup(null);
            removeWordPopupHighlightStyle(wordPopupWordSpan.current);
            wordPopupWordSpan.current = null;
            wordPopupWordSentenceSpan.current = null;

          } else {
            // If popup is open for a different word, close it and open for current word
            // If no popup is open, just open for current word
            console.log('Opening popup for word:', currentWord);
            setPopup(null);
            // Use a small delay to ensure state update is processed
            setTimeout(() => {
              showPopup(currentWord, currentSentence, hoveredWordInfo.current!.rect);
            }, 0);
          }
        } else {
          console.log('No word being hovered over');
          console.log('Reason: hoveredWordKey =', hoveredWordKey, 'hoveredWordInfo.current =', hoveredWordInfo.current);
        }
        console.log('=== END SHIFT KEY ===');
      }
    };
    window.addEventListener('keydown', handleShiftClick);
    return () => {
      window.removeEventListener('keydown', handleShiftClick);
    };
  }, [hoveredWordKey, disableWordDefinitionPopup, popup]);

  // Handle clicking outside the popup to close it
  const handleContainerClick = (e: React.MouseEvent) => {
    // Only close popup if clicking on the container itself, not on the popup
    if (e.target === e.currentTarget && popup) {
      setPopup(null);
    }
  };

  // Global click handler to close popup when clicking anywhere
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (popup) {
        // Check if the click is outside the popup
        const popupElement = document.querySelector('[data-popup="word-popup"]');
        if (popupElement && !popupElement.contains(e.target as Node)) {
          setPopup(null);
          removeWordPopupHighlightStyle(wordPopupWordSpan.current);
          wordPopupWordSpan.current = null;
          wordPopupWordSentenceSpan.current = null;
        }
      }
    };

    if (popup) {
      document.addEventListener('click', handleGlobalClick);
    }

    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [popup]);

  // Add a helper to apply and remove the highlight style
  function applyWordPopupHighlightStyle(el: HTMLElement | null) {
    if (!el) return;
    
    // Apply popup highlight style
    el.style.background = 'rgba(56, 189, 248, 0.18)';
    el.style.borderRadius = '0.25em';
    el.style.boxShadow = '0 -4px 0 0 rgba(56, 189, 248, 0.18)';
  }
  
  // Function to save the current status-based styling (to be called after auto-marking)
  function saveCurrentStatusStyle(el: HTMLElement | null, word: string) {
    if (!el) return;
    
    const cleanedWord = cleanWordForLookup(word);
    const currentStatus = getWordStatus(cleanedWord);
    const isHovered = false; // Not hovered when popup is open
    
    // Calculate what the styling should be based on current status
    let background = '';
    let borderRadius = '';
    let borderBottom = '';
    
    if (enableHighlightWords && currentStatus) {
      if (highlightInsteadOfUnderline) {
        background = getWordHighlight(currentStatus, isHovered);
        borderRadius = '4px';
      } else {
        borderBottom = getWordUnderline(currentStatus, isHovered);
      }
    }
    
    // Save the current status-based styling
    originalWordStyle.current = {
      background,
      borderRadius,
      boxShadow: '',
      borderBottom
    };
  }
  
  function removeWordPopupHighlightStyle(el: HTMLElement | null) {
    if (!el) return;
    
    // Get the word from the element's text content
    const wordText = el.textContent?.trim() || '';
    const cleanedWord = cleanWordForLookup(wordText);
    
    // Get the current status of the word
    const currentStatus = getWordStatus(cleanedWord);
    const isHovered = false; // Not hovered when popup is closed
    
    // Calculate the current status-based styling
    if (enableHighlightWords && currentStatus) {
      if (highlightInsteadOfUnderline) {
        el.style.background = getWordHighlight(currentStatus, isHovered);
        el.style.borderRadius = '4px';
        el.style.boxShadow = '';
      } else {
        el.style.borderBottom = getWordUnderline(currentStatus, isHovered);
        el.style.background = '';
        el.style.borderRadius = '';
      }
    } else {
      // No status or highlighting disabled, clear all styling
      el.style.background = '';
      el.style.borderRadius = '';
      el.style.boxShadow = '';
      el.style.borderBottom = '';
    }
    
    // Clear the saved styling since we're not using it anymore
    originalWordStyle.current = null;
  }

  // Handle sentence hover
  const handleSentenceHover = (sentenceIndex: number | null) => {
    if (wordPopupWordSentenceSpan.current) {
      const int = parseInt(wordPopupWordSentenceSpan.current.getAttribute('data-sentence-index') || '0');
      if (int === sentenceIndex) {
        return;
      }
    }
    setCurrentlyHighlightedSentence(sentenceIndex);
  };

  // Helper to render a sentence with word spans (for use in both normal and markdown mode)
  const renderSentenceWithSpans = (sentence: string, sIdx: number) => {
    const words = splitSentenceWithPunctuation(sentence);
    const isSentenceHighlighted = sIdx === activeSentenceIndex && !disableSentenceHighlighting;
    const isSentenceHovered = highlightSentenceOnHover && sIdx === currentlyHighlightedSentence;
    const showCurrentSentence = invisibleText && isWHeld && isSentenceHighlighted;
    return (
      <span
        key={sIdx}
        data-sentence-index={sIdx}
        className={`${isSentenceHighlighted ? 'speaking-highlight' : ''} ${isSentenceSelectMode ? 'sentence-selectable' : ''}`}
        style={{
          marginRight: 8,
          cursor: isSentenceSelectMode ? 'pointer' : (highlightSentenceOnHover ? 'pointer' : 'pointer'),
          color: showCurrentSentence
            ? '#232946'
            : (invisibleText ? 'rgba(0,0,0,0.01)' : '#232946'),
          background: isSentenceHovered ? 'rgba(56, 189, 248, 0.18)' : undefined,
          borderRadius: isSentenceHovered ? '0.25em' : undefined,
          transition: 'background 0.15s',
          boxShadow: isSentenceHovered ? '0 -4px 0 0 rgba(56, 189, 248, 0.18)' : undefined,
          display: 'inline',
          verticalAlign: 'baseline',
        }}
        onMouseEnter={() => {
          if (highlightSentenceOnHover) handleSentenceHover(sIdx);
        }}
        onMouseLeave={() => {
          if (highlightSentenceOnHover) handleSentenceHover(null);
        }}
        onClick={() => {
          if (isSentenceSelectMode) onSentenceClick(sentence, sIdx);
        }}
      >
        {words.map((word, wIdx) => {
          const isPunctuation = /^[.,!?;:]|["'\)\]}]$/.test(word);
          const isLastNonPunctuationWord = !isPunctuation && words.slice(wIdx + 1).every(w => /^[.,!?;:]|["'\)\]}]$/.test(w));
          const cleanedWord = cleanWordForDisplay(word);
          // Treat numbers as ignored since there are infinite numbers
          const wordStatus = enableHighlightWords ? (isNumeric(word) ? 'ignored' : getWordStatus(cleanedWord)) : undefined;
          const wordKey = getWordKey ? getWordKey(word, wIdx) : `${word}__${wIdx}`;
          const isHovered = hoveredWordKey === wordKey;
          const isActiveWord = !disableWordHighlighting && sIdx === activeSentenceIndex && wIdx === activeWordIndex;
          if (isMobile && sIdx === 0 && wIdx === 0 && !readerSettings.disableClipboardButton) {
            return (
              <React.Fragment key={wIdx}>
                <button
                  onClick={onCopyText}
                  className="inline-flex items-center justify-center w-7 h-7 min-w-0 min-h-0 p-0 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 shadow border border-gray-300 mr-1 align-middle"
                  title="Copy page text"
                  style={{ verticalAlign: 'middle' }}
                >
                  <Clipboard className="w-4 h-4" />
                </button>
                                      <span
                        style={{
                          marginRight: isPunctuation || isLastNonPunctuationWord ? 0 : 4,
                          color: isActiveWord ? '#232946' : (showCurrentSentence
                            ? '#232946'
                            : (invisibleText
                                ? (showCurrentWordWhenInvisible
                                    ? '#232946'
                                    : 'rgba(0,0,0,0.001)')
                                : undefined)),
                          background: isActiveWord ? '#ffe066' : (highlightInsteadOfUnderline && !isPunctuation && enableHighlightWords ? getWordHighlight(wordStatus, isHovered) : undefined),
                          borderRadius: isActiveWord ? 4 : (highlightInsteadOfUnderline && !isPunctuation && enableHighlightWords ? 4 : undefined),
                          borderBottom: !isPunctuation && enableHighlightWords && !highlightInsteadOfUnderline ? getWordUnderline(wordStatus, isHovered) : undefined,
                          cursor: !isPunctuation && enableHighlightWords ? 'pointer' : 'default',
                          transition: 'background 0.15s, color 0.15s',
                        }}
                        data-debug={`word:"${word}" idx:${wIdx} isPunct:${isPunctuation} isLastBeforePunct:${isLastNonPunctuationWord} margin:${isPunctuation || isLastNonPunctuationWord ? 0 : 4}`}
                        onMouseEnter={e => {
                          if (isSentenceSelectMode || isPunctuation) return;
                          setHoveredWordKey(wordKey);
                          const rect = e.currentTarget.getBoundingClientRect();
                          hoveredWordInfo.current = { word, sentence, rect };
                          if (onWordDefinitionHover) onWordDefinitionHover(word, e);
                          if (enableHighlightWords) onWordHover(word);
                        }}
                        onMouseLeave={e => {
                          if (isSentenceSelectMode || isPunctuation) return;
                          setHoveredWordKey(null);
                          hoveredWordInfo.current = null;
                          if (onWordDefinitionHover) onWordDefinitionHover(null, e);
                          if (enableHighlightWords) onWordHover(null);
                        }}
                        onClick={e => {
                          if (isSentenceSelectMode || isPunctuation) return;
                          const el = e.currentTarget as HTMLSpanElement;
                          const cleanedWord = cleanWordForLookup(word);
                          
                          // Check if clicking the same word that's already open
                          if (popup && popup.word === cleanedWord && popup.sentence === sentence) {
                            // Close the popup for the same word
                            setPopup(null);
                            removeWordPopupHighlightStyle(wordPopupWordSpan.current);
                            wordPopupWordSpan.current = null;
                            wordPopupWordSentenceSpan.current = null;
                            return;
                          }
                          
                          // Remove highlight from previous span
                          if (lastWordPopupWordSpan.current && lastWordPopupWordSpan.current !== el) {
                            removeWordPopupHighlightStyle(lastWordPopupWordSpan.current);
                          }
                          // Set refs for popup word and sentence spans
                          wordPopupWordSpan.current = el;
                          lastWordPopupWordSpan.current = el;
                          // Find the sentence span (parentNode)
                          let sentenceSpan: HTMLElement | null = null;
                          if (el.parentElement && el.parentElement.hasAttribute('data-sentence-index')) {
                            sentenceSpan = el.parentElement as HTMLElement;
                          } else if (el.closest('[data-sentence-index]')) {
                            sentenceSpan = el.closest('[data-sentence-index]') as HTMLElement;
                          }
                          wordPopupWordSentenceSpan.current = sentenceSpan;
                          // Log them
                          console.log('wordPopupWordSpan', wordPopupWordSpan.current);
                          console.log('wordPopupWordSentenceSpan', wordPopupWordSentenceSpan.current);
                          // Apply highlight style
                          applyWordPopupHighlightStyle(wordPopupWordSpan.current);
                          showPopup(cleanedWord, sentence, el.getBoundingClientRect());
                        }}
                      >
                  {word + (isPunctuation ? '' : (wIdx < words.length - 1 ? ' ' : ''))}
                </span>
              </React.Fragment>
            );
          }
          return (
            <span
              key={wIdx}
              style={{
                marginRight: isPunctuation || isLastNonPunctuationWord ? 0 : 4,
                color: isActiveWord ? '#232946' : (showCurrentSentence
                  ? '#232946'
                  : (invisibleText
                      ? (showCurrentWordWhenInvisible
                          ? '#232946'
                          : 'rgba(0,0,0,0.001)')
                      : undefined)),
                background: isActiveWord ? '#ffe066' : (highlightInsteadOfUnderline && !isPunctuation && enableHighlightWords ? getWordHighlight(wordStatus, isHovered) : undefined),
                borderRadius: isActiveWord ? 4 : (highlightInsteadOfUnderline && !isPunctuation && enableHighlightWords ? 4 : undefined),
                borderBottom: !isPunctuation && enableHighlightWords && !highlightInsteadOfUnderline ? getWordUnderline(wordStatus, isHovered) : undefined,
                cursor: !isPunctuation && enableHighlightWords ? 'pointer' : 'default',
                transition: 'background 0.15s, color 0.15s',
              }}
              data-debug={`word:"${word}" idx:${wIdx} isPunct:${isPunctuation} isLastBeforePunct:${isLastNonPunctuationWord} margin:${isPunctuation || isLastNonPunctuationWord ? 0 : 4}`}
              onMouseEnter={e => {
                if (isSentenceSelectMode || isPunctuation) return;
                setHoveredWordKey(wordKey);
                const rect = e.currentTarget.getBoundingClientRect();
                hoveredWordInfo.current = { word, sentence, rect };
                if (onWordDefinitionHover) onWordDefinitionHover(word, e);
                if (enableHighlightWords) onWordHover(word);
              }}
              onMouseLeave={e => {
                if (isSentenceSelectMode || isPunctuation) return;
                setHoveredWordKey(null);
                hoveredWordInfo.current = null;
                if (onWordDefinitionHover) onWordDefinitionHover(null, e);
                if (enableHighlightWords) onWordHover(null);
              }}
              onClick={e => {
                if (isSentenceSelectMode || isPunctuation) return;
                const el = e.currentTarget as HTMLSpanElement;
                const cleanedWord = cleanWordForLookup(word);
                // Remove highlight from previous span
                if (lastWordPopupWordSpan.current && lastWordPopupWordSpan.current !== el) {
                  removeWordPopupHighlightStyle(lastWordPopupWordSpan.current);
                }
                // Set refs for popup word and sentence spans
                wordPopupWordSpan.current = el;
                lastWordPopupWordSpan.current = el;
                // Find the sentence span (parentNode)
                let sentenceSpan: HTMLElement | null = null;
                if (el.parentElement && el.parentElement.hasAttribute('data-sentence-index')) {
                  sentenceSpan = el.parentElement as HTMLElement;
                } else if (el.closest('[data-sentence-index]')) {
                  sentenceSpan = el.closest('[data-sentence-index]') as HTMLElement;
                }
                wordPopupWordSentenceSpan.current = sentenceSpan;
                // Log them
                console.log('wordPopupWordSpan', wordPopupWordSpan.current);
                console.log('wordPopupWordSentenceSpan', wordPopupWordSentenceSpan.current);
                // Apply highlight style
                applyWordPopupHighlightStyle(wordPopupWordSpan.current);
                showPopup(cleanedWord, sentence, el.getBoundingClientRect());
              }}
            >
              {word + (isPunctuation ? '' : (wIdx < words.length - 1 ? ' ' : ''))}
            </span>
          );
        })}
      </span>
    );
  };

  // Markdown custom renderers for p, li, etc.
  const markdownComponents: Components = {
    p: (props: React.PropsWithChildren<React.HTMLAttributes<HTMLParagraphElement>>) => {
      const { children } = props;
      const flat = React.Children.toArray(children);
      const text = flat.map(child => (typeof child === 'string' ? child : '')).join(' ');
      if (!text.trim()) return <p {...props}>{children}</p>;
      const sentences = text.match(/[^.!?\n]+[.!?]?/g) || [text];
      return (
        <p {...props} style={{ ...(props.style || {}), marginBottom: '1em' }}>
          {sentences.map((sentence: string, idx: number) => renderSentenceWithSpans(sentence, idx))}
        </p>
      );
    },
    li: (props: React.PropsWithChildren<React.LiHTMLAttributes<HTMLLIElement>>) => {
      const { children } = props;
      const flat = React.Children.toArray(children);
      const text = flat.map(child => (typeof child === 'string' ? child : '')).join(' ');
      if (!text.trim()) return <li {...props}>{children}</li>;
      const sentences = text.match(/[^.!?\n]+[.!?]?/g) || [text];
      return (
        <li {...props}>
          {sentences.map((sentence: string, idx: number) => renderSentenceWithSpans(sentence, idx))}
        </li>
      );
    },
    // Let headers, ul, ol, etc, render as normal
  };

  if (readerSettings.enableMarkdown) {
    return (
      <div
        style={{
          fontFamily: readerFont,
          fontSize: readerFontSize,
          maxWidth: readerWidth,
          width: '100%',
          color: invisibleText ? 'rgba(0,0,0,0.01)' : '#232946',
          lineHeight: lineSpacing,
        }}
      >
        <ReactMarkdown components={markdownComponents}>
          {flatSentences.join('\n')}
        </ReactMarkdown>
      </div>
    );
  }



  return (
    <div 
      style={{ 
        fontFamily: readerFont, 
        fontSize: readerFontSize, 
        maxWidth: readerWidth, 
        width: '100%', 
        color: invisibleText ? 'rgba(0,0,0,0.01)' : '#232946', 
        lineHeight: lineSpacing 
      }}
      onClick={handleContainerClick}
    >
      {flatSentences.map((sentence, sIdx) => {
        const words = splitSentenceWithPunctuation(sentence);
        const isSentenceHighlighted = sIdx === activeSentenceIndex && !disableSentenceHighlighting;
        const isSentenceHovered = highlightSentenceOnHover && sIdx === currentlyHighlightedSentence;
        const showCurrentSentence = invisibleText && isWHeld && isSentenceHighlighted;
        const forceVisible = showCurrentSentence || (invisibleText && isWHeld && isSentenceHighlighted);
        
        return (
          <span
            key={sIdx}
            data-sentence-index={sIdx}
            className={`${isSentenceHighlighted ? 'speaking-highlight' : ''} ${isSentenceSelectMode ? 'sentence-selectable' : ''}`}
            style={{
              marginRight: 8,
              cursor: isSentenceSelectMode ? 'pointer' : (highlightSentenceOnHover ? 'pointer' : 'pointer'),
              color: showCurrentSentence
                ? '#232946'
                : (invisibleText ? 'rgba(0,0,0,0.01)' : '#232946'),
              background: isSentenceHovered ? 'rgba(56, 189, 248, 0.18)' : undefined,
              borderRadius: isSentenceHovered ? '0.25em' : undefined,
              transition: 'background 0.15s',
              boxShadow: isSentenceHovered ? '0 -4px 0 0 rgba(56, 189, 248, 0.18)' : undefined,
              display: 'inline',
              verticalAlign: 'baseline',
            }}
            onMouseEnter={() => {
              if (highlightSentenceOnHover) handleSentenceHover(sIdx);
            }}
            onMouseLeave={() => {
              if (highlightSentenceOnHover) handleSentenceHover(null);
            }}
            onClick={() => {
              if (isSentenceSelectMode) onSentenceClick(sentence, sIdx);
            }}
          >
            {words.map((word, wIdx) => {
              // Check if this is punctuation
              const isPunctuation = /^[.,!?;:]|["'\)\]}]$/.test(word);
             
              // Check if this is the last non-punctuation word in the sentence
              const isLastNonPunctuationWord = !isPunctuation && 
                words.slice(wIdx + 1).every(w => /^[.,!?;:]|["'\)\]}]$/.test(w));
              
             
              
              // Clean word for status lookup
              const cleanedWord = cleanWordForDisplay(word);
              // Treat numbers as ignored since there are infinite numbers
              const wordStatus = enableHighlightWords ? (isNumeric(word) ? 'ignored' : getWordStatus(cleanedWord)) : undefined;
              const wordKey = getWordKey ? getWordKey(word, wIdx) : `${word}__${wIdx}`;
              const isHovered = hoveredWordKey === wordKey;
              const isActiveWord = !disableWordHighlighting && sIdx === activeSentenceIndex && wIdx === activeWordIndex;
              // Remove useRef from here
              if (isMobile && sIdx === 0 && wIdx === 0) {
                if (!readerSettings.disableClipboardButton) {
                  return (
                    <React.Fragment key={wIdx}>
                      <button
                        onClick={onCopyText}
                        className="inline-flex items-center justify-center w-7 h-7 min-w-0 min-h-0 p-0 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 shadow border border-gray-300 mr-1 align-middle"
                        title="Copy page text"
                        style={{ verticalAlign: 'middle' }}
                      >
                        <Clipboard className="w-4 h-4" />
                      </button>
                      <span
                        style={{
                          marginRight: isPunctuation || isLastNonPunctuationWord ? 0 : 4,
                          color: isActiveWord ? '#232946' : (showCurrentSentence
                            ? '#232946'
                            : (invisibleText
                                ? (showCurrentWordWhenInvisible
                                    ? '#232946'
                                    : 'rgba(0,0,0,0.001)')
                                : undefined)),
                          background: isActiveWord ? '#ffe066' : undefined,
                          borderRadius: isActiveWord ? 4 : undefined,
                          borderBottom: !isPunctuation && enableHighlightWords ? getWordUnderline(wordStatus, isHovered) : undefined,
                          cursor: !isPunctuation && enableHighlightWords ? 'pointer' : 'default',
                          transition: 'background 0.15s, color 0.15s',
                        }}
                        data-debug={`word:"${word}" idx:${wIdx} isPunct:${isPunctuation} isLastBeforePunct:${isLastNonPunctuationWord} margin:${isPunctuation || isLastNonPunctuationWord ? 0 : 4}`}
                        onMouseEnter={e => {
                          if (isSentenceSelectMode || isPunctuation) return;
                          setHoveredWordKey(wordKey);
                          // Immediately set the hover info
                          const rect = e.currentTarget.getBoundingClientRect();
                          hoveredWordInfo.current = { word, sentence, rect };
                          if (onWordDefinitionHover) onWordDefinitionHover(word, e);
                          if (enableHighlightWords) onWordHover(word);
                        }}
                        onMouseLeave={e => {
                          if (isSentenceSelectMode || isPunctuation) return;
                          setHoveredWordKey(null);
                          hoveredWordInfo.current = null;
                          if (onWordDefinitionHover) onWordDefinitionHover(null, e);
                          if (enableHighlightWords) onWordHover(null);
                        }}
                        onClick={e => {
                          if (isSentenceSelectMode || isPunctuation) return;
                          const el = e.currentTarget as HTMLSpanElement;
                          const cleanedWord = cleanWordForLookup(word);
                          // Remove highlight from previous span
                          if (lastWordPopupWordSpan.current && lastWordPopupWordSpan.current !== el) {
                            removeWordPopupHighlightStyle(lastWordPopupWordSpan.current);
                          }
                          // Set refs for popup word and sentence spans
                          wordPopupWordSpan.current = el;
                          lastWordPopupWordSpan.current = el;
                          // Find the sentence span (parentNode)
                          let sentenceSpan: HTMLElement | null = null;
                          if (el.parentElement && el.parentElement.hasAttribute('data-sentence-index')) {
                            sentenceSpan = el.parentElement as HTMLElement;
                          } else if (el.closest('[data-sentence-index]')) {
                            sentenceSpan = el.closest('[data-sentence-index]') as HTMLElement;
                          }
                          wordPopupWordSentenceSpan.current = sentenceSpan;
                          // Log them
                          console.log('wordPopupWordSpan', wordPopupWordSpan.current);
                          console.log('wordPopupWordSentenceSpan', wordPopupWordSentenceSpan.current);
                          // Apply highlight style
                          applyWordPopupHighlightStyle(wordPopupWordSpan.current);
                          showPopup(cleanedWord, sentence, el.getBoundingClientRect());
                        }}
                      >
                        {word + (isPunctuation ? '' : (wIdx < words.length - 1 ? ' ' : ''))}
                      </span>
                    </React.Fragment>
                  );
                }
                // If disabled, just render the word as normal
                return (
                  <span
                    key={wIdx}
                    style={{
                      marginRight: isPunctuation || isLastNonPunctuationWord ? 0 : 4,
                      color: isActiveWord ? '#232946' : (showCurrentSentence
                        ? '#232946'
                        : (invisibleText
                            ? (showCurrentWordWhenInvisible
                                ? '#232946'
                                : 'rgba(0,0,0,0.001)')
                            : undefined)),
                      background: isActiveWord ? '#ffe066' : (highlightInsteadOfUnderline && !isPunctuation && enableHighlightWords ? getWordHighlight(wordStatus, isHovered) : undefined),
                      borderRadius: isActiveWord ? 4 : (highlightInsteadOfUnderline && !isPunctuation && enableHighlightWords ? 4 : undefined),
                      borderBottom: !isPunctuation && enableHighlightWords && !highlightInsteadOfUnderline ? getWordUnderline(wordStatus, isHovered) : undefined,
                      cursor: !isPunctuation && enableHighlightWords ? 'pointer' : 'default',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    data-debug={`word:"${word}" idx:${wIdx} isPunct:${isPunctuation} isLastBeforePunct:${isLastNonPunctuationWord} margin:${isPunctuation || isLastNonPunctuationWord ? 0 : 4}`}
                    onMouseEnter={e => {
                      if (isSentenceSelectMode || isPunctuation) return;
                      setHoveredWordKey(wordKey);
                      // Immediately set the hover info
                      const rect = e.currentTarget.getBoundingClientRect();
                      hoveredWordInfo.current = { word, sentence, rect };
                      if (onWordDefinitionHover) onWordDefinitionHover(word, e);
                      if (enableHighlightWords) onWordHover(word);
                    }}
                    onMouseLeave={e => {
                      if (isSentenceSelectMode || isPunctuation) return;
                      setHoveredWordKey(null);
                      hoveredWordInfo.current = null;
                      if (onWordDefinitionHover) onWordDefinitionHover(null, e);
                      if (enableHighlightWords) onWordHover(null);
                    }}
                    onClick={e => {
                      if (isSentenceSelectMode || isPunctuation) return;
                      const el = e.currentTarget as HTMLSpanElement;
                      const cleanedWord = cleanWordForLookup(word);
                      // Remove highlight from previous span
                      if (lastWordPopupWordSpan.current && lastWordPopupWordSpan.current !== el) {
                        removeWordPopupHighlightStyle(lastWordPopupWordSpan.current);
                      }
                      // Set refs for popup word and sentence spans
                      wordPopupWordSpan.current = el;
                      lastWordPopupWordSpan.current = el;
                      // Find the sentence span (parentNode)
                      let sentenceSpan: HTMLElement | null = null;
                      if (el.parentElement && el.parentElement.hasAttribute('data-sentence-index')) {
                        sentenceSpan = el.parentElement as HTMLElement;
                      } else if (el.closest('[data-sentence-index]')) {
                        sentenceSpan = el.closest('[data-sentence-index]') as HTMLElement;
                      }
                      wordPopupWordSentenceSpan.current = sentenceSpan;
                      // Log them
                      console.log('wordPopupWordSpan', wordPopupWordSpan.current);
                      console.log('wordPopupWordSentenceSpan', wordPopupWordSentenceSpan.current);
                      // Apply highlight style
                      applyWordPopupHighlightStyle(wordPopupWordSpan.current);
                      showPopup(cleanedWord, sentence, el.getBoundingClientRect());
                    }}
                  >
                    {word + (isPunctuation ? '' : (wIdx < words.length - 1 ? ' ' : ''))}
                  </span>
                );
              }
              return (
                <span
                  key={wIdx}
                  style={{
                    marginRight: isPunctuation || isLastNonPunctuationWord ? 0 : 4,
                    color: isActiveWord ? '#232946' : (showCurrentSentence
                      ? '#232946'
                      : (invisibleText
                          ? (showCurrentWordWhenInvisible
                              ? '#232946'
                              : 'rgba(0,0,0,0.001)')
                          : undefined)),
                    background: isActiveWord ? '#ffe066' : (highlightInsteadOfUnderline && !isPunctuation && enableHighlightWords ? getWordHighlight(wordStatus, isHovered) : undefined),
                    borderRadius: isActiveWord ? 4 : (highlightInsteadOfUnderline && !isPunctuation && enableHighlightWords ? 4 : undefined),
                    borderBottom: !isPunctuation && enableHighlightWords && !highlightInsteadOfUnderline ? getWordUnderline(wordStatus, isHovered) : undefined,
                    cursor: !isPunctuation && enableHighlightWords ? 'pointer' : 'default',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  data-debug={`word:"${word}" idx:${wIdx} isPunct:${isPunctuation} isLastBeforePunct:${isLastNonPunctuationWord} margin:${isPunctuation || isLastNonPunctuationWord ? 0 : 4}`}
                  onMouseEnter={e => {
                    if (isSentenceSelectMode || isPunctuation) return;
                    setHoveredWordKey(wordKey);
                    // Immediately set the hover info
                    const rect = e.currentTarget.getBoundingClientRect();
                    hoveredWordInfo.current = { word, sentence, rect };
                    if (onWordDefinitionHover) onWordDefinitionHover(word, e);
                    if (enableHighlightWords) onWordHover(word);
                  }}
                  onMouseLeave={e => {
                    if (isSentenceSelectMode || isPunctuation) return;

                    setHoveredWordKey(null);
                    hoveredWordInfo.current = null;
                    if (onWordDefinitionHover) onWordDefinitionHover(null, e);
                    if (enableHighlightWords) onWordHover(null);
                  }}
                  onClick={e => {
                    if (isSentenceSelectMode || isPunctuation) return;
                    const el = e.currentTarget as HTMLSpanElement;
                    const cleanedWord = cleanWordForLookup(word);
                    
                    // Check if clicking the same word that's already open
                    if (popup && popup.word === cleanedWord && popup.sentence === sentence) {
                      // Close the popup for the same word
                      setPopup(null);
                      removeWordPopupHighlightStyle(wordPopupWordSpan.current);
                      wordPopupWordSpan.current = null;
                      wordPopupWordSentenceSpan.current = null;
                      return;
                    }
                    
                    // Remove highlight from previous span
                    if (lastWordPopupWordSpan.current && lastWordPopupWordSpan.current !== el) {
                      removeWordPopupHighlightStyle(lastWordPopupWordSpan.current);
                    }
                    // Set refs for popup word and sentence spans
                    wordPopupWordSpan.current = el;
                    lastWordPopupWordSpan.current = el;
                    // Find the sentence span (parentNode)
                    let sentenceSpan: HTMLElement | null = null;
                    if (el.parentElement && el.parentElement.hasAttribute('data-sentence-index')) {
                      sentenceSpan = el.parentElement as HTMLElement;
                    } else if (el.closest('[data-sentence-index]')) {
                      sentenceSpan = el.closest('[data-sentence-index]') as HTMLElement;
                    }
                    wordPopupWordSentenceSpan.current = sentenceSpan;
                    // Log them
                    console.log('wordPopupWordSpan', wordPopupWordSpan.current);
                    console.log('wordPopupWordSentenceSpan', wordPopupWordSentenceSpan.current);
                    // Apply highlight style
                    applyWordPopupHighlightStyle(wordPopupWordSpan.current);
                    showPopup(cleanedWord, sentence, el.getBoundingClientRect());
                  }}
                >
                  {word + (isPunctuation ? '' : (wIdx < words.length - 1 ? ' ' : ''))}
                </span>
              );
            })}
          </span>
        );
      })}
      {/* Popup for word/sentence */}
      {popup && (
        <WordPopup
          word={popup.word}
          sentence={popup.sentence}
          x={popup.x}
          y={popup.y}
          position={popup.position}
          align={popup.align}
          onClose={() => {
            removeWordPopupHighlightStyle(wordPopupWordSpan.current);
            wordPopupWordSpan.current = null;
            wordPopupWordSentenceSpan.current = null;
            setPopup(null);
          }}
          wordStatus={getWordStatus(popup.word) || 'unknown'}
          onWordStatusChange={(word, newStatus) => {
            // Only allow word status changes when highlighting is enabled
            if (enableHighlightWords) {
              updateWordStatus(word, newStatus);
            }
          }}
          readerFont={readerFont}
          // Ensure these are always non-undefined strings
          nativeLanguage={readerSettings.nativeLanguage || 'en'}
          targetLanguage={readerSettings.targetLanguage || 'es'}
          dictionaryCollection={readerSettings.dictionary || 'none'}
          defaultTab={readerSettings.wordPopupDefaultTab || 'word-explain'}
        />
      )}
    </div>
  );
} 