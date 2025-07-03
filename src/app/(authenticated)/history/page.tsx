'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ReadingSessionService, ReadingSession } from '@/services/readingSessionService';
import { getBooks } from '@/services/epubService';
import { FiTrash2 } from 'react-icons/fi';

export default function HistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookTitles, setBookTitles] = useState<{ [key: string]: string }>({});
  const [sortColumn, setSortColumn] = useState<'timestamp' | 'book' | 'wordCount'>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [mergeRows, setMergeRows] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('history-merge-rows') === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (!user) {
      router.push('/signin');
    } else {
      loadSessions();
    }
  }, [user, router]);

  useEffect(() => {
    localStorage.setItem('history-merge-rows', String(mergeRows));
  }, [mergeRows]);

  const loadSessions = async () => {
    if (!user?.uid) return;
    try {
      const userSessions = await ReadingSessionService.getUserSessions(user.uid);
      setSessions(userSessions);

      // Get book titles
      const books = await getBooks(user.uid);
      const titles: { [key: string]: string } = {};
      books.forEach(book => {
        titles[book.bookId ?? ''] = book.title;
      });
      setBookTitles(titles);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (session: ReadingSession) => {
    if (!user?.uid) return;
    try {
      await ReadingSessionService.removeSession({
        userId: user.uid,
        bookId: session.bookId,
        sectionId: session.sectionId,
      });
      setSessions(prev => prev.filter(s => s.id !== session.id));
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleSort = (column: 'timestamp' | 'book' | 'wordCount') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Helper function to format date
  const formatDate = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()}-${months[date.getMonth()]}`;
  };

  // Helper to get a string key for merging: book title + date
  const getMergeKey = (session: ReadingSession) => {
    const title = bookTitles[session.bookId] || 'Unknown Book';
    const date = formatDate(session.timestamp);
    return `${title}__${date}`;
  };

  let displaySessions: any[] = [];
  if (mergeRows) {
    const merged: { [key: string]: { session: ReadingSession, wordCount: number, count: number, ids: string[] } } = {};
    sessions.forEach(session => {
      const key = getMergeKey(session);
      if (!merged[key]) {
        merged[key] = { session, wordCount: 0, count: 0, ids: [] };
      }
      merged[key].wordCount += session.wordCount;
      merged[key].count += 1;
      merged[key].ids.push(session.id);
    });
    displaySessions = Object.values(merged).map(m => ({ ...m.session, wordCount: m.wordCount, mergedIds: m.ids }));
  } else {
    displaySessions = sessions;
  }
  const sortedDisplaySessions = [...displaySessions].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;
    switch (sortColumn) {
      case 'book':
        aValue = bookTitles[a.bookId] || 'Unknown Book';
        bValue = bookTitles[b.bookId] || 'Unknown Book';
        break;
      case 'wordCount':
        aValue = a.wordCount;
        bValue = b.wordCount;
        break;
      case 'timestamp':
      default:
        aValue = a.timestamp.getTime();
        bValue = b.timestamp.getTime();
        break;
    }
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    } else {
      return sortDirection === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
    }
  });

  // Calculate statistics
  const totalWords = sessions.reduce((sum, session) => sum + session.wordCount, 0);
  const totalSessions = sessions.length;
  const averageWordsPerSession = totalSessions > 0 ? Math.round(totalWords / totalSessions) : 0;

  if (!user) {
    return (
      <div className="flex items-center justify-center pt-16">
        <div className="text-[#232946] text-xl font-semibold">
          Loading...
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-16">
        <div className="text-[#232946] text-xl font-semibold">
          Loading reading history...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#232946] mb-2">Reading History</h1>
        <div className="flex gap-8 text-sm text-gray-600 items-center">
          <span><strong>{totalSessions}</strong> sessions</span>
          <span><strong>{totalWords.toLocaleString()}</strong> total words</span>
          <span><strong>{averageWordsPerSession.toLocaleString()}</strong> avg words/session</span>
          <label className="flex items-center gap-2 ml-2 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={mergeRows}
              onChange={e => setMergeRows(e.target.checked)}
              className="accent-[#2563eb] h-4 w-4 border-2 border-gray-300 rounded"
            />
            Merge sessions
          </label>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-lg mb-2">No reading sessions yet</div>
          <div className="text-sm">Start reading a book to track your progress!</div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            {/* Table Header */}
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-base font-semibold text-gray-700">
                <th className="py-2 px-3 border-r border-gray-200 text-center w-16">#</th>
                <th 
                  className="py-2 px-3 border-r border-gray-200 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('book')}
                  style={{ width: '35%' }}
                >
                  <div className="flex items-center gap-2">
                    Book Title
                    {sortColumn === 'book' && (
                      <span className="text-sm">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="py-2 px-3 border-r border-gray-200 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('timestamp')}
                  style={{ width: '15%' }}
                >
                  <div className="flex items-center gap-2">
                    Date
                    {sortColumn === 'timestamp' && (
                      <span className="text-sm">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="py-2 px-3 border-r border-gray-200 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('wordCount')}
                  style={{ width: '15%' }}
                >
                  <div className="flex items-center gap-2">
                    Words
                    {sortColumn === 'wordCount' && (
                      <span className="text-sm">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="py-2 px-3 border-r border-gray-200 text-left" style={{ width: '15%' }}>Time (min)</th>
                <th className="py-2 px-3 text-center" style={{ width: '10%' }}></th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-gray-200">
              {sortedDisplaySessions.map((session, index) => (
                <tr
                  key={session.id || (session.mergedIds ? session.mergedIds.join('-') : undefined)}
                  className="text-base hover:bg-gray-50 transition-colors select-text"
                  style={{ userSelect: 'text' }}
                >
                  {/* Row Number */}
                  <td className="py-2 px-3 border-r border-gray-200 text-center text-gray-500 font-mono whitespace-nowrap">
                    {index + 1}
                  </td>

                  {/* Book Title */}
                  <td className="py-2 px-3 border-r border-gray-200 whitespace-nowrap">
                    <span className="font-medium text-[#232946]">
                      {bookTitles[session.bookId] || 'Unknown Book'}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="py-2 px-3 border-r border-gray-200 whitespace-nowrap">
                    <span className="text-gray-700">
                      {formatDate(session.timestamp)}
                    </span>
                  </td>

                  {/* Word Count */}
                  <td className="py-2 px-3 border-r border-gray-200 whitespace-nowrap">
                    <span className="font-medium text-black">
                      {session.wordCount.toLocaleString()}
                    </span>
                  </td>

                  {/* Time (minutes) - empty for now */}
                  <td className="py-2 px-3 border-r border-gray-200 whitespace-nowrap">
                    <span className="text-gray-500">
                      —
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-2 px-3 text-center whitespace-nowrap">
                    <button
                      onClick={() => handleDeleteSession(session)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                      title="Delete session"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 