'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserService } from '@/services/userService';
import Link from 'next/link';
import { ReadingSessionService } from '@/services/readingSessionService';
import ThemeSettings from '@/components/ThemeSettings';
import { use } from 'react';

type DictionaryConfig = { name: string; collection: string };

// Helper to format the date
const formatJoinDate = (date: Date | undefined): string => {
  if (!date) return 'Unknown';
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: 'Mandarin Chinese' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'ar', name: 'Arabic' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ru', name: 'Russian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ur', name: 'Urdu' },
  { code: 'ja', name: 'Japanese' },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingGames, setLoadingGames] = useState(true);
  const [userAchievements, setUserAchievements] = useState<{ id: string; unlockedAt: Date }[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(true);
  const [language, setLanguage] = useState<string | null>(null);
  const [languageLoaded, setLanguageLoaded] = useState(false);
  const [stats, setStats] = useState({ booksCompleted: 0, wordsRead: 0, wordsKnown: 0 });
  const [nativeLanguage, setNativeLanguage] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('reader-native-language') || 'en';
    }
    return 'en';
  });
  const [totalWordsRead, setTotalWordsRead] = useState(0);
  const [booksCompleted, setBooksCompleted] = useState(0);
  const [dictionaries, setDictionaries] = useState<DictionaryConfig[]>([]);
  const [dictionary, setDictionary] = useState<string>('none');
  const [dictionaryLoaded, setDictionaryLoaded] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/signin');
    } catch (err) {
      console.error("Logout failed:", err);
      setError("Failed to sign out. Please try again.");
    }
  };

  // Load available dictionaries
  useEffect(() => {
    fetch('/dictionaries.json')
      .then(res => res.json())
      .then(setDictionaries)
      .catch(() => setDictionaries([{ name: 'No dictionary', collection: 'none' }]));
  }, []);

  useEffect(() => {
    if (user) {
      UserService.getUserPreferences(user.uid).then(prefs => {
        if (prefs?.language) setLanguage(prefs.language);
        else setLanguage('en');
        if (prefs?.dictionary) setDictionary(prefs.dictionary);
        else setDictionary('none');
        setLanguageLoaded(true);
        setDictionaryLoaded(true);
      });
      setStats({ booksCompleted: 5, wordsRead: 12345, wordsKnown: 678 });
    }
  }, [user]);

  useEffect(() => {
    if (user?.uid) {
      ReadingSessionService.getUserSessions(user.uid).then(sessions => {
        let words = 0;
        let books = 0;
        sessions.forEach((s: typeof sessions[number] & { type?: string }) => {
          if (s.type === 'book-complete') books++;
          else words += s.wordCount;
        });
        setTotalWordsRead(words);
        setBooksCompleted(books);
      });
    }
  }, [user]);

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    setLanguage(lang);
    if (user) await UserService.updateUserPreferences(user.uid, { targetLanguage: lang });
  };

  const handleDictionaryChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dict = e.target.value;
    setDictionary(dict);
    if (user) await UserService.updateUserPreferences(user.uid, { dictionary: dict });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center pt-16">
        <div className="theme-text text-xl font-semibold">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-8" style={{ fontFamily: 'var(--font-family)' }}>
      <div className="flex flex-col gap-8">
        <div className="w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold theme-text tracking-tight mb-2" style={{ letterSpacing: '-0.01em', fontWeight: 800, lineHeight: 1.1 }}>
              {user.displayName || 'User'}
            </h1>
            <p className="text-sm theme-text-secondary">
              Joined {formatJoinDate(user.createdAt)}
            </p>
          </div>
          
          <section className="mb-8">
            <h2 className="text-xl font-bold theme-primary tracking-tight mb-6" style={{ letterSpacing: '-0.01em', fontWeight: 700 }}>Settings</h2>
            
            <div className="mb-6 flex items-center gap-4">
              <label className="font-semibold theme-text">Dictionary:</label>
              {!dictionaryLoaded ? (
                <span className="theme-text-secondary">Loading...</span>
              ) : (
                <select
                  className="select-themed font-semibold"
                  value={dictionary}
                  onChange={handleDictionaryChange}
                  style={{ minWidth: 220 }}
                >
                  {dictionaries.map(d => <option key={d.collection} value={d.collection}>{d.name}</option>)}
                </select>
              )}
            </div>
            <div className="mb-6 flex items-center gap-4">
              <label className="font-semibold theme-text">Native Language:</label>
              {!languageLoaded ? (
                <span className="theme-text-secondary">Loading...</span>
              ) : (
                <select
                  className="select-themed font-semibold"
                  value={nativeLanguage}
                  onChange={async (e) => {
                    setNativeLanguage(e.target.value);
                    localStorage.setItem('reader-native-language', e.target.value);
                    if (user) await UserService.updateUserPreferences(user.uid, { nativeLanguage: e.target.value });
                  }}
                  style={{ minWidth: 160 }}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                  <option value="ru">Russian</option>
                  <option value="zh">Chinese</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="ar">Arabic</option>
                  <option value="hi">Hindi</option>
                  <option value="tr">Turkish</option>
                  <option value="pl">Polish</option>
                  <option value="nl">Dutch</option>
                  <option value="sv">Swedish</option>
                  <option value="fi">Finnish</option>
                  <option value="no">Norwegian</option>
                  <option value="da">Danish</option>
                  <option value="el">Greek</option>
                  <option value="he">Hebrew</option>
                  <option value="cs">Czech</option>
                  <option value="hu">Hungarian</option>
                  <option value="ro">Romanian</option>
                  <option value="bg">Bulgarian</option>
                  <option value="uk">Ukrainian</option>
                  <option value="id">Indonesian</option>
                  <option value="vi">Vietnamese</option>
                  <option value="th">Thai</option>
                  <option value="ms">Malay</option>
                  <option value="fa">Persian</option>
                  <option value="ur">Urdu</option>
                  <option value="bn">Bengali</option>
                  <option value="ta">Tamil</option>
                  <option value="te">Telugu</option>
                  <option value="ml">Malayalam</option>
                  <option value="mr">Marathi</option>
                  <option value="gu">Gujarati</option>
                  <option value="pa">Punjabi</option>
                  <option value="kn">Kannada</option>
                  <option value="or">Odia</option>
                  <option value="as">Assamese</option>
                  <option value="my">Burmese</option>
                  <option value="km">Khmer</option>
                  <option value="lo">Lao</option>
                  <option value="th">Thai</option>
                  <option value="vi">Vietnamese</option>
                  <option value="id">Indonesian</option>
                  <option value="ms">Malay</option>
                  <option value="jv">Javanese</option>
                  <option value="su">Sundanese</option>
                  <option value="tl">Tagalog</option>
                  <option value="ceb">Cebuano</option>
                  <option value="ilo">Iloko</option>
                  <option value="war">Waray-Waray</option>
                  <option value="pam">Pampanga</option>
                </select>
              )}
            </div>
            <div className="mb-6 flex items-center gap-4">
              <label className="font-semibold theme-text">Target Language:</label>
              {!languageLoaded ? (
                <span className="theme-text-secondary">Loading...</span>
              ) : (
                <select
                  className="select-themed font-semibold"
                  value={language || 'en'}
                  onChange={handleLanguageChange}
                  style={{ minWidth: 160 }}
                >
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
              )}
            </div>
           
          </section>


          {/* Theme Settings Section */}
          <section className="mb-8">
            <ThemeSettings />
          </section>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <Link
              href="/profile/manage"
              className="btn-primary"
            >
              Manage Account
            </Link>
            <button
              onClick={handleLogout}
              className="btn-primary"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
