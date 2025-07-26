# Design Document

## Overview

This design enhances the existing book system to support a hierarchical structure of sections and pages while maintaining full backward compatibility. The system will allow users to configure word count per page during upload (150-400 words), automatically divide sections into pages based on this configuration, and provide seamless navigation between pages and sections.

The design ensures that existing books continue to work without modification while new books benefit from the enhanced page-based structure.

## Architecture

### Current System Analysis

The current system has:
- `Book` interface with `sections: BookSection[]`
- `BookSection` interface with `title`, `content`, `wordCount`, and `id`
- Books stored as JSON in Firebase Storage
- Metadata stored in Firestore
- Reading progress tracked by section index

### Enhanced Architecture

The new system will extend the current structure:

```typescript
interface BookPage {
  id: string;
  content: string;
  wordCount: number;
  pageNumber: number; // 1-based page number within section
}

interface EnhancedBookSection extends BookSection {
  pages?: BookPage[]; // Optional for backward compatibility
  wordsPerPage?: number; // Configuration used to create pages
}

interface EnhancedBook extends Book {
  sections: EnhancedBookSection[];
  wordsPerPage?: number; // Global setting for the book
  hasPages?: boolean; // Flag to indicate if book uses page structure
}
```

## Components and Interfaces

### 1. Book Upload Enhancement

**Component**: Library page upload flow
**Location**: `src/app/(authenticated)/library/page.tsx`

**Changes**:
- Add word count selector (150-400 range) to upload UI
- Modify `processEpubFile` function to accept word count parameter
- Implement page creation logic during book processing

**New UI Elements**:
```typescript
interface UploadConfig {
  wordsPerPage: number; // 150-400, default 250
}
```

### 2. Page Creation Service

**New Service**: `src/services/pageService.ts`

**Responsibilities**:
- Split section content into pages based on word count
- Maintain sentence boundaries (don't split mid-sentence)
- Handle edge cases (short sections, long sentences)

**Key Functions**:
```typescript
interface PageService {
  createPagesFromSection(section: BookSection, wordsPerPage: number): BookPage[];
  validateWordCount(count: number): boolean;
  splitContentIntoPages(content: string, targetWordsPerPage: number): string[];
}
```

### 3. Reader Navigation Enhancement

**Component**: Reader components
**Location**: `src/components/reader/`, `src/hooks/useReaderState.ts`

**Changes**:
- Extend navigation to handle page-level movement
- Add page indicators and controls
- Maintain section-to-section navigation flow

**New Navigation State**:
```typescript
interface PagedReaderState {
  currentSectionIndex: number;
  currentPageIndex: number; // New: page within current section
  totalPagesInSection: number; // New: for progress display
}
```

### 4. Progress Tracking Enhancement

**Service**: Reading session and progress tracking
**Location**: `src/services/readingSessionService.ts`, `src/hooks/useReaderState.ts`

**Changes**:
- Track page-level progress in addition to section progress
- Maintain backward compatibility with section-only progress
- Enhanced progress calculation for paged books

**Enhanced Progress Structure**:
```typescript
interface EnhancedReadingProgress {
  bookId: string;
  currentSection: number;
  currentPage?: number; // New: optional for backward compatibility
  lastRead: string;
  progressType: 'section' | 'page'; // New: indicates tracking method
}
```

## Data Models

### 1. Enhanced Book Structure

```typescript
interface BookPage {
  id: string; // Unique identifier: `${sectionId}-page-${pageNumber}`
  content: string; // Page content (subset of section content)
  wordCount: number; // Actual word count for this page
  pageNumber: number; // 1-based page number within section
}

interface EnhancedBookSection extends BookSection {
  // Existing properties remain unchanged
  title: string;
  content: string; // Full section content (unchanged)
  wordCount: number; // Total section word count
  id: string;
  
  // New optional properties for page support
  pages?: BookPage[]; // Array of pages within this section
  wordsPerPage?: number; // Target words per page used for this section
}

interface EnhancedBook extends Book {
  // All existing Book properties remain unchanged
  id: string;
  title: string;
  author: string;
  description: string;
  sections: EnhancedBookSection[]; // Now contains enhanced sections
  totalWords: number;
  fileName: string;
  dateAdded: string;
  css: string;
  
  // New optional properties for page support
  wordsPerPage?: number; // Global words per page setting
  hasPages?: boolean; // Flag indicating if book uses page structure
  totalPages?: number; // Total pages across all sections
}
```

### 2. Page Creation Algorithm

The page creation algorithm will:

1. **Respect sentence boundaries**: Never split a sentence across pages
2. **Target word count**: Aim for the specified words per page (±10% tolerance)
3. **Handle edge cases**: 
   - If a single sentence exceeds the word limit, it becomes its own page
   - Short sections may have fewer words per page
   - Last page of a section contains remaining content

```typescript
function createPagesFromSection(section: BookSection, wordsPerPage: number): BookPage[] {
  const sentences = splitIntoSentences(section.content);
  const pages: BookPage[] = [];
  let currentPageContent = '';
  let currentWordCount = 0;
  let pageNumber = 1;
  
  for (const sentence of sentences) {
    const sentenceWordCount = countWords(sentence);
    
    // If adding this sentence would exceed limit and we have content, create page
    if (currentWordCount + sentenceWordCount > wordsPerPage && currentPageContent) {
      pages.push(createPage(section.id, pageNumber, currentPageContent, currentWordCount));
      currentPageContent = sentence;
      currentWordCount = sentenceWordCount;
      pageNumber++;
    } else {
      currentPageContent += (currentPageContent ? ' ' : '') + sentence;
      currentWordCount += sentenceWordCount;
    }
  }
  
  // Add final page if there's remaining content
  if (currentPageContent) {
    pages.push(createPage(section.id, pageNumber, currentPageContent, currentWordCount));
  }
  
  return pages;
}
```

## Error Handling

### 1. Upload Validation

- Validate word count is within 150-400 range
- Provide clear error messages for invalid inputs
- Fallback to default (250) if no selection made

### 2. Page Creation Errors

- Handle sections with no content gracefully
- Manage extremely long sentences that exceed word limits
- Ensure at least one page is created per section

### 3. Backward Compatibility

- Detect books without page structure and handle appropriately
- Graceful degradation when page data is missing or corrupted
- Maintain existing functionality for non-paged books

## Testing Strategy

### 1. Unit Tests

**Page Service Tests**:
- Test page creation with various word counts
- Test sentence boundary preservation
- Test edge cases (empty sections, very long sentences)
- Test word count validation

**Book Processing Tests**:
- Test enhanced book creation with page structure
- Test backward compatibility with existing book format
- Test upload configuration handling

### 2. Integration Tests

**Reader Navigation Tests**:
- Test page-to-page navigation within sections
- Test section-to-section navigation with pages
- Test progress tracking accuracy
- Test backward compatibility with existing books

**Storage Tests**:
- Test enhanced book JSON storage and retrieval
- Test metadata updates with page information
- Test migration scenarios

### 3. User Experience Tests

**Upload Flow Tests**:
- Test word count selector functionality
- Test book processing with different word count settings
- Test error handling and user feedback

**Reading Experience Tests**:
- Test page navigation responsiveness
- Test progress display accuracy
- Test bookmark and resume functionality

## Implementation Phases

### Phase 1: Core Infrastructure
- Extend type definitions
- Create page service
- Implement page creation algorithm
- Add upload configuration UI

### Phase 2: Reader Integration
- Enhance reader navigation
- Update progress tracking
- Implement page-level bookmarking
- Add page indicators

### Phase 3: Backward Compatibility
- Ensure existing books continue working
- Add migration utilities (optional)
- Comprehensive testing with mixed book types

### Phase 4: Polish and Optimization
- Performance optimization for large books
- Enhanced error handling
- User experience improvements
- Documentation updates