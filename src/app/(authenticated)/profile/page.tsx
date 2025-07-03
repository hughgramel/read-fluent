'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserService } from '@/services/userService';
import Link from 'next/link';
import { ReadingSessionService } from '@/services/readingSessionService';

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
    <div className="w-full max-w-6xl" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex flex-col gap-8">
        <div className="w-full">
          <div className="mb-6">
            <h1 className="text-4xl font-extrabold text-[#222] tracking-tight" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em' }}>
              {user.displayName || 'User'}
            </h1>
            <p className="text-sm text-[#222]/70 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
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
            <div className="mb-4 flex items-center gap-4">
              <label className="font-semibold text-[#0B1423]">Native Language:</label>
              {!languageLoaded ? (
                <span className="text-gray-400">Loading...</span>
              ) : (
                <select
                  className="rounded-lg border-2 border-gray-300 px-3 py-1 text-base font-semibold text-[#0B1423] bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
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
                  <option value="si">Sinhala</option>
                  <option value="am">Amharic</option>
                  <option value="sw">Swahili</option>
                  <option value="zu">Zulu</option>
                  <option value="xh">Xhosa</option>
                  <option value="st">Sesotho</option>
                  <option value="tn">Tswana</option>
                  <option value="ts">Tsonga</option>
                  <option value="ss">Swati</option>
                  <option value="ve">Venda</option>
                  <option value="nr">Ndebele</option>
                  <option value="rw">Kinyarwanda</option>
                  <option value="so">Somali</option>
                  <option value="om">Oromo</option>
                  <option value="ti">Tigrinya</option>
                  <option value="aa">Afar</option>
                  <option value="ff">Fulah</option>
                  <option value="ha">Hausa</option>
                  <option value="ig">Igbo</option>
                  <option value="yo">Yoruba</option>
                  <option value="sn">Shona</option>
                  <option value="ny">Nyanja</option>
                  <option value="mg">Malagasy</option>
                  <option value="rn">Kirundi</option>
                  <option value="sg">Sango</option>
                  <option value="ln">Lingala</option>
                  <option value="kg">Kongo</option>
                  <option value="lu">Luba-Katanga</option>
                  <option value="ba">Bashkir</option>
                  <option value="tt">Tatar</option>
                  <option value="cv">Chuvash</option>
                  <option value="udm">Udmurt</option>
                  <option value="sah">Sakha</option>
                  <option value="ce">Chechen</option>
                  <option value="os">Ossetian</option>
                  <option value="av">Avaric</option>
                  <option value="kv">Komi</option>
                  <option value="cu">Old Church Slavonic</option>
                  <option value="tk">Turkmen</option>
                  <option value="ky">Kyrgyz</option>
                  <option value="kk">Kazakh</option>
                  <option value="uz">Uzbek</option>
                  <option value="tg">Tajik</option>
                  <option value="ps">Pashto</option>
                  <option value="pa">Punjabi</option>
                  <option value="sd">Sindhi</option>
                  <option value="ur">Urdu</option>
                  <option value="ne">Nepali</option>
                  <option value="si">Sinhala</option>
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
            {loadingStats ? (
              <div className="text-center py-8 text-[#0B1423]/50">Loading stats...</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard label="Books Completed" value={booksCompleted} icon="📚" />
                <StatCard label="Words Read" value={totalWordsRead} icon="📖" />
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
  <div className="bg-white rounded-lg p-4 border border-gray-200 flex items-center" style={{ fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif', boxShadow: 'none' }}>
    <span className="text-2xl mr-3" style={{ color: '#2563eb' }}>{icon}</span>
    <div>
      <div className="text-[#232946] font-bold text-lg" style={{ fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}>{value}</div>
      <div className="text-[#0B1423]/70 text-sm" style={{ fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}>{label}</div>
    </div>
  </div>
);
