import { useState, useMemo } from 'react';
import { FiTrash2, FiBarChart2, FiCheckCircle, FiArchive, FiMoreVertical, FiX } from 'react-icons/fi';
import { Book, ArchivedBookCard } from './page';

export default function BookCard({ book, archived = false, openBook = () => {}, bookWordsRead = {}, comprehensionReports = {}, setComprehensionModalBook = () => {}, fetchComprehensionReport = () => {}, setDataModalBook = () => {}, toggleCompleted = () => {}, archiveBookHandler = () => {}, deleteBookHandler = () => {}, deleteArchivedBookHandler = () => {}, isNavigatingToBook = false, isLoadingComprehensionReports = false, isLoadingSessions = false }: {
  book: Book | ArchivedBookCard;
  archived?: boolean;
  openBook?: (book: Book) => void;
  bookWordsRead?: { [key: string]: number };
  comprehensionReports?: any;
  setComprehensionModalBook?: (book: Book) => void;
  fetchComprehensionReport?: (bookId: string) => void;
  setDataModalBook?: (book: Book) => void;
  toggleCompleted?: (book: Book) => void;
  archiveBookHandler?: (book: Book) => void;
  deleteBookHandler?: (bookId: string, storagePath?: string) => void;
  deleteArchivedBookHandler?: (archivedId: string) => void;
  isNavigatingToBook?: boolean;
  isLoadingComprehensionReports?: boolean;
  isLoadingSessions?: boolean;
}) {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Memoized calculations
  const { report, knownPct, unknownPct, completed, wordsRead, progressPct } = useMemo(() => {
    const report = comprehensionReports[book.id];
    const knownPct = report ? ((report.known / report.uniqueWords) * 100).toFixed(1) : null;
    const unknownPct = report ? ((report.unknown / report.uniqueWords) * 100).toFixed(1) : null;
    const completed = (book as Book).completed;
    const wordsRead = archived ? (book as ArchivedBookCard).wordsRead : bookWordsRead[String(book.id)] || 0;
    const progressPct = book.totalWords > 0 ? Math.min(100, (wordsRead / book.totalWords) * 100) : 0;
    
    return {
      report,
      knownPct,
      unknownPct,
      completed,
      wordsRead,
      progressPct
    };
  }, [comprehensionReports, book.id, book.totalWords, archived, bookWordsRead, book]);

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSettingsModal(true);
  };

  const handleModalClose = () => {
    setShowSettingsModal(false);
  };

  const handleModalBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowSettingsModal(false);
    }
  };

  const handleArchiveClick = () => {
    setShowSettingsModal(false);
    setShowArchiveConfirm(true);
  };

  const handleDeleteClick = () => {
    setShowSettingsModal(false);
    setShowDeleteConfirm(true);
  };

  const handleArchiveConfirm = () => {
    archiveBookHandler(book as Book);
    setShowArchiveConfirm(false);
  };

  const handleDeleteConfirm = () => {
    deleteBookHandler(book.id, (book as Book).storagePath);
    setShowDeleteConfirm(false);
  };

  const handleConfirmModalBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowArchiveConfirm(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
    <div
      className={`${archived ? 'card-themed-secondary' : 'card-themed-primary'} flex flex-col w-full aspect-[3/4] cursor-pointer transition-all duration-200 hover:shadow-lg group relative`}
      style={{
        fontFamily: 'var(--font-family)',
        minHeight: 'unset',
        padding: 0,
        opacity: archived ? 0.7 : isNavigatingToBook ? 0.5 : 1,
        maxWidth: '250px',
        minWidth: '180px',
        boxSizing: 'border-box',
        pointerEvents: isNavigatingToBook ? 'none' : 'auto',
      }}
      onClick={archived || isNavigatingToBook ? undefined : () => openBook(book as Book)}
      tabIndex={0}
      role="button"
      aria-label={`Read ${book.title}`}
    >
      {/* Loading overlay when navigating */}
      {isNavigatingToBook && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg z-10">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'var(--primary-color)' }}></div>
        </div>
      )}
        <div className="flex justify-end p-2">
        {!archived && (
            <button
              onClick={handleSettingsClick}
              className="text-gray-300 hover:text-gray-600 text-lg p-1 rounded transition-colors active:scale-90 focus:scale-90"
              title="Book settings"
              tabIndex={-1}
              style={{ background: 'none', border: 'none' }}
            >
              <FiMoreVertical className="w-5 h-5" />
            </button>
          )}
          {archived && (
            <button
              onClick={e => { e.stopPropagation(); deleteArchivedBookHandler(book.id); }}
              className="text-gray-300 hover:text-red-500 text-lg p-1 rounded transition-colors active:scale-90 focus:scale-90"
              title="Delete archived book"
              tabIndex={-1}
              style={{ background: 'none', border: 'none' }}
            >
              <FiTrash2 className="w-5 h-5" />
            </button>
        )}
      </div>
      <div className="flex-1 flex flex-col justify-between px-6 pb-6 pt-0 gap-2">
        <h3 className="font-bold theme-text leading-tight mb-0.5 line-clamp-2 text-left text-lg sm:text-xl" style={{ letterSpacing: '-0.01em', fontWeight: 700 }}>{book.title}</h3>
        {/* Reading Progress Bar */}
        <div className="w-full mb-1">
          <div className="relative h-2.5 rounded-full bg-gray-200 overflow-hidden">
            {isLoadingSessions ? (
              <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse"></div>
            ) : (
              <div className="absolute left-0 top-0 h-full transition-all" style={{ width: `${progressPct}%`, backgroundColor: 'var(--primary-color)' }} />
            )}
          </div>
          <div className="flex justify-between text-xs mt-1 theme-text-secondary">
            {/* Mobile: just show n / m, Desktop: show author and words */}
            <span className="hidden sm:inline" style={{ fontSize: 15 }}>{book.author}</span>
            {isLoadingSessions ? (
              <span className="text-right animate-pulse" style={{ fontSize: 15 }}>Loading...</span>
            ) : (
              <span className="text-right" style={{ fontSize: 15 }}>{(wordsRead ?? 0).toLocaleString()} / {(book.totalWords ?? 0).toLocaleString()}<span className="hidden sm:inline"> words</span></span>
            )}
          </div>
        </div>
        {/* Comprehension Progress Bar */}
        <div className="w-full mt-1 mb-1">
          <div className="relative h-2.5 rounded-full bg-gray-100 overflow-hidden">
            {isLoadingComprehensionReports && !report ? (
              <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse"></div>
            ) : (
              <>
                <div className="absolute left-0 top-0 h-full bg-[#28a745]" style={{ width: report ? `${knownPct}%` : '0%', borderRadius: '999px 0 0 999px' }} />
                <div className="absolute left-0 top-0 h-full bg-[#a0aec0]" style={{ width: report ? `${100 - Number(unknownPct)}%` : '0%', opacity: 0.3 }} />
                <div className="absolute left-0 top-0 h-full bg-[#2563eb]" style={{ width: report ? `${Number(knownPct) + (report.ignored / report.uniqueWords) * 100}%` : '0%', opacity: 0.18 }} />
              </>
            )}
          </div>
          <div className="flex justify-between text-xs mt-1 theme-text-secondary">
            {isLoadingComprehensionReports && !report ? (
              <span className="text-sm sm:text-base animate-pulse">Loading...</span>
            ) : report ? (
              <>
                <span className="text-sm sm:text-base">{knownPct}% Known</span>
                <span className="text-sm sm:text-base">{unknownPct}% Unknown</span>
              </>
            ) : (
              <span className="italic text-gray-400 text-sm sm:text-base">No report</span>
            )}
          </div>
        </div>
          {/* Empty space to maintain card size */}
        <div className="flex gap-2 mt-2">
            <div className="flex-1 h-10 sm:h-11"></div>
            <div className="flex-1 h-10 sm:h-11"></div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={handleModalBackdropClick}
        >
          <div 
            className="relative rounded-lg shadow-xl max-w-sm w-full mx-4"
            style={{ 
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-color)',
              fontFamily: 'var(--font-family)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="text-lg font-semibold theme-text">Book Settings</h3>
              <button
                onClick={handleModalClose}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                style={{ color: 'var(--text-color)' }}
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <button
                onClick={() => {
                  setComprehensionModalBook(book as Book);
                  fetchComprehensionReport(book.id);
                  handleModalClose();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-gray-50"
                style={{ 
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-color)'
                }}
              >
                <FiBarChart2 className="w-5 h-5" style={{ color: 'var(--primary-color)' }} />
                <span>Analyze Comprehension</span>
              </button>

              <button
                onClick={() => {
                  toggleCompleted(book as Book);
                  handleModalClose();
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  (book as Book).completed 
                    ? 'bg-gray-50 border-gray-200 text-gray-600' 
                    : 'hover:bg-gray-50'
                }`}
                style={{ 
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-color)'
                }}
              >
                <FiCheckCircle className="w-5 h-5" style={{ color: (book as Book).completed ? '#6b7280' : 'var(--primary-color)' }} />
                <span>{(book as Book).completed ? 'Mark as Incomplete' : 'Mark as Complete'}</span>
              </button>

              <button
                onClick={handleArchiveClick}
                className="w-full flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-gray-50"
                style={{ 
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-color)'
                }}
          >
                <FiArchive className="w-5 h-5" style={{ color: 'var(--primary-color)' }} />
                <span>Archive Book</span>
          </button>

          <button
                onClick={handleDeleteClick}
                className="w-full flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-red-50 hover:border-red-200"
                style={{ 
                  borderColor: 'var(--border-color)',
                  color: '#dc2626'
                }}
              >
                <FiTrash2 className="w-5 h-5" />
                <span>Delete Book</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={handleConfirmModalBackdropClick}
        >
          <div 
            className="relative rounded-lg shadow-xl max-w-sm w-full mx-4"
            style={{
                  backgroundColor: 'var(--background)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-color)',
              fontFamily: 'var(--font-family)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 theme-text">Archive Book</h3>
              <p className="text-sm mb-6 theme-text-secondary">
                Are you sure you want to archive "{book.title}"? This will move it to your archived books and remove it from your active library.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowArchiveConfirm(false)}
                  className="flex-1 px-4 py-2 rounded-lg border transition-colors"
                  style={{ 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-color)',
                    backgroundColor: 'var(--background)'
                  }}
          >
                  Cancel
                </button>
                <button
                  onClick={handleArchiveConfirm}
                  className="flex-1 px-4 py-2 rounded-lg font-semibold transition-colors"
                  style={{ 
                    backgroundColor: 'var(--primary-color)',
                    color: 'white'
                  }}
                >
                  Archive
          </button>
              </div>
            </div>
          </div>
        </div>
        )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={handleConfirmModalBackdropClick}
        >
          <div 
            className="relative rounded-lg shadow-xl max-w-sm w-full mx-4"
            style={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-color)',
              fontFamily: 'var(--font-family)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 theme-text">Delete Book</h3>
              <p className="text-sm mb-6 theme-text-secondary">
                Are you sure you want to delete "{book.title}"? This action cannot be undone and will permanently remove the book from your library.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 rounded-lg border transition-colors"
                  style={{ 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-color)',
                    backgroundColor: 'var(--background)'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2 rounded-lg font-semibold transition-colors"
                  style={{ 
                    backgroundColor: '#dc2626',
                    color: 'white'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
      </div>
    </div>
      )}
    </>
  );
} 