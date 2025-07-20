import React, { useState } from 'react';
import { BookOpen, MessageSquare, Languages, Bookmark, X, Eye } from 'lucide-react';

interface WordPopupProps {
  word: string;
  sentence: string;
  x: number;
  y: number;
  position: 'above' | 'below';
  align: 'left' | 'right';
  onClose?: () => void;
}

export function WordPopup({ word, sentence, x, y, position, align, onClose }: WordPopupProps) {
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const [placeholderText, setPlaceholderText] = useState('');

  const handlePopupClick = (e: React.MouseEvent) => {
    // Prevent clicks on the popup from bubbling up to the container
    e.stopPropagation();
  };

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
        padding: '12px 16px',
        fontSize: 16,
        width: 400,
        height: 255,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={handlePopupClick}
    >
      {/* Word and close button row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{word}</div>
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
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginBottom: 8, justifyContent: 'flex-start' }}>
        <button
          onClick={() => handleButtonClick('definition')}
          style={{
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '50%',
            padding: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#495057',
            width: '32px',
            height: '32px',
          }}
          title="Show word definition"
        >
          <BookOpen size={14} />
        </button>
        <button
          onClick={() => handleButtonClick('explain')}
          style={{
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '50%',
            padding: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#495057',
            width: '32px',
            height: '32px',
          }}
          title="Explain sentence"
        >
          <MessageSquare size={14} />
        </button>
        <button
          onClick={() => handleButtonClick('translate')}
          style={{
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '50%',
            padding: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#495057',
            width: '32px',
            height: '32px',
          }}
          title="Translate sentence"
        >
          <Languages size={14} />
        </button>
        <button
          onClick={() => handleButtonClick('sentence')}
          style={{
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '50%',
            padding: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#495057',
            width: '32px',
            height: '32px',
          }}
          title="See sentence"
        >
          <Eye size={14} />
        </button>
      </div>

      {/* Sentence text - scrollable */}
      <div style={{ 
        fontSize: 14, 
        color: '#444', 
        lineHeight: 1.4,
        flex: 1,
        overflowY: 'auto',
        minHeight: 0,
        maxHeight: '140px'
      }}>
        {showPlaceholder ? placeholderText : sentence}
      </div>

    </div>
  );
} 