import React, { useState, useEffect, useRef } from 'react';
import { Clipboard } from 'lucide-react';
import { WordType } from './ReaderTypes';
import { getWordUnderline, cleanWord } from './ReaderUtils';
import { WordPopup } from './WordPopup';

interface ReaderContentProps {
  flatSentences: string[];
  readerFont: string;
  readerFontSize: number;
  readerWidth: number;
  lineSpacing: number;
  isMobile: boolean;
  invisibleText: boolean;
  disableSentenceSpans: boolean;
  disableWordSpans: boolean;
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
  onSentenceHover: (sentenceIndex: number | null) => void;
  onCopyText: () => void;
  showCopyConfirm: boolean;
  enableHighlightWords: boolean;
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
  };
}

export function ReaderContent({
  flatSentences,
  readerFont,
  readerFontSize,
  readerWidth,
  lineSpacing,
  isMobile,
  invisibleText,
  disableSentenceSpans,
  disableWordSpans,
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
  onSentenceHover,
  onCopyText,
  showCopyConfirm,
  enableHighlightWords,
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
}: ReaderContentProps) {
  // Track which word span is hovered (by word+index)
  const [hoveredWordKey, setHoveredWordKey] = useState<string | null>(null);
  const hoveredWordInfo = useRef<{ word: string; sentence: string; rect: DOMRect | null } | null>(null);
  const [popup, setPopup] = useState<null | { word: string; sentence: string; x: number; y: number; position: 'above' | 'below'; align: 'left' | 'right' }>(null);

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

  // Function to clean word for display (remove punctuation)
  const cleanWordForDisplay = (word: string) => {
    return word.replace(/[.,!?;:]|["'\)\]}]/g, '');
  };

  // Show popup (no auto-close timeout)
  const showPopup = (word: string, sentence: string, rect: DOMRect | null) => {
    if (disableWordDefinitionPopup) return;
    if (!rect) return;
    
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
      y = rect.bottom + 6;
      // Ensure popup doesn't go off the bottom edge
      if (y + popupHeight > viewportHeight - padding) {
        y = viewportHeight - popupHeight - padding;
      }
    } else {
      y = rect.top - popupHeight - 6;
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
              const wordStatus = enableHighlightWords ? getWordStatus(cleanedWord) : undefined;
              const wordKey = getWordKey ? getWordKey(word, wIdx) : `${word}__${wIdx}`;
              const isHovered = hoveredWordKey === wordKey;
              const isActiveWord = !disableWordHighlighting && sIdx === activeSentenceIndex && wIdx === activeWordIndex;
              // Remove useRef from here
              if (isMobile && sIdx === 0 && wIdx === 0) {
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
                        console.log('Mouse ENTER word:', word, 'Key:', wordKey);
                        setHoveredWordKey(wordKey);
                        // Immediately set the hover info
                        const rect = e.currentTarget.getBoundingClientRect();
                        hoveredWordInfo.current = { word, sentence, rect };
                        if (onWordDefinitionHover) onWordDefinitionHover(word, e);
                        if (enableHighlightWords) onWordHover(word);
                      }}
                      onMouseLeave={e => {
                        if (isSentenceSelectMode || isPunctuation) return;
                        console.log('Mouse LEAVE word:', word, 'Key:', wordKey);
                        setHoveredWordKey(null);
                        hoveredWordInfo.current = null;
                        if (onWordDefinitionHover) onWordDefinitionHover(null, e);
                        if (enableHighlightWords) onWordHover(null);
                      }}
                      onClick={e => {
                        if (isSentenceSelectMode || isPunctuation) return;
                        const el = e.currentTarget as HTMLSpanElement;
                        showPopup(word, sentence, el.getBoundingClientRect());
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
                    showPopup(word, sentence, el.getBoundingClientRect());
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
          onClose={() => setPopup(null)}
          wordStatus={getWordStatus(popup.word) || 'unknown'}
          onWordStatusChange={(word, newStatus) => {
            updateWordStatus(word, newStatus);
          }}
          readerFont={readerFont}
          nativeLanguage={'en'}
          targetLanguage={'es'}
        />
      )}
    </div>
  );
} 