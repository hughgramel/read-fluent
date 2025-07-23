# Design Document

## Overview

The spaced repetition review system is a comprehensive flashcard learning platform that implements an intelligent scheduling algorithm to optimize learning retention. The system supports multiple card types, deck organization, and configurable study parameters. Built on Firebase with TypeScript/React, it integrates seamlessly with the existing application architecture.

The core algorithm uses stages (-7 to -1) with predefined intervals, load balancing across dates, and separate handling of new cards versus review cards. The system supports per-deck customization for learning parameters while maintaining global settings for study preferences.

## Architecture

### High-Level Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Review Page   │────│  Card Service   │────│   Firebase      │
│   (UI Layer)    │    │  (Business)     │    │   (Storage)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────│ Review Engine   │──────────────┘
                        │  (Algorithm)    │
                        └─────────────────┘
```

### Data Flow

1. **Study Session Initiation**: User clicks "Study All" → System fetches due cards from all decks → Applies global study order preference
2. **Card Presentation**: Review Engine manages card queue → UI displays cards with progress tracking
3. **Answer Processing**: User response → Algorithm updates card state → Firebase persistence → Queue management
4. **Session Completion**: All cards processed → Statistics updated → Next review times calculated

## Components and Interfaces

### Core Data Models

#### Card Interface
```typescript
interface Card {
  id: string;
  deckId: string;
  userId: string;
  front: string;
  back: string;
  type: 'basic' | 'sentence';
  
  // Review scheduling
  stage: number; // -7 to -1
  nextReview: Date;
  relearning: boolean;
  
  // New card tracking
  isNew: boolean;
  correctCount: number; // For graduation tracking
  
  // Metadata
  createdAt: Date;
  lastReviewed?: Date;
  totalReviews: number;
}
```

#### SentenceCard Interface
```typescript
interface SentenceCard extends Card {
  type: 'sentence';
  translation: string; // Additional field for sentence cards
}
```

#### Deck Interface
```typescript
interface Deck {
  id: string;
  userId: string;
  name: string;
  description?: string;
  
  // Per-deck settings
  settings: {
    newCardsPerDay: number; // default: 20
    cardsPerBatch: number; // default: 5
    graduationThreshold: number; // default: 3
  };
  
  // Daily tracking
  dailyStats: {
    date: string; // YYYY-MM-DD
    newCardsStudied: number;
    reviewsCompleted: number;
  };
  
  // Metadata
  createdAt: Date;
  lastStudied?: Date;
  totalCards: number;
}
```

#### Global Settings Interface
```typescript
interface GlobalReviewSettings {
  userId: string;
  studyOrder: 'reviews-first' | 'new-first'; // default: 'reviews-first'
  
  // Future global settings can be added here
  // e.g., keyboard shortcuts, UI preferences, etc.
}
```

### Service Layer Architecture

#### CardService
```typescript
class CardService {
  // CRUD Operations
  static async createCard(card: Omit<Card, 'id' | 'createdAt'>): Promise<string>
  static async getCard(cardId: string): Promise<Card | null>
  static async updateCard(cardId: string, updates: Partial<Card>): Promise<void>
  static async deleteCard(cardId: string): Promise<void>
  
  // Deck-specific queries
  static async getCardsByDeck(deckId: string): Promise<Card[]>
  static async getDueCards(deckId: string): Promise<Card[]>
  static async getNewCards(deckId: string, limit: number): Promise<Card[]>
  
  // Review operations
  static async processCorrectAnswer(cardId: string): Promise<void>
  static async processIncorrectAnswer(cardId: string): Promise<void>
  static async graduateNewCard(cardId: string): Promise<void>
}
```

#### DeckService
```typescript
class DeckService {
  // CRUD Operations
  static async createDeck(deck: Omit<Deck, 'id' | 'createdAt'>): Promise<string>
  static async getDeck(deckId: string): Promise<Deck | null>
  static async getUserDecks(userId: string): Promise<Deck[]>
  static async updateDeckSettings(deckId: string, settings: Partial<Deck['settings']>): Promise<void>
  static async deleteDeck(deckId: string): Promise<void>
  
  // Statistics and tracking
  static async updateDailyStats(deckId: string, stats: Partial<Deck['dailyStats']>): Promise<void>
  static async getDailyProgress(deckId: string): Promise<Deck['dailyStats']>
}
```

#### ReviewEngine
```typescript
class ReviewEngine {
  // Session management
  static async createStudySession(userId: string): Promise<StudySession>
  static async getNextCard(sessionId: string): Promise<Card | null>
  static async processAnswer(sessionId: string, cardId: string, correct: boolean): Promise<void>
  
  // Scheduling algorithm
  static calculateNextReviewDate(stage: number, deckId: string): Promise<Date>
  static getStageIntervals(stage: number): number[]
  static findOptimalReviewDate(intervals: number[], deckId: string): Promise<Date>
  
  // Queue management
  static buildReviewQueue(userId: string): Promise<Card[]>
  static buildNewCardBatches(userId: string): Promise<Card[][]>
  static shuffleCardIntoQueue(card: Card, queue: Card[], position: number): Card[]
}
```

### UI Components Architecture

#### Review Page Structure
The main review page will be implemented at `app/(authenticated)/review/page.tsx` following the Next.js app router structure for authenticated routes.

```
ReviewPage (app/(authenticated)/review/page.tsx)
├── StudyAllButton (shows total due count)
├── DeckList
│   ├── DeckCard (individual deck with stats)
│   └── DeckSettingsButton
├── CardCreatorPopup (modal)
├── StudySession (full-screen overlay)
│   ├── ProgressIndicator
│   ├── CardDisplay
│   └── AnswerButtons
└── GlobalSettingsButton
```

#### Design System and Styling
The review page will follow the current minimalist, solid color design system used throughout the application:

**CSS Variables to Use:**
- `var(--primary-color)` - Primary theme color for buttons and accents
- `var(--primary-color-hover)` - Hover state for primary elements
- `var(--background)` - Page background color
- `var(--text-color)` - Primary text color
- `var(--secondary-text-color)` - Secondary/muted text color
- `var(--border-color)` - Border colors for cards and inputs
- `var(--shadow-color)` - Shadow colors for depth
- `var(--font-family)` - Consistent font family

**Theme Utility Classes to Use:**
- `theme-bg` - Background color using CSS variables
- `theme-text` - Primary text color
- `theme-text-secondary` - Secondary text color
- `theme-primary` - Primary color for text elements
- `card-themed-primary` - Primary themed card styling
- `card-themed-accent` - Accent themed card styling
- `btn-primary` - Primary button styling
- `input-themed` - Themed input styling

**Layout Patterns:**
- Use `page-container` class for full viewport background
- Follow the margin pattern: `marginLeft: 80, paddingTop: 24, maxWidth: 1200`
- Use consistent spacing with `gap-4`, `gap-6`, `mb-6`, `mt-12` patterns
- Apply rounded corners with `rounded-2xl`, `rounded-3xl` for cards
- Use shadow patterns: `shadow-lg`, `shadow-xl` for depth
- Implement hover effects with `hover:scale-105`, `hover:scale-[1.025]` transforms

#### Component Interfaces
```typescript
interface StudySessionProps {
  userId: string;
  onComplete: (stats: SessionStats) => void;
  onExit: () => void;
}

interface CardCreatorProps {
  deckId?: string;
  isOpen: boolean;
  onClose: () => void;
  onCardCreated: (card: Card) => void;
}

interface DeckSettingsProps {
  deck: Deck;
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated: (settings: Deck['settings']) => void;
}
```

## Data Models

### Firebase Collections Structure

```
users/{userId}/
├── decks/{deckId}
│   ├── id: string
│   ├── name: string
│   ├── settings: DeckSettings
│   ├── dailyStats: DailyStats
│   └── metadata...
│
├── cards/{cardId}
│   ├── id: string
│   ├── deckId: string
│   ├── front: string
│   ├── back: string
│   ├── translation?: string (for sentence cards)
│   ├── stage: number
│   ├── nextReview: Timestamp
│   ├── relearning: boolean
│   ├── isNew: boolean
│   ├── correctCount: number
│   └── metadata...
│
└── reviewSettings
    ├── studyOrder: string
    └── other global settings...
```

### Spaced Repetition Algorithm Data

#### Stage Intervals Mapping
```typescript
const STAGE_INTERVALS = {
  "-7": [0],
  "-6": [1],
  "-5": [2, 3],
  "-4": [6, 7, 8],
  "-3": [15, 16, 17, 18],
  "-2": [37, 38, 39, 40, 41, 42],
  "-1": [94, 95, 96, 97, 98, 99, 100, 101]
};
```

#### Load Balancing Logic
For each possible interval, the system:
1. Calculates the target date (today + interval days)
2. Queries existing cards scheduled for that date within the deck
3. Selects the date with the minimum card count
4. Updates the card's nextReview field

## Error Handling

### Service Layer Error Handling
```typescript
class CardServiceError extends Error {
  constructor(
    message: string,
    public code: 'NOT_FOUND' | 'VALIDATION_ERROR' | 'FIREBASE_ERROR',
    public details?: any
  ) {
    super(message);
  }
}
```

### Error Recovery Strategies
1. **Network Failures**: Implement retry logic with exponential backoff
2. **Data Inconsistency**: Validate card states before processing answers
3. **Concurrent Updates**: Use Firebase transactions for critical operations
4. **Session Interruption**: Persist session state to allow resumption

### User-Facing Error Messages
- Card creation failures: "Unable to save card. Please try again."
- Network issues: "Connection lost. Your progress has been saved."
- Data corruption: "Card data appears corrupted. Skipping to next card."

## Testing Strategy

### Unit Testing
- **CardService**: Test CRUD operations, validation, error handling
- **ReviewEngine**: Test scheduling algorithm, queue management, answer processing
- **DeckService**: Test settings management, statistics tracking

### Integration Testing
- **Firebase Integration**: Test data persistence, query performance
- **Cross-Service Communication**: Test service interactions and data flow
- **Algorithm Accuracy**: Verify spaced repetition calculations

### Component Testing
- **Card Creator**: Test form validation, submission, modal behavior
- **Study Session**: Test card progression, answer handling, session completion
- **Settings Management**: Test per-deck and global settings persistence

### End-to-End Testing
- **Complete Study Flow**: Create deck → Add cards → Study session → Verify scheduling
- **Multi-Deck Scenarios**: Test "Study All" with multiple decks and different settings
- **New Card Graduation**: Test batch processing and graduation thresholds

### Performance Testing
- **Large Deck Handling**: Test with 1000+ cards per deck
- **Concurrent Users**: Test Firebase performance under load
- **Query Optimization**: Ensure efficient card retrieval and scheduling queries

## Security Considerations

### Data Access Control
- All operations scoped to authenticated user's data
- Firestore security rules prevent cross-user data access
- Card and deck operations validate user ownership

### Input Validation
- Sanitize card content to prevent XSS attacks
- Validate stage values and date ranges
- Limit card content length and deck sizes

### Privacy Protection
- Card content encrypted in transit (HTTPS)
- No sensitive data in client-side logs
- User data deletion compliance (GDPR)

## Performance Optimizations

### Database Queries
- Index on `userId`, `deckId`, `nextReview`, `isNew` fields
- Batch operations for multiple card updates
- Pagination for large deck listings

### Client-Side Optimizations
- Lazy loading of deck contents
- Optimistic UI updates for answer processing
- Local caching of frequently accessed data

### Algorithm Efficiency
- Pre-calculate review dates during off-peak hours
- Batch process daily statistics updates
- Optimize queue building for large card sets