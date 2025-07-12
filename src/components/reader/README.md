# Reader Components

This directory contains the modular components for the reader functionality. The original monolithic reader page has been broken down into smaller, more manageable components.

## Structure

### Components

- **`ReaderHeader.tsx`** - The top navigation bar with controls for navigation, settings, and page completion
- **`ReaderSidebar.tsx`** - The section navigation sidebar showing book sections and progress
- **`ReaderContent.tsx`** - The main content area that displays the text with highlighting and interactions
- **`ReaderSettings.tsx`** - The settings modal with all reader preferences
- **`ReaderPopups.tsx`** - Floating notification popups for various actions

### Types and Utilities

- **`ReaderTypes.ts`** - TypeScript interfaces and types for all reader-related data
- **`ReaderUtils.ts`** - Utility functions for text processing, styling, and calculations
- **`index.ts`** - Barrel export file for easy importing

### Hooks

- **`useReaderState.ts`** - Custom hook managing all reader state and business logic
- **`useReaderKeyboard.ts`** - Custom hook for keyboard navigation and shortcuts

## Usage

The main reader page (`src/app/(authenticated)/reader/page.tsx`) now uses these modular components:

```tsx
import { useReaderState } from '@/hooks/useReaderState';
import { useReaderKeyboard } from '@/hooks/useReaderKeyboard';
import { ReaderHeader, ReaderSidebar, ReaderContent, ReaderSettings, ReaderPopups } from '@/components/reader';
```

## Benefits

1. **Separation of Concerns** - Each component has a single responsibility
2. **Reusability** - Components can be reused in other parts of the application
3. **Maintainability** - Easier to debug and modify individual components
4. **Testability** - Each component can be tested in isolation
5. **Readability** - The main page is now much cleaner and easier to understand

## State Management

All state is managed through the `useReaderState` hook, which provides:
- Book data and loading states
- Reading progress and navigation
- UI state (headers, sidebars, modals)
- Settings and preferences
- TTS (Text-to-Speech) state
- Interactive features (highlighting, popups)

## Keyboard Navigation

The `useReaderKeyboard` hook handles all keyboard shortcuts:
- Arrow keys for navigation
- Enter for page completion
- W key for invisible text mode
- I key for invisible text toggle
- S key for sidebar toggle
- R key for sentence repeat 