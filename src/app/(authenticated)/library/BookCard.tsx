import { FiTrash2, FiBarChart2, FiCheckCircle, FiArchive } from 'react-icons/fi';
import { Book, ArchivedBookCard } from './page';

export default function BookCard({ book, archived = false, openBook = () => {}, bookWordsRead = {}, comprehensionReports = {}, setComprehensionModalBook = () => {}, fetchComprehensionReport = () => {}, setDataModalBook = () => {}, toggleCompleted = () => {}, archiveBookHandler = () => {}, deleteBookHandler = () => {}, deleteArchivedBookHandler = () => {} }: {
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
}) {
  const report = comprehensionReports[book.id];
  const knownPct = report ? ((report.known / report.uniqueWords) * 100).toFixed(1) : null;
  const unknownPct = report ? ((report.unknown / report.uniqueWords) * 100).toFixed(1) : null;
  const completed = (book as Book).completed;
  const wordsRead = archived ? (book as ArchivedBookCard).wordsRead : bookWordsRead[String(book.id)] || 0;
  const progressPct = book.totalWords > 0 ? Math.min(100, (wordsRead / book.totalWords) * 100) : 0;
  return (
    <div
      className={`${archived ? 'card-themed-secondary' : 'card-themed-primary'} flex flex-col w-full aspect-[3/4] cursor-pointer transition-all duration-200 hover:shadow-lg group`}
      style={{
        fontFamily: 'var(--font-family)',
        minHeight: 'unset',
        padding: 0,
        opacity: archived ? 0.7 : 1,
        maxWidth: typeof window !== 'undefined' && window.innerWidth <= 640 ? 210 : 250,
        minWidth: typeof window !== 'undefined' && window.innerWidth <= 640 ? 150 : 180,
        height: typeof window !== 'undefined' && window.innerWidth <= 640 ? 280 : undefined,
        boxSizing: 'border-box',
      }}
      onClick={archived ? undefined : () => openBook(book as Book)}
      tabIndex={0}
      role="button"
      aria-label={`Read ${book.title}`}
    >
      <div className="flex justify-end p-2 gap-2">
        {!archived && (
          <button
            onClick={e => { e.stopPropagation(); setComprehensionModalBook(book as Book); fetchComprehensionReport(book.id); }}
            className="text-gray-300 hover:text-blue-500 text-lg p-1 rounded transition-colors active:scale-90 focus:scale-90"
            title="Comprehension Report"
            tabIndex={-1}
            style={{ background: 'none', border: 'none' }}
          >
            <FiBarChart2 className="w-5 h-5" />
          </button>
        )}
        {archived ? (
          <button
            onClick={e => { e.stopPropagation(); deleteArchivedBookHandler(book.id); }}
            className="text-gray-300 hover:text-red-500 text-lg p-1 rounded transition-colors active:scale-90 focus:scale-90"
            title="Delete archived book"
            tabIndex={-1}
            style={{ background: 'none', border: 'none' }}
          >
            <FiTrash2 className="w-5 h-5" />
          </button>
        ) : (
          <>
            <button
              onClick={e => { e.stopPropagation(); archiveBookHandler(book as Book); }}
              className="text-gray-300 hover:text-yellow-500 text-lg p-1 rounded transition-colors active:scale-90 focus:scale-90"
              title="Archive book"
              tabIndex={-1}
              style={{ background: 'none', border: 'none' }}
            >
              <FiArchive className="w-5 h-5" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); deleteBookHandler(book.id, (book as Book).storagePath); }}
              className="text-gray-300 hover:text-red-500 text-lg p-1 rounded transition-colors active:scale-90 focus:scale-90"
              title="Delete book"
              tabIndex={-1}
              style={{ background: 'none', border: 'none' }}
            >
              <FiTrash2 className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
      <div className="flex-1 flex flex-col justify-between px-6 pb-6 pt-0 gap-2">
        <h3 className="font-bold theme-text leading-tight mb-0.5 line-clamp-2 text-left" style={{ letterSpacing: '-0.01em', fontWeight: 700, fontSize: typeof window !== 'undefined' && window.innerWidth <= 640 ? 17 : 20 }}>{book.title}</h3>
        {/* Reading Progress Bar */}
        <div className="w-full mb-1">
          <div className="relative h-2.5 rounded-full bg-gray-200 overflow-hidden">
            <div className="absolute left-0 top-0 h-full transition-all" style={{ width: `${progressPct}%`, backgroundColor: 'var(--primary-color)' }} />
          </div>
          <div className="flex justify-between text-xs mt-1 theme-text-secondary">
            {/* On mobile, remove author and 'words', just show n / m */}
            {typeof window !== 'undefined' && window.innerWidth <= 640 ? (
              <>
                <span />
                <span className="text-right" style={{ fontSize: 15 }}>{(wordsRead ?? 0).toLocaleString()} / {(book.totalWords ?? 0).toLocaleString()}</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: 15 }}>{book.author}</span>
                <span className="text-right" style={{ fontSize: 15 }}>{(wordsRead ?? 0).toLocaleString()} / {(book.totalWords ?? 0).toLocaleString()} words</span>
              </>
            )}
          </div>
        </div>
        {/* Comprehension Progress Bar */}
        <div className="w-full mt-1 mb-1">
          <div className="relative h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="absolute left-0 top-0 h-full bg-[#28a745]" style={{ width: report ? `${knownPct}%` : '0%', borderRadius: '999px 0 0 999px' }} />
            <div className="absolute left-0 top-0 h-full bg-[#a0aec0]" style={{ width: report ? `${100 - Number(unknownPct)}%` : '0%', opacity: 0.3 }} />
            <div className="absolute left-0 top-0 h-full bg-[#2563eb]" style={{ width: report ? `${Number(knownPct) + (report.ignored / report.uniqueWords) * 100}%` : '0%', opacity: 0.18 }} />
          </div>
          <div className="flex justify-between text-xs mt-1 theme-text-secondary">
            {report ? (
              <>
                <span style={{ fontSize: typeof window !== 'undefined' && window.innerWidth <= 640 ? 13 : 15 }}>{knownPct}% Known</span>
                <span style={{ fontSize: typeof window !== 'undefined' && window.innerWidth <= 640 ? 13 : 15 }}>{unknownPct}% Unknown</span>
              </>
            ) : (
              <span className="italic text-gray-400" style={{ fontSize: typeof window !== 'undefined' && window.innerWidth <= 640 ? 13 : 15 }}>No report</span>
            )}
          </div>
        </div>
        {/* Actions */}
        {!archived && (
        <div className="flex gap-2 mt-2">
          <button
              onClick={e => { e.stopPropagation(); setDataModalBook(book as Book); }}
            className="flex-1 flex items-center justify-center gap-1 rounded-lg border theme-border theme-primary font-semibold transition-colors active:scale-90 focus:scale-90"
            style={{ 
              backgroundColor: 'var(--background)',
              borderColor: 'var(--primary-color)',
              color: 'var(--primary-color)',
              fontSize: typeof window !== 'undefined' && window.innerWidth <= 640 ? 18 : 16,
              padding: typeof window !== 'undefined' && window.innerWidth <= 640 ? '7px 10px' : '10px 16px'
            }}
            tabIndex={-1}
          >
            <FiBarChart2 className="w-5 h-5" />
          </button>
          <button
              onClick={e => { e.stopPropagation(); toggleCompleted(book as Book); }}
              className={`flex-1 flex items-center justify-center gap-1 rounded-lg border font-semibold transition-colors ${(book as Book).completed ? 'border-gray-300 text-gray-400 bg-gray-100' : 'theme-border theme-primary'} active:scale-90 focus:scale-90`}
              style={Object.assign(
                (book as Book).completed ? {} : { 
                  backgroundColor: 'var(--background)',
                  borderColor: 'var(--primary-color)',
                  color: 'var(--primary-color)'
                },
                { fontSize: typeof window !== 'undefined' && window.innerWidth <= 640 ? 18 : 16,
                  padding: typeof window !== 'undefined' && window.innerWidth <= 640 ? '7px 10px' : '10px 16px' }
              )}
            tabIndex={-1}
          >
            <FiCheckCircle className="w-5 h-5" />
          </button>
        </div>
        )}
      </div>
    </div>
  );
} 