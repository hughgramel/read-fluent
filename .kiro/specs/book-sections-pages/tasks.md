# Implementation Plan

- [ ] 1. Extend type definitions for enhanced book structure
  - Update BookSection and Book interfaces to include optional page properties
  - Add new BookPage interface and related types
  - Ensure backward compatibility with existing type structure
  - _Requirements: 2.1, 3.1, 5.1_

- [ ] 2. Create page service for content splitting
  - [ ] 2.1 Implement core page creation service
    - Write PageService class with createPagesFromSection method
    - Implement sentence boundary detection and preservation
    - Add word count validation (150-400 range)
    - _Requirements: 1.2, 2.2, 2.3_

  - [ ] 2.2 Add content splitting algorithm
    - Implement splitContentIntoPages function with target word count
    - Handle edge cases (long sentences, short sections)
    - Ensure pages respect sentence boundaries
    - _Requirements: 2.2, 2.3_

  - [ ] 2.3 Create page creation utilities
    - Write helper functions for word counting and sentence splitting
    - Add page ID generation logic
    - Implement page content validation
    - _Requirements: 2.2, 2.3_

- [ ] 3. Enhance book upload process
  - [ ] 3.1 Add word count selector to upload UI
    - Create word count input component with 150-400 range validation
    - Add default value of 250 words per page
    - Integrate selector into existing upload modal
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 3.2 Modify processEpubFile to support page creation
    - Update processEpubFile function to accept wordsPerPage parameter
    - Integrate PageService to create pages during book processing
    - Set hasPages flag and wordsPerPage metadata on new books
    - _Requirements: 1.4, 2.1, 2.2, 5.1_

  - [ ] 3.3 Update book storage with enhanced structure
    - Modify uploadBookJson calls to include page data
    - Update saveBookMetadata to store page-related metadata
    - Ensure enhanced book structure is properly serialized
    - _Requirements: 2.1, 5.1_

- [ ] 4. Implement backward compatibility layer
  - [ ] 4.1 Add book type detection
    - Create utility to detect if book has page structure
    - Implement fallback logic for books without pages
    - Add migration helper functions (optional conversion)
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 4.2 Update book loading to handle both formats
    - Modify getBookJson and related functions to handle enhanced structure
    - Ensure existing books load without modification
    - Add graceful degradation for missing page data
    - _Requirements: 3.1, 3.2, 5.2_

- [ ] 5. Enhance reader navigation system
  - [ ] 5.1 Update ReaderTypes with page navigation state
    - Add currentPageIndex and totalPagesInSection to reader state
    - Create page navigation action types
    - Update existing navigation interfaces for page support
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 5.2 Implement page-level navigation logic
    - Update useReaderState hook to handle page navigation
    - Add nextPage, previousPage, and goToPage functions
    - Implement section-to-section page flow (end of section → next section)
    - _Requirements: 4.2, 4.3, 4.4_

  - [ ] 5.3 Create page navigation UI components
    - Add page navigation controls (previous/next page buttons)
    - Implement page indicator showing current page and total pages
    - Update existing section navigation to work with pages
    - _Requirements: 4.1, 4.2, 4.5_

- [ ] 6. Update progress tracking system
  - [ ] 6.1 Enhance reading progress data structure
    - Update ReadingProgress interface to include page information
    - Add progressType field to distinguish between section and page tracking
    - Maintain backward compatibility with existing progress data
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 6.2 Implement page-level progress tracking
    - Update progress saving logic to store current page within section
    - Modify progress restoration to handle page-level bookmarks
    - Calculate progress percentage based on total pages for paged books
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 6.3 Update reading session service for pages
    - Modify ReadingSessionService to track page-level reading sessions
    - Update session data to include page information when available
    - Ensure backward compatibility with section-only sessions
    - _Requirements: 6.1, 6.2, 5.3_

- [ ] 7. Update reader components for page display
  - [ ] 7.1 Modify ReaderContent to display pages
    - Update content rendering to show individual pages instead of full sections
    - Implement page content loading and display logic
    - Add page transition animations and smooth navigation
    - _Requirements: 4.1, 4.2, 5.2_

  - [ ] 7.2 Update ReaderHeader with page information
    - Add page number display to reader header
    - Show section and page context (e.g., "Section 2, Page 3 of 8")
    - Update progress indicators for page-based navigation
    - _Requirements: 4.5, 6.4_

  - [ ] 7.3 Enhance ReaderSidebar for page navigation
    - Add page-level navigation options to sidebar
    - Implement quick page jumping within sections
    - Update section overview to show page counts
    - _Requirements: 4.1, 4.2_

- [ ] 8. Create comprehensive test suite
  - [ ] 8.1 Write unit tests for PageService
    - Test page creation with various word counts (150, 250, 400)
    - Test sentence boundary preservation
    - Test edge cases (empty content, very long sentences, short sections)
    - _Requirements: 2.2, 2.3_

  - [ ] 8.2 Write integration tests for enhanced book processing
    - Test complete upload flow with page creation
    - Test book storage and retrieval with enhanced structure
    - Test backward compatibility with existing book format
    - _Requirements: 1.4, 2.1, 3.1, 5.1_

  - [ ] 8.3 Write tests for reader navigation
    - Test page-to-page navigation within sections
    - Test section-to-section navigation with page flow
    - Test progress tracking accuracy with page-level bookmarks
    - _Requirements: 4.2, 4.3, 4.4, 6.1, 6.2_

- [ ] 9. Update existing services for compatibility
  - [ ] 9.1 Update wordService for page-aware processing
    - Modify word processing to work with page content
    - Ensure word tracking works across page boundaries
    - Update word statistics calculation for paged books
    - _Requirements: 5.4_

  - [ ] 9.2 Update epubService for enhanced book handling
    - Modify book metadata handling to include page information
    - Update book deletion to handle enhanced structure
    - Ensure all existing epub operations work with new format
    - _Requirements: 5.1, 5.2_

- [ ] 10. Final integration and testing
  - [ ] 10.1 Integration testing with mixed book types
    - Test application with both paged and non-paged books
    - Verify seamless switching between different book formats
    - Test all existing functionality remains intact
    - _Requirements: 3.1, 3.2, 3.3, 5.2_

  - [ ] 10.2 Performance optimization and cleanup
    - Optimize page loading and navigation performance
    - Clean up any unused code or temporary implementations
    - Add error handling and user feedback improvements
    - _Requirements: 5.1, 5.2_