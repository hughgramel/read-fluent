import React from 'react';
import { FaRegClone } from 'react-icons/fa';

export default function ReviewPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center theme-bg px-4 py-12" style={{ fontFamily: 'var(--font-family)' }}>
      <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
        {/* Review Box */}
        <div className="w-full flex flex-col items-center mb-12">
          <div
            className="rounded-3xl shadow-xl flex flex-col items-center justify-center py-12 px-8 w-full"
            style={{
              background: 'var(--card-background, #fff)',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.08)',
              minHeight: 220,
              position: 'relative',
            }}
          >
            <FaRegClone size={48} style={{ color: 'var(--primary-color, #7b2ff2)', marginBottom: 16 }} />
            <h1 className="text-4xl font-extrabold mb-4" style={{ color: 'var(--primary-color, #7b2ff2)', letterSpacing: 1 }}>Review</h1>
            <button
              className="mt-2 px-10 py-4 rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform"
              style={{
                background: 'var(--primary-color, #7b2ff2)',
                color: 'var(--button-text-color, white)',
                boxShadow: '0 2px 8px 0 rgba(31, 38, 135, 0.10)',
                border: 'none',
                outline: 'none',
                marginTop: 8,
              }}
            >
              Start Review
            </button>
          </div>
        </div>
        {/* Decks List */}
        <div className="w-full flex flex-col gap-6">
          {[1,2,3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-6 rounded-2xl shadow-lg p-6 theme-bg hover:scale-[1.025] transition-transform cursor-pointer"
              style={{
                background: 'var(--card-background, #fff)',
                boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.08)',
                border: '1.5px solid var(--primary-color, #7b2ff2)',
                minHeight: 90,
              }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 60,
                  height: 60,
                  background: 'var(--primary-color, #7b2ff2)',
                  color: 'var(--button-text-color, white)',
                  fontSize: 32,
                  boxShadow: '0 2px 8px 0 rgba(31, 38, 135, 0.10)',
                }}
              >
                <FaRegClone />
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="font-bold text-xl theme-text mb-1" style={{ letterSpacing: 0.5 }}>Deck {i}</div>
                <div className="theme-text-secondary text-base">0 cards to review</div>
              </div>
              <button
                className="rounded-full px-6 py-2 font-semibold text-base shadow-md hover:scale-105 transition-transform"
                style={{
                  background: 'var(--primary-color, #7b2ff2)',
                  color: 'var(--button-text-color, white)',
                  border: 'none',
                  outline: 'none',
                }}
              >
                Review
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 