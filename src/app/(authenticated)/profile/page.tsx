'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserService } from '@/services/userService';
import Link from 'next/link';
import { ReadingSessionService } from '@/services/readingSessionService';
import ThemeSettings from '@/components/ThemeSettings';
import { use } from 'react';
import { useRef } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

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
  const [prompts, setPrompts] = useState<any | null>(null);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [promptsSaved, setPromptsSaved] = useState(false);
  const defaultPrompts = {
    wordExplainSystem: `You are a language API that explains the specific nuance of specified word(s) in a sentence.\n\nRespond concisely in no more than 100 words.\n\nSpecified word(s) MUST be in its original language.\n\nAll other explanation text MUST be in language [INTERFACE_LANG].\n\nIn your response:\nDO NOT OUTPUT the language name or the word 'nuance';\nDO NOT OUTPUT the context sentence ;\nDO NOT OUTPUT romaji/pinyin/furigana or any notes on pronunciation;\nConclude with the specific nuance within the context sentence.`,
    wordExplainUser: `[SENTENCE]. Explain usage of word(s): [WORD] (lang: [TARGET_LANG])`,
    sentenceBreakdown: `You are a language API that does sentence breakdown-explanations.\n\nSentence: [SENTENCE]\n\nBreak down the supplied sentence into meaningful, contiguous chunks.\nEach chunk should be SMALL, meaningful groupings of words or characters.\nOutput in groups of NUMBERED LISTS, in this format:\n#1 chunk #2 reworded meaning #3 explanation (particles, tenses, etc.).\n'Chunk' MUST be in its original language.\n'Meaning' and 'explanation' MUST be in language en.\n'Meaning' MUST be markedly different from 'Chunk' text (reworded, definition, synonyms, etc.).\nThe 'explanation' field should be no longer than 100 words.\nALWAYS count like so: #1 ... #2 ... #3 ... DO NOT count higher.\nDO NOT OUTPUT dot-points, dashes, or titles like 'Chunk:' etc.\nDO NOT OUTPUT readings, brackets, or romaji/pinyin/furigana/pronunciations of any kind.\nDO NOT OUTPUT the original sentence.\nDO NOT OUTPUT quotation marks in the 'chunk' or 'meaning' fields.\nDO NOT OUTPUT other text, ONLY OUTPUT numbered lists.\nDO NOT OUTPUT any text in [TARGET_LANG]. ONLY output text IN [INTERFACE_LANG].`,
    sentenceTranslation: `You are a language translation API.\n\nSentence: [SENTENCE]\n\nRESPOND ONLY with the translated text.\nMAINTAIN the EXACT punctuation of the original text.\nDO NOT RESPOND with enclosing quotations unless the original text has them.\nSentence MUST BE translated into this SPECIFIC language: [INTERFACE_LANG].`
  };
  const [settingsDraft, setSettingsDraft] = useState<any>(null);
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [promptsDropdownOpen, setPromptsDropdownOpen] = useState(false);

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

  useEffect(() => {
    if (user) {
      setPromptsLoading(true);
      Promise.all([
        UserService.getUserPrompts(user.uid),
        UserService.getUserPreferences(user.uid)
      ]).then(([promptsFromDb, prefs]) => {
        const mergedPrompts = { ...defaultPrompts, ...promptsFromDb };
        setPrompts(mergedPrompts);
        setSettingsDraft({
          language: prefs?.language || 'en',
          dictionary: prefs?.dictionary || 'none',
          prompts: mergedPrompts,
        });
        setSettingsChanged(false);
        setPromptsLoading(false);
      });
    }
  }, [user]);

  // Handlers for draft changes
  const handleDraftChange = (key: string, value: string) => {
    setSettingsDraft((prev: any) => ({ ...prev, [key]: value }));
    setSettingsChanged(true);
  };
  const handlePromptDraftChange = (key: string, value: string) => {
    setSettingsDraft((prev: any) => ({ ...prev, prompts: { ...prev.prompts, [key]: value } }));
    setSettingsChanged(true);
  };
  const handleSaveSettings = async () => {
    if (!user || !settingsDraft) return;
    setPromptsLoading(true);
    await UserService.updateUserPreferences(user.uid, {
      targetLanguage: settingsDraft.language,
      dictionary: settingsDraft.dictionary,
    });
    await UserService.updateUserPrompts(user.uid, settingsDraft.prompts);
    setPrompts(settingsDraft.prompts);
    setPromptsLoading(false);
    setSettingsChanged(false);
  };
  const handleCancelSettings = () => {
    // Reset draft to last saved
    setSettingsDraft({
      language: language,
      dictionary: dictionary,
      prompts: prompts,
    });
    setSettingsChanged(false);
  };

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

  const handlePromptChange = (key: string, value: string) => {
    setPrompts((prev: any) => ({ ...prev, [key]: value }));
    setPromptsSaved(false);
  };
  const handleSavePrompts = async () => {
    if (!user || !prompts) return;
    setPromptsLoading(true);
    await UserService.updateUserPrompts(user.uid, prompts);
    setPromptsLoading(false);
    setPromptsSaved(true);
    setTimeout(() => setPromptsSaved(false), 2000);
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
                  value={settingsDraft?.dictionary || dictionary}
                  onChange={e => handleDraftChange('dictionary', e.target.value)}
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
                    handleDraftChange('nativeLanguage', e.target.value);
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
                  value={settingsDraft?.language || language}
                  onChange={e => handleDraftChange('language', e.target.value)}
                  style={{ minWidth: 160 }}
                >
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
              )}
            </div>
            {/* Save/Cancel buttons for all settings */}
            {settingsChanged && (
              <div className="flex gap-4 mt-4">
                <button className="btn-primary" onClick={handleSaveSettings} disabled={promptsLoading}>Save</button>
                <button className="btn-secondary" onClick={handleCancelSettings} disabled={promptsLoading}>Cancel</button>
              </div>
            )}
          </section>

          {/* Gemini Prompt Settings Section (dropdown) */}
          <section className="mb-8">
            <button
              className="flex items-center gap-2 text-lg font-bold theme-primary tracking-tight mb-2 focus:outline-none"
              style={{ letterSpacing: '-0.01em', fontWeight: 700 }}
              onClick={() => setPromptsDropdownOpen(v => !v)}
            >
              Gemini Prompt Settings
              {promptsDropdownOpen ? <FaChevronUp /> : <FaChevronDown />}
            </button>
            {promptsDropdownOpen && (
              <div className="mb-4 text-sm text-gray-600">Customize the prompts used for AI explanations and translations. Use <code>[WORD]</code>, <code>[SENTENCE]</code>, <code>[INTERFACE_LANG]</code>, <code>[TARGET_LANG]</code> as placeholders.</div>
            )}
            {promptsDropdownOpen && (promptsLoading ? (
              <div>Loading prompts...</div>
            ) : settingsDraft?.prompts ? (
              <div className="flex flex-col gap-6">
                <div>
                  <label className="font-semibold">Word Explanation System Prompt</label>
                  <textarea
                    className="w-full border rounded p-2 mt-1 text-sm"
                    rows={4}
                    value={settingsDraft.prompts.wordExplainSystem}
                    onChange={e => handlePromptDraftChange('wordExplainSystem', e.target.value)}
                  />
                  <div className="text-xs text-gray-500 mt-1">Used as the system prompt for word explanations. Placeholders: [WORD], [SENTENCE], [INTERFACE_LANG], [TARGET_LANG]</div>
                </div>
                <div>
                  <label className="font-semibold">Word Explanation User Prompt</label>
                  <textarea
                    className="w-full border rounded p-2 mt-1 text-sm"
                    rows={2}
                    value={settingsDraft.prompts.wordExplainUser}
                    onChange={e => handlePromptDraftChange('wordExplainUser', e.target.value)}
                  />
                  <div className="text-xs text-gray-500 mt-1">Used as the user prompt for word explanations. Placeholders: [WORD], [SENTENCE], [INTERFACE_LANG], [TARGET_LANG]</div>
                </div>
                <div>
                  <label className="font-semibold">Sentence Breakdown Prompt</label>
                  <textarea
                    className="w-full border rounded p-2 mt-1 text-sm"
                    rows={4}
                    value={settingsDraft.prompts.sentenceBreakdown}
                    onChange={e => handlePromptDraftChange('sentenceBreakdown', e.target.value)}
                  />
                  <div className="text-xs text-gray-500 mt-1">Used for sentence breakdown explanations. Placeholders: [WORD], [SENTENCE], [INTERFACE_LANG], [TARGET_LANG]</div>
                </div>
                <div>
                  <label className="font-semibold">Sentence Translation Prompt</label>
                  <textarea
                    className="w-full border rounded p-2 mt-1 text-sm"
                    rows={3}
                    value={settingsDraft.prompts.sentenceTranslation}
                    onChange={e => handlePromptDraftChange('sentenceTranslation', e.target.value)}
                  />
                  <div className="text-xs text-gray-500 mt-1">Used for sentence translation. Placeholders: [WORD], [SENTENCE], [INTERFACE_LANG], [TARGET_LANG]</div>
                </div>
              </div>
            ) : null)}
            {/* Save/Cancel buttons for prompts (re-use main settings buttons) */}
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
