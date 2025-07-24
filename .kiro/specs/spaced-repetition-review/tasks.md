# Implementation Plan

- [x] 1. Create core data models and types
  - Define TypeScript interfaces for Card, SentenceCard, Deck, and GlobalReviewSettings
  - Create type definitions for study sessions, statistics, and error handling
  - Set up constants for stage intervals and default settings
  - _Requirements: 1.3, 2.3, 3.2, 7.1, 7.2, 7.3, 7.4_

- [x] 2. Implement CardService with Firebase integration
  - Create CardService class with CRUD operations (create, get, update, delete)
  - Implement deck-specific card queries (getCardsByDeck, getDueCards, getNewCards)
  - Add card validation and error handling with proper TypeScript types
  - Write unit tests for all CardService methods
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 9.1, 9.6_

- [x] 3. Implement DeckService with settings management
  - Create DeckService class with CRUD operations for decks
  - Implement per-deck settings management (newCardsPerDay, cardsPerBatch, graduationThreshold)
  - Add daily statistics tracking and progress monitoring
  - Write unit tests for DeckService functionality
  - _Requirements: 3.1, 3.2, 3.3, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [x] 4. Create spaced repetition algorithm engine
  - Implement ReviewEngine class with stage-based scheduling algorithm
  - Create calculateNextReviewDate function using stage intervals and load balancing
  - Implement queue management for review cards with random insertion for failed cards
  - Add new card graduation logic with correct answer tracking
  - Write comprehensive unit tests for algorithm accuracy
  - _Requirements: 4.1, 4.4, 4.5, 4.7, 4.8, 8.2, 8.3, 8.4, 9.2, 9.3_

- [x] 5. Build study session management system
  - Create StudySession class to manage card queues and session state
  - Implement buildReviewQueue to fetch and order cards according to global study order
  - Create buildNewCardBatches to handle per-deck limits and mixed batching
  - Add session progress tracking and statistics collection
  - Write integration tests for session flow
  - _Requirements: 4.1, 4.2, 4.6, 6.2, 8.1, 8.5, 8.6, 8.7_

- [x] 6. Create card creator popup component
  - Build CardCreatorPopup React component with modal functionality using current design system
  - Implement form with front/back fields for basic cards and additional translation field for sentence cards
  - Style using theme utility classes (`card-themed`, `input-themed`, `btn-primary`) and CSS variables
  - Add form validation and error handling with user-friendly messages
  - Integrate with CardService for card creation and deck assignment
  - Add keyboard shortcuts (escape to close) and click-outside-to-close behavior
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 6.7_

- [x] 7. Implement study session UI component
  - Create StudySession React component with full-screen overlay using minimalist design
  - Build card display with front/back reveal functionality (space key and click) using `card-themed-primary` styling
  - Add progress indicator showing "n reviews left" or "m new cards left" in top right with `theme-text-secondary`
  - Implement answer buttons (x for incorrect, check for correct) with `btn-primary` styling and keyboard shortcuts
  - Add session completion handling and statistics display using consistent theme colors
  - _Requirements: 4.2, 4.3, 4.4, 4.5, 6.3, 6.7_

- [x] 8. Build deck management interface
  - Create DeckCard component showing deck name, card counts, and review button using `card-themed-accent` styling
  - Implement DeckList component to display all user decks with consistent spacing and hover effects
  - Add deck creation functionality with name and description fields using `input-themed` styling
  - Create DeckSettings component for per-deck configuration using modal pattern with `card-themed` background
  - Style all components using CSS variables (`var(--primary-color)`, `var(--text-color)`) and theme utility classes
  - Integrate with DeckService for all deck operations
  - _Requirements: 3.1, 3.2, 3.3, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 6.7_

- [x] 9. Implement global settings management
  - Create GlobalSettings component for study order configuration using modal pattern with theme styling
  - Add settings persistence to Firebase with user-scoped data
  - Implement settings validation and default value handling with themed error messages
  - Create settings UI accessible from review page using consistent button and form styling
  - Style using `card-themed`, `input-themed`, `select-themed`, and `btn-primary` classes
  - _Requirements: 7.5, 7.6, 7.7, 7.8, 6.7_

- [x] 10. Create review page at app/(authenticated)/review/page.tsx
  - Create new review page component at `app/(authenticated)/review/page.tsx` following Next.js app router structure
  - Apply `page-container` class and consistent layout patterns (`marginLeft: 80, paddingTop: 24, maxWidth: 1200`)
  - Integrate StudyAll button with due card count display using `card-themed-primary` styling and `btn-primary` for buttons
  - Add card creator button that opens CardCreatorPopup modal with consistent theme styling
  - Integrate DeckList component using `card-themed-accent` for deck cards with hover effects
  - Add settings button for global configuration access using theme utility classes
  - Use CSS variables (`var(--primary-color)`, `var(--text-color)`, etc.) throughout for consistent theming
  - Implement proper state management for page interactions and component communication
  - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6, 6.7_

- [x] 11. Implement answer processing and card state updates
  - Create processCorrectAnswer function to handle stage progression and scheduling
  - Implement processIncorrectAnswer function with relearning flag and queue reinsertion
  - Add new card graduation logic when correctCount reaches threshold
  - Implement proper error handling for all answer processing operations
  - Write integration tests for answer processing flow
  - _Requirements: 4.4, 4.5, 8.2, 8.3, 8.4, 9.2_

- [x] 12. Add daily limit tracking and reset functionality
  - Implement daily statistics tracking per deck with date-based reset logic
  - Create background job or client-side logic to reset daily counters
  - Add new card limit enforcement during study session creation
  - Implement proper handling when daily limits are reached
  - Write tests for daily limit scenarios and edge cases
  - _Requirements: 7.8, 8.5, 8.6, 8.7_

- [x] 13. Create comprehensive error handling and user feedback
  - Implement CardServiceError class with proper error codes and messages
  - Add user-friendly error messages for all failure scenarios
  - Create retry logic for network failures and Firebase errors
  - Implement graceful degradation when services are unavailable
  - Add loading states and progress indicators throughout the UI
  - _Requirements: 5.5, 9.6_

- [x] 14. Write integration tests for complete study flow
  - Create end-to-end tests for deck creation, card addition, and study sessions
  - Test multi-deck scenarios with different settings and study order preferences
  - Verify new card graduation and review scheduling accuracy
  - Test daily limit enforcement and reset functionality
  - Add performance tests for large decks and concurrent operations
  - _Requirements: All requirements - comprehensive testing_

- [x] 15. Optimize performance and add caching
  - Implement client-side caching for frequently accessed deck and card data
  - Add database indexes for efficient querying (userId, deckId, nextReview, isNew)
  - Optimize card queue building for large datasets
  - Add lazy loading for deck contents and pagination where appropriate
  - Implement optimistic UI updates for better user experience
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_