import React from 'react';
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
  savedSentencesSet: Set<string>;
  onSentenceClick: (sentence: string, sentenceIndex: number) => void;
  onSentenceHover: (sentenceIndex: number | null) => void;
  onCopyText: () => void;
  showCopyConfirm: boolean;
  enableHighlightWords: boolean;
  getWordStatus: (word: string) => WordType | undefined;
  hoveredWord: string | null;
  onWordHover: (word: string | null) => void;
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
  savedSentencesSet,
  onSentenceClick,
  onSentenceHover,
  onCopyText,
  showCopyConfirm,
  enableHighlightWords,
  getWordStatus,
  hoveredWord,
  onWordHover,
}: ReaderContentProps) {
  return (
    <div style={{ 
      fontFamily: readerFont, 
      fontSize: readerFontSize, 
      maxWidth: readerWidth, 
      width: '100%', 
      color: invisibleText ? 'rgba(0,0,0,0.01)' : '#232946', 
      lineHeight: lineSpacing 
    }}>
      {disableSentenceSpans ? (
        <div>{flatSentences.join(' ') + ' '}</div>
      ) : (
        flatSentences.map((sentence, sIdx) => {
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
              onClick={() => onSentenceClick(sentence, sIdx)}
              onMouseEnter={highlightSentenceOnHover ? () => onSentenceHover(sIdx) : undefined}
              onMouseLeave={highlightSentenceOnHover ? () => onSentenceHover(null) : undefined}
            >
              {disableWordSpans
                ? sentence + ' '
                : words.map((word, wIdx) => {
                    const isWordHighlighted = isSentenceHighlighted && wIdx === activeWordIndex && !disableWordHighlighting;
                    const wordStatus = enableHighlightWords ? getWordStatus(word) : undefined;
                    const isHovered = hoveredWord === cleanWord(word);
                    
                    // Insert clipboard button before the first word of the first sentence on mobile
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
                            className={isWordHighlighted ? 'speaking-highlight-word' : ''}
                            style={{
                              marginRight: 4,
                              color: showCurrentSentence
                                ? '#232946'
                                : (invisibleText
                                    ? (showCurrentWordWhenInvisible && isWordHighlighted
                                        ? '#232946'
                                        : 'rgba(0,0,0,0.001)')
                                    : undefined),
                              borderBottom: enableHighlightWords ? getWordUnderline(wordStatus, isHovered) : undefined,
                              cursor: enableHighlightWords ? 'pointer' : 'default',
                            }}
                            onMouseEnter={() => enableHighlightWords && onWordHover(word)}
                            onMouseLeave={() => enableHighlightWords && onWordHover(null)}
                          >
                            {word + ' '}
                          </span>
                        </React.Fragment>
                      );
                    }
                    return (
                      <span
                        key={wIdx}
                        className={isWordHighlighted ? 'speaking-highlight-word' : ''}
                        style={{
                          marginRight: 4,
                          color: showCurrentSentence
                            ? '#232946'
                            : (invisibleText
                                ? (showCurrentWordWhenInvisible && isWordHighlighted
                                    ? '#232946'
                                    : 'rgba(0,0,0,0.001)')
                                : undefined),
                          borderBottom: enableHighlightWords ? getWordUnderline(wordStatus, isHovered) : undefined,
                          cursor: enableHighlightWords ? 'pointer' : 'default',
                        }}
                        onMouseEnter={() => enableHighlightWords && onWordHover(word)}
                        onMouseLeave={() => enableHighlightWords && onWordHover(null)}
                      >
                        {word + ' '}
                      </span>
                    );
                  })}
            </span>
          );
        })
      )}
    </div>
  );
} 