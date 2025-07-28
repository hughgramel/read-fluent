import React from 'react';
import { FiCheck } from 'react-icons/fi';
import { Book } from './ReaderTypes';
import { getSectionTitle } from './ReaderUtils';

interface ReaderSidebarProps {
  book: Book;
  sectionPages: string[][][];
  currentSectionIndex: number;
  readPagesBySection: { [sectionIdx: number]: Set<number> };
  showSectionWordCount: boolean;
  onGoToPage: (sectionIdx: number, pageIdx: number) => void;
  onToggleSectionWordCount: (checked: boolean) => void;
  isMobileModal?: boolean;
}

export function ReaderSidebar({
  book,
  sectionPages,
  currentSectionIndex,
  readPagesBySection,
  showSectionWordCount,
  onGoToPage,
  onToggleSectionWordCount,
  isMobileModal = false,
}: ReaderSidebarProps) {
  
  // Function to find the last read page and go to the next page
  const goToLastReadPage = () => {
    let lastReadSection = -1;
    let lastReadPage = -1;
    
    // Find the last read page across all sections
    for (let sectionIdx = 0; sectionIdx < sectionPages.length; sectionIdx++) {
      const readPages = readPagesBySection[sectionIdx];
      if (readPages && readPages.size > 0) {
        const maxReadPage = Math.max(...Array.from(readPages));
        if (sectionIdx > lastReadSection || (sectionIdx === lastReadSection && maxReadPage > lastReadPage)) {
          lastReadSection = sectionIdx;
          lastReadPage = maxReadPage;
        }
      }
    }
    
    // If we found a read page, go to the next page
    if (lastReadSection >= 0 && lastReadPage >= 0) {
      const nextPage = lastReadPage + 1;
      const pagesInSection = sectionPages[lastReadSection]?.length || 0;
      
      if (nextPage < pagesInSection) {
        // Next page is in the same section
        onGoToPage(lastReadSection, nextPage);
      } else if (lastReadSection + 1 < sectionPages.length) {
        // Next page is in the next section
        onGoToPage(lastReadSection + 1, 0);
      }
    } else {
      // No pages read yet, go to the first page
      onGoToPage(0, 0);
    }
  };
  return (
    <div className="flex flex-col items-start" style={{ minWidth: isMobileModal ? 'auto' : 220, paddingRight: isMobileModal ? 0 : 24 }}>
      {!isMobileModal && (
        <div className="font-bold text-lg mb-2 flex items-center gap-2">
          <span>Sections</span>
          <label className="flex items-center gap-1 text-xs font-normal ml-2">
            <input
              type="checkbox"
              checked={showSectionWordCount}
              onChange={e => onToggleSectionWordCount(e.target.checked)}
              className="accent-[#2563eb] h-4 w-4 border-gray-300 rounded"
              style={{ marginRight: 4 }}
            />
            <span>Show word count</span>
          </label>
        </div>
      )}
      {book.sections.map((section, idx) => {
        const totalPages = sectionPages[idx]?.length || 0;
        const readPages = readPagesBySection[idx]?.size || 0;
        const allRead = totalPages > 0 && readPages === totalPages;
        return (
          <div key={section.id || idx} className="w-full mb-1">
            <button
              className={`w-full text-left px-4 py-2 rounded font-semibold transition-all ${idx === currentSectionIndex ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              style={{ fontWeight: idx === currentSectionIndex ? 700 : 500, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              onClick={() => onGoToPage(idx, 0)}
            >
              <span className="flex-1 min-w-0 truncate">{getSectionTitle(section, idx)}</span>
              <span className="flex items-center justify-end ml-2" style={{ minWidth: 36, maxWidth: 48 }}>
                {allRead ? (
                  <FiCheck className="text-green-500" style={{ width: 20, height: 20 }} />
                ) : totalPages > 0 ? (
                  <span className="text-green-600 font-bold" style={{ minWidth: 32, textAlign: 'right', display: 'inline-block' }}>{readPages} / {totalPages}</span>
                ) : null}
              </span>
            </button>
            {showSectionWordCount && (
              <div className="pl-4 pb-1 text-xs text-gray-400" style={{ fontSize: 12 }}>
                {section.wordCount?.toLocaleString() || 0} words
              </div>
            )}
          </div>
        );
      })}
      
      {/* Go to last page button */}
      <div className="w-full mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={goToLastReadPage}
          className="w-full text-left px-4 py-2 rounded font-semibold transition-all bg-[var(--primary-color)] text-white hover:bg-[var(--primary-color-hover)]"
          style={{ fontWeight: 500, fontSize: 14 }}
        >
          Go to last page
        </button>
      </div>
    </div>
  );
} 