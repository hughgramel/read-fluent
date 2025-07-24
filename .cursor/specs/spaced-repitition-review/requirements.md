# Requirements Document

## Introduction

This feature implements a spaced repetition review system that allows users to create, organize, and review flashcards using an intelligent scheduling algorithm. The system supports different card types including basic cards and sentence cards, with Firebase-based persistence and CRUD operations. The review algorithm uses stages and intervals to optimize learning retention through spaced repetition methodology.

## Requirements

### Requirement 1

**User Story:** As a language learner, I want to create flashcards with front and back content using a popup interface, so that I can quickly add study materials without leaving the review page.

#### Acceptance Criteria

1. WHEN a user clicks the card creation button THEN the system SHALL display a popup modal in the center of the screen with input fields for front and back content
2. WHEN a user submits a valid card THEN the system SHALL save the card to Firebase with a unique identifier and close the popup
3. WHEN a user creates a card THEN the system SHALL initialize the card as a "new" card with appropriate scheduling
4. WHEN a user clicks outside the popup or presses escape THEN the system SHALL close the popup without saving
5. IF the user leaves required fields empty THEN the system SHALL display validation errors within the popup and prevent submission

### Requirement 2

**User Story:** As a language learner, I want to create sentence cards with additional context fields, so that I can study language in meaningful contexts.

#### Acceptance Criteria

1. WHEN a user selects sentence card type THEN the system SHALL display fields for Front, Translation, and Back
2. WHEN a user creates a sentence card THEN the system SHALL inherit all base Card properties and behaviors
3. WHEN a sentence card is saved THEN the system SHALL store all three fields (Front, Translation, Back) in Firebase
4. IF any required sentence card field is empty THEN the system SHALL prevent submission and show appropriate error messages

### Requirement 3

**User Story:** As a language learner, I want to organize my cards into decks, so that I can group related content and study specific topics.

#### Acceptance Criteria

1. WHEN a user creates a new deck THEN the system SHALL allow naming the deck and saving it to Firebase
2. WHEN a user assigns cards to a deck THEN the system SHALL maintain the relationship between cards and decks
3. WHEN a user views their decks THEN the system SHALL display all created decks with card counts
4. WHEN a user deletes a deck THEN the system SHALL handle the relationship with contained cards appropriately

### Requirement 4

**User Story:** As a language learner, I want to review cards using spaced repetition with a structured session flow, so that I can optimize my learning retention over time.

#### Acceptance Criteria

1. WHEN a user starts a review session THEN the system SHALL present cards according to the deck's study order setting (reviews first by default)
2. WHEN reviewing a card THEN the system SHALL display the appropriate card count ("n reviews left" or "m new cards left") in the top right corner
3. WHEN a user views a card THEN the system SHALL show the front content in the center, allowing space key or click to reveal the back
4. WHEN a user answers a review card correctly THEN the system SHALL increment the stage toward -1, calculate new due date, and decrement remaining count
5. WHEN a user answers a review card incorrectly THEN the system SHALL reset stage toward -7, set relearning = true, and insert the card at a random position in the current queue
6. WHEN study order is "Reviews first" AND all review cards are completed THEN the system SHALL proceed to new card batches
7. WHEN study order is "New cards first" AND all new card batches are completed THEN the system SHALL proceed to review cards
8. WHEN the system schedules the next review THEN it SHALL calculate intervals, find dates with fewest scheduled items, and set next_review accordingly

### Requirement 5

**User Story:** As a language learner, I want full CRUD operations on my cards, so that I can manage my study materials effectively.

#### Acceptance Criteria

1. WHEN a user requests to view a card THEN the system SHALL retrieve and display the card from Firebase
2. WHEN a user updates a card THEN the system SHALL save the changes to Firebase and maintain review scheduling data
3. WHEN a user deletes a card THEN the system SHALL remove it from Firebase and update any deck relationships
4. WHEN a user searches for cards THEN the system SHALL provide filtering and search capabilities
5. IF a Firebase operation fails THEN the system SHALL handle errors gracefully and inform the user

### Requirement 6

**User Story:** As a language learner, I want a comprehensive review interface on the review page, so that I can study efficiently with clear options and progress tracking.

#### Acceptance Criteria

1. WHEN a user navigates to /review THEN the system SHALL display a "Study All" button in the center showing the count of cards due today
2. WHEN a user clicks "Study All" THEN the system SHALL start a review session with all due cards (including new cards up to daily limit)
3. WHEN a user accesses the review page THEN the system SHALL display a settings button to configure review preferences
4. WHEN a user has no cards due for review THEN the system SHALL show next review times and encourage card creation
5. WHEN the daily new card limit is reached THEN the system SHALL not present additional new cards until the next day
6. WHEN the review page is implemented THEN it SHALL be located at `app/(authenticated)/review/page.tsx` following the Next.js app router structure
7. WHEN the review page is styled THEN it SHALL use the current minimalist, solid color design system with CSS variables including `var(--primary-color)`, `var(--background)`, `var(--text-color)`, `var(--secondary-text-color)`, `var(--border-color)`, and theme utility classes like `theme-bg`, `theme-text`, `theme-primary`, `card-themed-primary`, `card-themed-accent`, and `btn-primary`

### Requirement 7

**User Story:** As a language learner, I want comprehensive configurable review settings per deck, so that I can customize my learning experience for different types of content and study preferences.

#### Acceptance Criteria

1. WHEN a user opens deck settings THEN the system SHALL display options for new cards per day (default: 20)
2. WHEN a user opens deck settings THEN the system SHALL display options for cards per batch (default: 5)
3. WHEN a user opens deck settings THEN the system SHALL display study order options: "Reviews first" or "New cards first" (default: Reviews first)
4. WHEN a user opens deck settings THEN the system SHALL display passes until graduating option (default: 3)
5. WHEN a user changes deck settings THEN the system SHALL save preferences to Firebase per deck and apply them immediately
6. WHEN the system processes cards THEN it SHALL use the specific deck's settings for that deck's cards
7. WHEN a user studies multiple decks THEN each deck SHALL follow its own configured settings
8. WHEN a new day begins THEN the system SHALL reset new card counters per deck according to each deck's daily limit

### Requirement 8

**User Story:** As a language learner, I want new cards presented in manageable batches with graduation tracking, so that I can learn new material effectively without being overwhelmed.

#### Acceptance Criteria

1. WHEN new card phase begins THEN the system SHALL present cards in batches according to the deck's "cards per batch" setting
2. WHEN a user answers a new card correctly THEN the system SHALL increment its correct count and place it randomly within the next j positions in the queue
3. WHEN a new card reaches the deck's "passes until graduating" threshold THEN the system SHALL graduate it to review status and add a new card to maintain batch size
4. WHEN a user answers a new card incorrectly THEN the system SHALL reset its correct count to 0
5. WHEN a batch is completed (all cards graduated) THEN the system SHALL start the next batch according to deck settings
6. WHEN the deck's daily new card limit is reached THEN new card batches for that deck SHALL not appear until the next day
7. WHEN calculating cards due for study THEN the system SHALL include both review cards (next_review <= today OR relearning = true) AND new cards (up to each deck's daily limit)

### Requirement 9

**User Story:** As a developer, I want a comprehensive card service, so that I can easily integrate card operations throughout the application.

#### Acceptance Criteria

1. WHEN the card service is called for any CRUD operation THEN it SHALL provide consistent Firebase integration
2. WHEN the service handles spaced repetition logic THEN it SHALL implement the stage-based algorithm correctly
3. WHEN the service schedules reviews THEN it SHALL distribute items evenly across available dates
4. WHEN the service manages new cards THEN it SHALL track graduation progress and daily limits
5. WHEN other parts of the application need card functionality THEN they SHALL be able to import and use the service easily
6. IF the service encounters errors THEN it SHALL provide meaningful error messages and handle failures gracefully