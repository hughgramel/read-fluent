import React, { useState } from 'react';
import { BookOpen, MessageSquare, Languages, Bookmark, X, Eye, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { WordType } from './ReaderTypes';

interface WordPopupProps {
  word: string;
  sentence: string;
  x: number;
  y: number;
  position: 'above' | 'below';
  align: 'left' | 'right';
  onClose?: () => void;
  wordStatus?: WordType;
  onWordStatusChange?: (word: string, newStatus: WordType) => void;
}

export function WordPopup({ word, sentence, x, y, position, align, onClose, wordStatus = 'unknown', onWordStatusChange }: WordPopupProps) {
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const [placeholderText, setPlaceholderText] = useState('');

  // Detect mobile screen
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640;

  // Clean word for display (remove punctuation)
  const cleanWordForDisplay = (word: string) => {
    return word.replace(/[.,!?;:]|["'\)\]}]/g, '');
  };

  const displayWord = cleanWordForDisplay(word);

  const handlePopupClick = (e: React.MouseEvent) => {
    // Prevent clicks on the popup from bubbling up to the container
    e.stopPropagation();
  };

  const handleWordStatusToggle = () => {
    if (!onWordStatusChange) return;
    
    // Cycle through statuses: unknown -> known -> tracking -> ignored -> unknown
    const statusCycle: WordType[] = ['unknown', 'known', 'tracking', 'ignored'];
    const currentIndex = statusCycle.indexOf(wordStatus);
    const nextIndex = (currentIndex + 1) % statusCycle.length;
    const newStatus = statusCycle[nextIndex];
    
    onWordStatusChange(displayWord, newStatus);
  };

  const getStatusConfig = (status: WordType) => {
    switch (status) {
      case 'known':
        return {
          label: 'Known',
          color: '#10b981', // green
          bgColor: '#10b981',
          icon: CheckCircle,
        };
      case 'tracking':
        return {
          label: 'Tracking',
          color: '#3b82f6', // blue
          bgColor: '#3b82f6',
          icon: Eye,
        };
      case 'ignored':
        return {
          label: 'Ignored',
          color: '#6b7280', // gray
          bgColor: '#6b7280',
          icon: XCircle,
        };
      case 'unknown':
      default:
        return {
          label: 'Unknown',
          color: '#f59e0b', // amber
          bgColor: '#f59e0b',
          icon: HelpCircle,
        };
    }
  };

  const statusConfig = getStatusConfig(wordStatus);
  const StatusIcon = statusConfig.icon;

  const handleButtonClick = (action: string) => {
    setShowPlaceholder(true);
    switch (action) {
      case 'definition':
        setPlaceholderText('Loading word definition...');
        break;
      case 'explain':
        setPlaceholderText('Loading sentence explanation...');
        break;
      case 'translate':
        setPlaceholderText('Loading translation...');
        break;
      case 'sentence':
        setShowPlaceholder(false);
        setPlaceholderText('');
        break;
    }
  };

  return (
    <div
      data-popup="word-popup"
      style={{
        position: 'fixed',
        left: align === 'left' ? x : undefined,
        right: align === 'right' ? (window.innerWidth - x) : undefined,
        top: position === 'below' ? y : undefined,
        bottom: position === 'above' ? window.innerHeight - y : undefined,
        zIndex: 9999,
        background: 'white',
        color: '#232946',
        border: '1px solid #888',
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        padding: isMobile ? '8px 12px' : '12px 16px',
        fontSize: 16,
        width: isMobile ? Math.min(350, window.innerWidth - 32) : 400,
        height: isMobile ? 220 : 255,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        // Mobile-specific positioning adjustments
        ...(isMobile && {
          left: 16,
          right: 16,
          top: position === 'below' ? y : undefined,
          bottom: position === 'above' ? window.innerHeight - y : undefined,
        }),
      }}
      onClick={handlePopupClick}
    >
      {/* Word and close button row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{displayWord}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => {
              // TODO: Implement save sentence functionality
              console.log('Save sentence:', sentence);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Save sentence"
          >
            <Bookmark size={16} color="#666" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close"
            >
              <X size={16} color="#666" />
            </button>
          )}
        </div>
      </div>

      {/* Action buttons row - circular and smaller, positioned below word */}
      <div style={{ display: 'flex', gap: isMobile ? 4 : 6, flexShrink: 0, marginBottom: isMobile ? 6 : 8, justifyContent: 'flex-start' }}>
        <button
          onClick={() => handleButtonClick('definition')}
          style={{
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '50%',
            padding: isMobile ? '6px' : '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#495057',
            width: isMobile ? '28px' : '32px',
            height: isMobile ? '28px' : '32px',
          }}
          title="Show word definition"
        >
          <BookOpen size={isMobile ? 12 : 14} />
        </button>
        <button
          onClick={() => handleButtonClick('explain')}
          style={{
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '50%',
            padding: isMobile ? '6px' : '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#495057',
            width: isMobile ? '28px' : '32px',
            height: isMobile ? '28px' : '32px',
          }}
          title="Explain sentence"
        >
          <MessageSquare size={isMobile ? 12 : 14} />
        </button>
        <button
          onClick={() => handleButtonClick('translate')}
          style={{
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '50%',
            padding: isMobile ? '6px' : '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#495057',
            width: isMobile ? '28px' : '32px',
            height: isMobile ? '28px' : '32px',
          }}
          title="Translate sentence"
        >
          <Languages size={isMobile ? 12 : 14} />
        </button>
        <button
          onClick={() => handleButtonClick('sentence')}
          style={{
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '50%',
            padding: isMobile ? '6px' : '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#495057',
            width: isMobile ? '28px' : '32px',
            height: isMobile ? '28px' : '32px',
          }}
          title="See sentence"
        >
          <Eye size={isMobile ? 12 : 14} />
        </button>
      </div>

      {/* Sentence text - scrollable */}
      <div style={{ 
        fontSize: isMobile ? 13 : 14, 
        color: '#444', 
        lineHeight: 1.4,
        flex: 1,
        overflowY: 'auto',
        minHeight: 0,
        maxHeight: isMobile ? '120px' : '140px'
      }}>
        {showPlaceholder ? placeholderText : sentence}
      </div>

      {/* Word status indicator - bottom right */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: isMobile ? 6 : 8, 
        flexShrink: 0 
      }}>
        <div style={{ fontSize: isMobile ? 11 : 12, color: '#666' }}>{displayWord}</div>
        <button
          onClick={handleWordStatusToggle}
          style={{
            background: statusConfig.bgColor,
            border: 'none',
            borderRadius: 6,
            padding: isMobile ? '4px 8px' : '6px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 3 : 4,
            color: 'white',
            fontSize: isMobile ? 11 : 12,
            fontWeight: 'bold',
            transition: 'opacity 0.2s',
          }}
          title={`Click to change status (currently: ${statusConfig.label})`}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          <StatusIcon size={isMobile ? 10 : 12} />
          {statusConfig.label}
        </button>
      </div>

    </div>
  );
} 