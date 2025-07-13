'use client';

import React, { useState, useEffect } from 'react';
import { WiktionaryService, WiktionaryResponse } from '@/services/wiktionaryService';
import { CheckCircle, XCircle, Loader2, RotateCcw } from 'lucide-react';

interface WordDefinitionPopupProps {
  word: string;
  position: { x: number; y: number };
  onClose: () => void;
  isVisible: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function WordDefinitionPopup({ word, position, onClose, isVisible, onMouseEnter, onMouseLeave }: WordDefinitionPopupProps) {
  const [response, setResponse] = useState<WiktionaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (isVisible && word) {
      fetchDefinition();
    }
  }, [isVisible, word]);

  const fetchDefinition = async () => {
    setIsLoading(true);
    setHasError(false);
    
    try {
      const result = await WiktionaryService.getDefinition(word);
      setResponse(result);
      setHasError(!!result.error);
    } catch (error) {
      console.error('Error fetching definition:', error);
      setHasError(true);
      setResponse(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    fetchDefinition();
  };

  if (!isVisible) return null;

  // Calculate position to keep popup on screen
  const popupWidth = 320;
  const popupHeight = 400;
  const padding = 16;
  
  let adjustedX = position.x;
  let adjustedY = position.y;
  
  // Adjust horizontal position
  if (adjustedX + popupWidth > window.innerWidth - padding) {
    adjustedX = window.innerWidth - popupWidth - padding;
  }
  if (adjustedX < padding) {
    adjustedX = padding;
  }
  
  // Adjust vertical position
  if (adjustedY + popupHeight > window.innerHeight - padding) {
    adjustedY = position.y - popupHeight - 40; // Show above the cursor
  }
  if (adjustedY < padding) {
    adjustedY = padding;
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
        style={{ background: 'transparent' }}
      />
      
      {/* Popup */}
      <div
        className="fixed z-50 card-themed shadow-2xl border-2 theme-border rounded-lg overflow-hidden"
        style={{
          left: adjustedX,
          top: adjustedY,
          width: popupWidth,
          maxHeight: popupHeight,
          background: 'var(--background)',
          borderColor: 'var(--border-color)',
          boxShadow: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)`,
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Header */}
        <div className="px-4 py-3 theme-bg-primary border-b theme-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-white">
                {word}
              </h3>
              <div className="px-2 py-1 bg-white bg-opacity-20 rounded text-xs text-white font-medium">
                {response?.definitions?.length || 0} definitions
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-h-80 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8 space-x-2">
              <Loader2 className="w-5 h-5 animate-spin theme-text-secondary" />
              <span className="theme-text-secondary">Loading definition...</span>
            </div>
          )}

          {hasError && !isLoading && (
            <div className="text-center py-8">
              <div className="text-red-500 mb-2">
                <XCircle className="w-8 h-8 mx-auto" />
              </div>
              <p className="theme-text-secondary text-sm mb-4">
                {response?.error || 'Failed to load definition'}
              </p>
              <button
                onClick={handleRetry}
                className="btn-primary px-4 py-2 rounded-md text-sm flex items-center space-x-2 mx-auto"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {!isLoading && !hasError && response && response.definitions.length > 0 && (
            <div className="space-y-4">
              {response.definitions.map((def, index) => (
                <div key={index} className="border-l-4 border-opacity-50 theme-border pl-4">
                  <div className="mb-2">
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded theme-bg-secondary theme-text">
                      {def.partOfSpeech}
                    </span>
                  </div>
                  <p className="theme-text text-sm leading-relaxed mb-2">
                    {def.definition}
                  </p>
                  {def.example && (
                    <p className="theme-text-secondary text-xs italic">
                      <span className="font-medium">Example:</span> {def.example}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {!isLoading && !hasError && response && response.definitions.length === 0 && (
            <div className="text-center py-8">
              <div className="theme-text-secondary mb-2">
                <CheckCircle className="w-8 h-8 mx-auto opacity-50" />
              </div>
              <p className="theme-text-secondary text-sm">
                No definitions found for "{word}"
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t theme-border theme-bg-secondary">
          <div className="flex items-center justify-between">
            <span className="text-xs theme-text-secondary">
              Powered by Wiktionary
            </span>
            <span className="text-xs theme-text-secondary">
              Hold word or Shift+hover to show
            </span>
          </div>
        </div>
      </div>
    </>
  );
}