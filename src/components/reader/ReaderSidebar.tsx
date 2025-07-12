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
}

export function ReaderSidebar({
  book,
  sectionPages,
  currentSectionIndex,
  readPagesBySection,
  showSectionWordCount,
  onGoToPage,
  onToggleSectionWordCount,
}: ReaderSidebarProps) {
  return (
    <div className="flex flex-col items-start pr-6" style={{ minWidth: 220 }}>
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
              <span>{getSectionTitle(section, idx)}</span>
              {allRead ? (
                <FiCheck className="text-green-500 ml-2" />
              ) : totalPages > 0 ? (
                <span className="ml-2 text-green-600 font-bold">{readPages} / {totalPages}</span>
              ) : null}
            </button>
            {showSectionWordCount && (
              <div className="pl-4 pb-1 text-xs text-gray-400" style={{ fontSize: 12 }}>
                {section.wordCount?.toLocaleString() || 0} words
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
} 