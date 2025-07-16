import React from 'react';
import { BookOpen, MessageSquare, Languages, Bookmark } from 'lucide-react';

interface WordPopupProps {
  word: string;
  sentence: string;
  x: number;
  y: number;
  position: 'above' | 'below';
  align: 'left' | 'right';
}

export function WordPopup({ word, sentence, x, y, position, align }: WordPopupProps) {
  const handlePopupClick = (e: React.MouseEvent) => {
    // Prevent clicks on the popup from bubbling up to the container
    e.stopPropagation();
  };

  return (
    <div
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
        minWidth: 200,
        maxWidth: 320,
        pointerEvents: 'auto',
      }}
      onClick={handlePopupClick}
    >
      {/* Word and save button row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{word}</div>
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
      </div>

      {/* Sentence text */}
      <div style={{ fontSize: 14, color: '#444', marginBottom: 12, lineHeight: 1.4 }}>
        {sentence}
      </div>

      {/* Action buttons row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => {
            // TODO: Implement show word definition functionality
            console.log('Show word definition for:', word);
          }}
          style={{
            flex: 1,
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            color: '#495057',
          }}
          title="Show word definition"
        >
          <BookOpen size={12} />
          <span>Show word definition</span>
        </button>
        <button
          onClick={() => {
            // TODO: Implement explain sentence functionality
            console.log('Explain sentence:', sentence);
          }}
          style={{
            flex: 1,
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            color: '#495057',
          }}
          title="Explain sentence"
        >
          <MessageSquare size={12} />
          <span>Explain sentence</span>
        </button>
        <button
          onClick={() => {
            // TODO: Implement translate sentence functionality
            console.log('Translate sentence:', sentence);
          }}
          style={{
            flex: 1,
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            color: '#495057',
          }}
          title="Translate sentence"
        >
          <Languages size={12} />
          <span>Translate sentence</span>
        </button>
      </div>
    </div>
  );
} 