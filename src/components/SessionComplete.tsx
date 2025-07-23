'use client';

import React from 'react';
import { SessionStats } from '@/types/spaced-repetition';
import { FaCheck, FaTimes, FaClock, FaGraduationCap, FaRedo } from 'react-icons/fa';

interface SessionCompleteProps {
  stats: SessionStats;
  onClose: () => void;
  onStartNewSession?: () => void;
}

export function SessionComplete({ stats, onClose, onStartNewSession }: SessionCompleteProps) {
  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const totalAnswers = stats.correctAnswers + stats.incorrectAnswers;
  const accuracy = totalAnswers > 0
    ? Math.round((stats.correctAnswers / totalAnswers) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center page-container">
      <div className="absolute inset-0 bg-white bg-opacity-50" onClick={onClose}></div>

      <div className="relative w-full max-w-md mx-4">
        <div
          className="card-themed-primary p-8 text-center"
          style={{
            borderRadius: '1rem',
            boxShadow: '0 20px 60px 0 rgba(var(--primary-color-rgb), 0.2)',
          }}
        >
          {/* Completion Icon */}
          <div className="mb-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'var(--primary-color)' }}
            >
              <FaGraduationCap className="text-white text-2xl" />
            </div>
          </div>

          {/* Title */}
          <h2 className="theme-text text-2xl font-bold mb-2">
            Session Complete!
          </h2>

          <p className="theme-text-secondary mb-8">
            Great work on your study session
          </p>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {/* Total Cards */}
            <div className="text-center">
              <div className="theme-text text-2xl font-bold">
                {stats.totalCards}
              </div>
              <div className="theme-text-secondary text-sm">
                Total Cards
              </div>
            </div>

            {/* Accuracy */}
            <div className="text-center">
              <div className="theme-text text-2xl font-bold">
                {accuracy}%
              </div>
              <div className="theme-text-secondary text-sm">
                Accuracy
              </div>
            </div>

            {/* New Cards Learned */}
            <div className="text-center">
              <div className="theme-text text-2xl font-bold">
                {stats.newCardsLearned}
              </div>
              <div className="theme-text-secondary text-sm">
                New Cards
              </div>
            </div>

            {/* Reviews Completed */}
            <div className="text-center">
              <div className="theme-text text-2xl font-bold">
                {stats.reviewsCompleted}
              </div>
              <div className="theme-text-secondary text-sm">
                Reviews
              </div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaCheck className="text-green-500" />
                <span className="theme-text-secondary">Correct</span>
              </div>
              <span className="theme-text font-medium">{stats.correctAnswers}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaTimes className="text-red-500" />
                <span className="theme-text-secondary">Incorrect</span>
              </div>
              <span className="theme-text font-medium">{stats.incorrectAnswers}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaClock className="theme-text-secondary" />
                <span className="theme-text-secondary">Time Spent</span>
              </div>
              <span className="theme-text font-medium">{formatTime(stats.timeSpent)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {onStartNewSession && (
              <button
                onClick={onStartNewSession}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
                style={{
                  background: 'var(--secondary-color)',
                  color: 'white',
                }}
              >
                <FaRedo size={14} />
                <span>Study More</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="flex-1 btn-primary px-4 py-3 rounded-lg font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}