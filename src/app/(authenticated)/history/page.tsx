'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ReadingSessionService, ReadingSession } from '@/services/readingSessionService';
import { getBooks } from '@/services/epubService';
import { FiTrash2 } from 'react-icons/fi';

export default function SavedPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookTitles, setBookTitles] = useState<{ [key: string]: string }>({});
  const [tab, setTab] = useState<'sessions' | 'statistics'>('sessions');

  useEffect(() => {
    if (!user) {
      router.push('/signin');
    } else {
      loadSessions();
    }
  }, [user, router]);

  const loadSessions = async () => {
    if (!user?.uid) return;
    try {
      const userSessions = await ReadingSessionService.getUserSessions(user.uid);
      setSessions(userSessions);

      // Get book titles
      const books = await getBooks(user.uid);
      const titles: { [key: string]: string } = {};
      books.forEach(book => {
        titles[book.bookId] = book.title;
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

  // Helper to aggregate words read per week/month
  function aggregateWordsByPeriod(sessions: ReadingSession[], period: 'week' | 'month'): Record<string, number> {
    const map: Record<string, number> = {};
    sessions.forEach((session: ReadingSession & { type?: string }) => {
      if (session.type === 'book-complete') return;
      const date = new Date(session.timestamp);
      let key: string;
      if (period === 'week') {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay());
        key = d.toISOString().slice(0, 10);
      } else if (period === 'month') key = date.toISOString().slice(0, 7);
      else key = date.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + session.wordCount;
    });
    return map;
  }

  // Helper to count books completed
  function countBooksCompleted(sessions: (ReadingSession & { type?: string })[]): number {
    return sessions.filter(s => s.type === 'book-complete').length;
  }

  // Helper to get total words read
  function getTotalWordsRead(sessions: (ReadingSession & { type?: string })[]): number {
    return sessions.filter(s => s.type !== 'book-complete').reduce((sum, s) => sum + s.wordCount, 0);
  }

  // Add a simple bar chart for words read per day
  function WordsReadChart({ sessions, period }: { sessions: ReadingSession[]; period: 'day' | 'week' | 'month' }) {
    const data = aggregateWordsByPeriod(sessions, period as 'week' | 'month');
    const keys = Object.keys(data).sort();
    const max = Math.max(...Object.values(data), 1);
    return (
      <div className="my-8">
        <div className="font-bold mb-2 text-[#232946]">Words Read per {period.charAt(0).toUpperCase() + period.slice(1)}</div>
        <div className="flex items-end gap-1 h-32 border-b border-gray-200">
          {keys.map(key => (
            <div key={key} className="flex flex-col items-center" style={{ width: 18 }}>
              <div style={{ height: `${(data[key] / max) * 100}%` }} className="bg-blue-400 w-3 rounded-t" />
              <div className="text-[10px] text-gray-400 mt-1 rotate-45" style={{ width: 32 }}>{key.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center pt-16">
        <div className="text-[#0B1423] text-xl [font-family:var(--font-mplus-rounded)]">
          Loading...
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-16">
        <div className="text-[#0B1423] text-xl [font-family:var(--font-mplus-rounded)]">
          Loading reading history...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col gap-8">
        <div className="w-full">
          <div className="mb-6">
            <h1 className="text-4xl font-extrabold text-[#222] tracking-tight" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em' }}>
              Reading History
            </h1>
            <div className="flex gap-6 border-b border-gray-200 pt-4">
              <button
                className={`px-4 py-2 font-semibold rounded-t-lg border-b-2 transition-colors duration-150 bg-transparent ${tab === 'sessions' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-blue-500'}`}
                onClick={() => setTab('sessions')}
              >
                Sessions
              </button>
              <button
                className={`px-4 py-2 font-semibold rounded-t-lg border-b-2 transition-colors duration-150 bg-transparent ${tab === 'statistics' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-blue-500'}`}
                onClick={() => setTab('statistics')}
              >
                Statistics
              </button>
            </div>
          </div>
          {tab === 'sessions' ? (
            <>
              {sessions.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No reading sessions yet. Start reading a book to track your progress!
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-500 transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-lg text-[#232946] truncate">
                            {bookTitles[session.bookId] || 'Unknown Book'}
                          </h3>
                          <p className="text-gray-600 mt-1 truncate">{session.sectionTitle}</p>
                        </div>
                        <div className="flex flex-col sm:items-end sm:text-right mt-2 sm:mt-0">
                          <div className="text-sm text-gray-500 whitespace-nowrap">
                            {session.timestamp.toLocaleDateString()} at {session.timestamp.toLocaleTimeString()}
                          </div>
                          <div className="text-lg font-semibold text-blue-600 mt-1 whitespace-nowrap">
                            {session.wordCount.toLocaleString()} words
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSession(session)}
                        className="ml-4 text-gray-400 hover:text-red-500 transition-colors p-2 rounded flex-shrink-0 self-center"
                        title="Delete session"
                        style={{ alignSelf: 'center' }}
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            // Statistics tab
            <div className="max-w-xl mx-auto mt-8 text-center text-2xl text-gray-500 font-semibold">
              Coming soon
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 