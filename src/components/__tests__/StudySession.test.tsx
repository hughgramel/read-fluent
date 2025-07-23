import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { StudySession } from '../StudySession';
import { StudySession as StudySessionService } from '@/services/studySession';
import { Card, SessionStats, StudyProgress } from '@/types/spaced-repetition';
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
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the StudySession service
vi.mock('@/services/studySession');

const mockStudySessionService = StudySessionService as any;

// Mock card data
const mockCard: Card = {
    id: 'card-1',
    deckId: 'deck-1',
    userId: 'user-1',
    front: 'Test Front',
    back: 'Test Back',
    type: 'basic',
    stage: -6,
    nextReview: new Date(),
    relearning: false,
    isNew: false,
    correctCount: 0,
    createdAt: new Date(),
    totalReviews: 0
};

const mockProgress: StudyProgress = {
    reviewsRemaining: 5,
    newCardsRemaining: 3,
    currentPhase: 'reviews',
    totalProgress: 50
};

const mockStats: SessionStats = {
    totalCards: 8,
    correctAnswers: 4,
    incorrectAnswers: 2,
    newCardsLearned: 1,
    reviewsCompleted: 3,
    timeSpent: 120000,
    decksStudied: ['deck-1']
};

describe('StudySession', () => {
    const mockOnComplete = vi.fn();
    const mockOnExit = vi.fn();
    const userId = 'test-user';

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock StudySession service instance
        const mockInstance = {
            getNextCard: vi.fn().mockResolvedValue(mockCard),
            getStudyProgress: vi.fn().mockReturnValue(mockProgress),
            getSessionStats: vi.fn().mockReturnValue(mockStats),
            processAnswer: vi.fn().mockResolvedValue(undefined),
            isActive: vi.fn().mockReturnValue(true)
        };

        mockStudySessionService.create.mockResolvedValue(mockInstance as any);
    });

    it('renders loading state initially', () => {
        render(
            <StudySession
                userId={userId}
                onComplete={mockOnComplete}
                onExit={mockOnExit}
            />
        );

        expect(screen.getByText('Loading study session...')).toBeInTheDocument();
    });

    it('displays card front content after loading', async () => {
        render(
            <StudySession
                userId={userId}
                onComplete={mockOnComplete}
                onExit={mockOnExit}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Test Front')).toBeInTheDocument();
        });

        expect(screen.getByText('Click or press Space to reveal answer')).toBeInTheDocument();
        expect(screen.queryByText('Test Back')).not.toBeInTheDocument();
    });

    it('shows progress indicator', async () => {
        render(
            <StudySession
                userId={userId}
                onComplete={mockOnComplete}
                onExit={mockOnExit}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('5 reviews left')).toBeInTheDocument();
        });
    });

    it('reveals card back when clicked', async () => {
        render(
            <StudySession
                userId={userId}
                onComplete={mockOnComplete}
                onExit={mockOnExit}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Test Front')).toBeInTheDocument();
        });

        // Click on the card
        const card = screen.getByText('Test Front').closest('div');
        fireEvent.click(card!);

        await waitFor(() => {
            expect(screen.getByText('Test Back')).toBeInTheDocument();
        });

        expect(screen.getByText('Correct (C)')).toBeInTheDocument();
        expect(screen.getByText('Incorrect (X)')).toBeInTheDocument();
    });

    it('reveals card back when space key is pressed', async () => {
        render(
            <StudySession
                userId={userId}
                onComplete={mockOnComplete}
                onExit={mockOnExit}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Test Front')).toBeInTheDocument();
        });

        // Press space key
        fireEvent.keyDown(document, { key: ' ' });

        await waitFor(() => {
            expect(screen.getByText('Test Back')).toBeInTheDocument();
        });
    });

    it('processes correct answer when correct button is clicked', async () => {
        const mockInstance = {
            getNextCard: vi.fn()
                .mockResolvedValueOnce(mockCard)
                .mockResolvedValueOnce(null), // Second call returns null (session complete)
            getStudyProgress: vi.fn().mockReturnValue(mockProgress),
            getSessionStats: vi.fn().mockReturnValue(mockStats),
            processAnswer: vi.fn().mockResolvedValue(undefined),
            isActive: vi.fn().mockReturnValue(true)
        };

        mockStudySessionService.create.mockResolvedValue(mockInstance as any);

        render(
            <StudySession
                userId={userId}
                onComplete={mockOnComplete}
                onExit={mockOnExit}
            />
        );

        // Wait for card to load and reveal it
        await waitFor(() => {
            expect(screen.getByText('Test Front')).toBeInTheDocument();
        });

        fireEvent.keyDown(document, { key: ' ' });

        await waitFor(() => {
            expect(screen.getByText('Correct (C)')).toBeInTheDocument();
        });

        // Click correct button
        fireEvent.click(screen.getByText('Correct (C)'));

        await waitFor(() => {
            expect(mockInstance.processAnswer).toHaveBeenCalledWith('card-1', true);
        });

        // Should call onComplete when session ends
        await waitFor(() => {
            expect(mockOnComplete).toHaveBeenCalledWith(mockStats);
        });
    });

    it('processes incorrect answer when X key is pressed', async () => {
        const mockInstance = {
            getNextCard: vi.fn().mockResolvedValue(mockCard),
            getStudyProgress: vi.fn().mockReturnValue(mockProgress),
            getSessionStats: vi.fn().mockReturnValue(mockStats),
            processAnswer: vi.fn().mockResolvedValue(undefined),
            isActive: vi.fn().mockReturnValue(true)
        };

        mockStudySessionService.create.mockResolvedValue(mockInstance as any);

        render(
            <StudySession
                userId={userId}
                onComplete={mockOnComplete}
                onExit={mockOnExit}
            />
        );

        // Wait for card to load and reveal it
        await waitFor(() => {
            expect(screen.getByText('Test Front')).toBeInTheDocument();
        });

        fireEvent.keyDown(document, { key: ' ' });

        await waitFor(() => {
            expect(screen.getByText('Test Back')).toBeInTheDocument();
        });

        // Press X key
        fireEvent.keyDown(document, { key: 'x' });

        await waitFor(() => {
            expect(mockInstance.processAnswer).toHaveBeenCalledWith('card-1', false);
        });
    });

    it('calls onExit when escape key is pressed', async () => {
        render(
            <StudySession
                userId={userId}
                onComplete={mockOnComplete}
                onExit={mockOnExit}
            />
        );

        // Wait for component to load
        await waitFor(() => {
            expect(screen.getByText('Test Front')).toBeInTheDocument();
        });

        // Fire the keydown event
        fireEvent.keyDown(document, { key: 'Escape' });

        expect(mockOnExit).toHaveBeenCalled();
    });

    it('calls onExit when exit button is clicked', async () => {
        render(
            <StudySession
                userId={userId}
                onComplete={mockOnComplete}
                onExit={mockOnExit}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Exit')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Exit'));

        expect(mockOnExit).toHaveBeenCalled();
    });

    it('displays error state when session creation fails', async () => {
        mockStudySessionService.create.mockRejectedValue(new Error('Failed to create session'));

        render(
            <StudySession
                userId={userId}
                onComplete={mockOnComplete}
                onExit={mockOnExit}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Study Session Error')).toBeInTheDocument();
        });

        expect(screen.getByText('Failed to start study session. Please try again.')).toBeInTheDocument();
    });

    it('shows new cards remaining when in new-cards phase', async () => {
        const newCardProgress: StudyProgress = {
            reviewsRemaining: 0,
            newCardsRemaining: 3,
            currentPhase: 'new-cards',
            totalProgress: 75
        };

        const mockInstance = {
            getNextCard: vi.fn().mockResolvedValue(mockCard),
            getStudyProgress: vi.fn().mockReturnValue(newCardProgress),
            getSessionStats: vi.fn().mockReturnValue(mockStats),
            processAnswer: vi.fn().mockResolvedValue(undefined),
            isActive: vi.fn().mockReturnValue(true)
        };

        mockStudySessionService.create.mockResolvedValue(mockInstance as any);

        render(
            <StudySession
                userId={userId}
                onComplete={mockOnComplete}
                onExit={mockOnExit}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('3 new cards left')).toBeInTheDocument();
        });
    });
});