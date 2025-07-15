import React, { useState, useEffect, useRef } from 'react';
import { Clipboard } from 'lucide-react';
import { WordType } from './ReaderTypes';
import { getWordUnderline, cleanWord } from './ReaderUtils';

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
  hoveredWord: string | null;
  onWordHover: (word: string | null) => void;
  onWordDefinitionHover?: (word: string | null, event?: React.MouseEvent) => void;
  onWordDefinitionLongPress?: (word: string, event: React.MouseEvent) => void;
  onWordDefinitionMouseUp?: () => void;
  getWordKey?: (word: string, idx: number) => string;
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
  hoveredWord,
  onWordHover,
  onWordDefinitionHover,
  onWordDefinitionLongPress,
  onWordDefinitionMouseUp,
  getWordKey,
}: ReaderContentProps) {
  // Track which word span is hovered (by word+index)
  const [hoveredWordKey, setHoveredWordKey] = useState<string | null>(null);
  const hoveredWordInfo = useRef<{ word: string; sentence: string; rect: DOMRect | null } | null>(null);
  const [popup, setPopup] = useState<null | { word: string; sentence: string; x: number; y: number; position: 'above' | 'below'; align: 'left' | 'right' }>(null);
  const popupTimeout = useRef<NodeJS.Timeout | null>(null);

  // Show popup for 2 seconds
  const showPopup = (word: string, sentence: string, rect: DOMRect | null) => {
    if (!rect) return;
    // Calculate position: above or below depending on space
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const spaceAbove = rect.top;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceLeft = rect.left;
    const spaceRight = viewportWidth - rect.right;
    const position = spaceBelow > spaceAbove ? 'below' : 'above';
    // Decide horizontal alignment: left or right
    const align = spaceRight > spaceLeft ? 'left' : 'right';
    // For left: popup's left edge aligns with word's left edge
    // For right: popup's right edge aligns with word's right edge
    const x = align === 'left' ? rect.left : rect.right;
    const y = position === 'below' ? rect.bottom + 6 : rect.top - 6;
    setPopup({ word, sentence, x, y, position, align });
    if (popupTimeout.current) clearTimeout(popupTimeout.current);
    popupTimeout.current = setTimeout(() => setPopup(null), 2000);
  };

  useEffect(() => {
    const handleShiftClick = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && hoveredWordKey && hoveredWordInfo.current) {
        showPopup(hoveredWordInfo.current.word, hoveredWordInfo.current.sentence, hoveredWordInfo.current.rect);
      }
    };
    window.addEventListener('keydown', handleShiftClick);
    return () => {
      window.removeEventListener('keydown', handleShiftClick);
      if (popupTimeout.current) clearTimeout(popupTimeout.current);
    };
  }, [hoveredWordKey]);

  // Hide popup on mouse leave
  const handleMouseLeave = () => {
    setHoveredWordKey(null);
    hoveredWordInfo.current = null;
    setPopup(null);
  };

  return (
    <div style={{ 
      fontFamily: readerFont, 
      fontSize: readerFontSize, 
      maxWidth: readerWidth, 
      width: '100%', 
      color: invisibleText ? 'rgba(0,0,0,0.01)' : '#232946', 
      lineHeight: lineSpacing 
    }}>
      {flatSentences.map((sentence, sIdx) => {
        const words = sentence.match(/\S+/g) || [];
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
              const wordStatus = enableHighlightWords ? getWordStatus(word) : undefined;
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
                      ref={el => {
                        if (isHovered && el) {
                          hoveredWordInfo.current = { word, sentence, rect: el.getBoundingClientRect() };
                        } else if (!isHovered) {
                          // Only clear if this is the hovered word
                          if (hoveredWordInfo.current && hoveredWordInfo.current.word === word && hoveredWordInfo.current.sentence === sentence) {
                            hoveredWordInfo.current = null;
                          }
                        }
                      }}
                      style={{
                        marginRight: 4,
                        color: isActiveWord ? '#232946' : (showCurrentSentence
                          ? '#232946'
                          : (invisibleText
                              ? (showCurrentWordWhenInvisible
                                  ? '#232946'
                                  : 'rgba(0,0,0,0.001)')
                              : undefined)),
                        background: isActiveWord ? '#ffe066' : undefined,
                        borderRadius: isActiveWord ? 4 : undefined,
                        fontWeight: isActiveWord ? 700 : undefined,
                        borderBottom: enableHighlightWords ? getWordUnderline(wordStatus, isHovered) : undefined,
                        cursor: enableHighlightWords ? 'pointer' : 'default',
                        transition: 'background 0.15s, color 0.15s',
                      }}
                      onMouseEnter={e => {
                        if (isSentenceSelectMode) return;
                        setHoveredWordKey(wordKey);
                        if (onWordDefinitionHover) onWordDefinitionHover(word, e);
                        if (enableHighlightWords) onWordHover(word);
                      }}
                      onMouseLeave={e => {
                        if (isSentenceSelectMode) return;
                        handleMouseLeave();
                        if (onWordDefinitionHover) onWordDefinitionHover(null, e);
                        if (enableHighlightWords) onWordHover(null);
                      }}
                      onClick={e => {
                        if (isSentenceSelectMode) return;
                        const el = e.currentTarget as HTMLSpanElement;
                        showPopup(word, sentence, el.getBoundingClientRect());
                      }}
                    >
                      {word + ' '}
                    </span>
                  </React.Fragment>
                );
              }
              return (
                <span
                  key={wIdx}
                  ref={el => {
                    if (isHovered && el) {
                      hoveredWordInfo.current = { word, sentence, rect: el.getBoundingClientRect() };
                    } else if (!isHovered) {
                      if (hoveredWordInfo.current && hoveredWordInfo.current.word === word && hoveredWordInfo.current.sentence === sentence) {
                        hoveredWordInfo.current = null;
                      }
                    }
                  }}
                  style={{
                    marginRight: 4,
                    color: isActiveWord ? '#232946' : (showCurrentSentence
                      ? '#232946'
                      : (invisibleText
                          ? (showCurrentWordWhenInvisible
                              ? '#232946'
                              : 'rgba(0,0,0,0.001)')
                          : undefined)),
                    background: isActiveWord ? '#ffe066' : undefined,
                    borderRadius: isActiveWord ? 4 : undefined,
                    fontWeight: isActiveWord ? 700 : undefined,
                    borderBottom: enableHighlightWords ? getWordUnderline(wordStatus, isHovered) : undefined,
                    cursor: enableHighlightWords ? 'pointer' : 'default',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (isSentenceSelectMode) return;
                    setHoveredWordKey(wordKey);
                    if (onWordDefinitionHover) onWordDefinitionHover(word, e);
                    if (enableHighlightWords) onWordHover(word);
                  }}
                  onMouseLeave={e => {
                    if (isSentenceSelectMode) return;
                    handleMouseLeave();
                    if (onWordDefinitionHover) onWordDefinitionHover(null, e);
                    if (enableHighlightWords) onWordHover(null);
                  }}
                  onClick={e => {
                    if (isSentenceSelectMode) return;
                    const el = e.currentTarget as HTMLSpanElement;
                    showPopup(word, sentence, el.getBoundingClientRect());
                  }}
                >
                  {word + ' '}
                </span>
              );
            })}
          </span>
        );
      })}
      {/* Popup for word/sentence */}
      {popup && (
        <div
          style={{
            position: 'fixed',
            left: popup.align === 'left' ? popup.x : undefined,
            right: popup.align === 'right' ? (window.innerWidth - popup.x) : undefined,
            top: popup.position === 'below' ? popup.y : undefined,
            bottom: popup.position === 'above' ? window.innerHeight - popup.y : undefined,
            // No horizontal transform, only vertical offset
            zIndex: 9999,
            background: 'white',
            color: '#232946',
            border: '1px solid #888',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            padding: '10px 18px',
            fontSize: 16,
            minWidth: 120,
            maxWidth: 320,
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{popup.word}</div>
          <div style={{ fontSize: 14, color: '#444' }}>{popup.sentence}</div>
        </div>
      )}
    </div>
  );
} 