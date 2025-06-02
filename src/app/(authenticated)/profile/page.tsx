'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserService } from '@/services/userService';
import Link from 'next/link';

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

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/signin');
    } catch (err) {
      console.error("Logout failed:", err);
      setError("Failed to sign out. Please try again.");
    }
  };

  useEffect(() => {
    if (user) {
      UserService.getUserPreferences(user.uid).then(prefs => {
        if (prefs?.language) setLanguage(prefs.language);
        else setLanguage('en');
        setLanguageLoaded(true);
      });
      setStats({ booksCompleted: 5, wordsRead: 12345, wordsKnown: 678 });
    }
  }, [user]);

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    setLanguage(lang);
    if (user) await UserService.updateUserPreferences(user.uid, { language: lang });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center pt-16">
        <div className="text-[#0B1423] text-xl [font-family:var(--font-mplus-rounded)]">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl [font-family:var(--font-mplus-rounded)] py-8">
      <div className="flex flex-col gap-8">
        <div className="w-full">
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#0B1423]">
              {user.displayName || 'User'}
            </h1>
            <p className="text-sm text-[#0B1423]/70 mt-1">
              Joined {formatJoinDate(user.createdAt)}
            </p>
          </div>
          
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#0B1423] mb-4">Statistics</h2>
            <div className="mb-4 flex items-center gap-4">
              <label className="font-semibold text-[#0B1423]">Learning Language:</label>
              {!languageLoaded ? (
                <span className="text-gray-400">Loading...</span>
              ) : (
                <select
                  className="rounded-lg border-2 border-gray-300 px-3 py-1 text-base font-semibold text-[#0B1423] bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                  value={language || 'en'}
                  onChange={handleLanguageChange}
                  style={{ minWidth: 160 }}
                >
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
              )}
            </div>
            {loadingStats ? (
              <div className="text-center py-8 text-[#0B1423]/50">Loading stats...</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard label="Books Completed" value={stats.booksCompleted} icon="📚" />
                <StatCard label="Words Read" value={stats.wordsRead} icon="📖" />
                <StatCard label="Words Known" value={stats.wordsKnown} icon="✅" />
              </div>
            )}
          </section>

          {error && (
            <div className="bg-red-50 border-2 border-red-300 text-red-700 px-6 py-3 rounded-lg mb-6 text-center">
              {error}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              href="/profile/manage"
              className="inline-block px-6 py-3 font-semibold rounded-lg border-2 border-gray-300 bg-white text-[#0B1423] shadow-[0_4px_0px] shadow-gray-300 hover:bg-gray-50 active:translate-y-[1px] active:shadow-[0_2px_0px] shadow-gray-300/50 transition-all duration-150 mr-4"
            >
              Manage Account
            </Link>
            <button
              onClick={handleLogout}
              className="px-6 py-3 font-semibold rounded-lg border-2 border-gray-300 bg-white text-[#0B1423] shadow-[0_4px_0px] shadow-gray-300 hover:bg-gray-50 active:translate-y-[1px] active:shadow-[0_2px_0px] shadow-gray-300/50 transition-all duration-150"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper component for Statistic Cards
interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
}
const StatCard: React.FC<StatCardProps> = ({ label, value, icon }) => (
  <div className="bg-white rounded-lg p-4 border-2 border-gray-300 shadow-[0_4px_0px] shadow-gray-300 flex items-center">
    <span className="text-3xl mr-3">{icon}</span>
    <div>
      <div className="text-[#0B1423] font-bold text-xl">{value}</div>
      <div className="text-[#0B1423]/70 text-sm">{label}</div>
    </div>
  </div>
);
