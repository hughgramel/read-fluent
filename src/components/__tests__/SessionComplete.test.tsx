import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionComplete } from '../SessionComplete';
import { SessionStats } from '@/types/spaced-repetition';

const mockStats: SessionStats = {
  totalCards: 10,
  correctAnswers: 7,
  incorrectAnswers: 3,
  newCardsLearned: 2,
  reviewsCompleted: 8,
  timeSpent: 180000, // 3 minutes
  decksStudied: ['deck-1', 'deck-2']
};

import { vi } from 'vitest';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

describe('SessionComplete', () => {
  const mockOnClose = vi.fn();
  const mockOnStartNewSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders session completion message', () => {
    render(
      <SessionComplete
        stats={mockStats}
        onClose={mockOnClose}
        onStartNewSession={mockOnStartNewSession}
      />
    );

    expect(screen.getByText('Session Complete!')).toBeInTheDocument();
    expect(screen.getByText('Great work on your study session')).toBeInTheDocument();
  });

  it('displays correct statistics', () => {
    render(
      <SessionComplete
        stats={mockStats}
        onClose={mockOnClose}
        onStartNewSession={mockOnStartNewSession}
      />
    );

    // Total cards
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Total Cards')).toBeInTheDocument();

    // Accuracy (7 correct out of 10 total answers = 70%)
    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();

    // New cards learned
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('New Cards')).toBeInTheDocument();

    // Reviews completed
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Reviews')).toBeInTheDocument();

    // Detailed stats
    expect(screen.getByText('7')).toBeInTheDocument(); // Correct answers
    expect(screen.getByText('3')).toBeInTheDocument(); // Incorrect answers
    expect(screen.getByText('3m 0s')).toBeInTheDocument(); // Time spent
  });

  it('formats time correctly for seconds only', () => {
    const statsWithSeconds: SessionStats = {
      ...mockStats,
      timeSpent: 45000 // 45 seconds
    };

    render(
      <SessionComplete
        stats={statsWithSeconds}
        onClose={mockOnClose}
        onStartNewSession={mockOnStartNewSession}
      />
    );

    expect(screen.getByText('45s')).toBeInTheDocument();
  });

  it('formats time correctly for minutes and seconds', () => {
    const statsWithMinutes: SessionStats = {
      ...mockStats,
      timeSpent: 125000 // 2 minutes 5 seconds
    };

    render(
      <SessionComplete
        stats={statsWithMinutes}
        onClose={mockOnClose}
        onStartNewSession={mockOnStartNewSession}
      />
    );

    expect(screen.getByText('2m 5s')).toBeInTheDocument();
  });

  it('handles zero accuracy correctly', () => {
    const statsWithZeroAccuracy: SessionStats = {
      ...mockStats,
      correctAnswers: 0,
      incorrectAnswers: 0
    };

    render(
      <SessionComplete
        stats={statsWithZeroAccuracy}
        onClose={mockOnClose}
        onStartNewSession={mockOnStartNewSession}
      />
    );

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('calls onClose when Done button is clicked', () => {
    render(
      <SessionComplete
        stats={mockStats}
        onClose={mockOnClose}
        onStartNewSession={mockOnStartNewSession}
      />
    );

    fireEvent.click(screen.getByText('Done'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onStartNewSession when Study More button is clicked', () => {
    render(
      <SessionComplete
        stats={mockStats}
        onClose={mockOnClose}
        onStartNewSession={mockOnStartNewSession}
      />
    );

    fireEvent.click(screen.getByText('Study More'));

    expect(mockOnStartNewSession).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking outside the modal', () => {
    render(
      <SessionComplete
        stats={mockStats}
        onClose={mockOnClose}
        onStartNewSession={mockOnStartNewSession}
      />
    );

    // Click on the backdrop - find it by class
    const backdrop = document.querySelector('.bg-black.bg-opacity-50');
    fireEvent.click(backdrop as Element);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not render Study More button when onStartNewSession is not provided', () => {
    render(
      <SessionComplete
        stats={mockStats}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Study More')).not.toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('calculates accuracy correctly with perfect score', () => {
    const perfectStats: SessionStats = {
      ...mockStats,
      correctAnswers: 10,
      incorrectAnswers: 0
    };

    render(
      <SessionComplete
        stats={perfectStats}
        onClose={mockOnClose}
        onStartNewSession={mockOnStartNewSession}
      />
    );

    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});