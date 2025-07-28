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
import { fillPromptVariables } from '@/utils/promptUtils';

type DictionaryConfig = { name: string; collection: string; language: string; glossLanguage: string };

// Helper to format the date
const formatJoinDate = (date: Date | undefined): string => {
  if (!date) return 'Unknown';
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

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
    sentenceBreakdown: `You are a language API that does sentence breakdown-explanations.\n\nSentence: [SENTENCE]\n\nBreak down the supplied sentence into meaningful, contiguous chunks.\nEach chunk should be SMALL, meaningful groupings of words or characters.\nOutput in groups of NUMBERED LISTS, in this format:\n#1 chunk #2 reworded meaning #3 explanation (particles, tenses, etc.).\n'Chunk' MUST be in its original language.\n'Meaning' and 'explanation' MUST be in language [INTERFACE_LANG].\n'Meaning' MUST be markedly different from 'Chunk' text (reworded, definition, synonyms, etc.).\nThe 'explanation' field should be no longer than 100 words.\nALWAYS count like so: #1 ... #2 ... #3 ... DO NOT count higher.\nDO NOT OUTPUT dot-points, dashes, or titles like 'Chunk:' etc.\nDO NOT OUTPUT readings, brackets, or romaji/pinyin/furigana/pronunciations of any kind.\nDO NOT OUTPUT the original sentence.\nDO NOT OUTPUT quotation marks in the 'chunk' or 'meaning' fields.\n[LANGUAGE_EXCEPTION]`,
    sentenceTranslation: `You are a language translation API.\n\nSentence: [SENTENCE]\n\nRESPOND ONLY with the translated text.\nMAINTAIN the EXACT punctuation of the original text.\nDO NOT RESPOND with enclosing quotations unless the original text has them.\nSentence MUST BE translated into this SPECIFIC language: [INTERFACE_LANG].\n\nIMPORTANT: Surround the word that most closely corresponds to the target word [WORD] with asterisks (*word*).`
  };
  const [settingsDraft, setSettingsDraft] = useState<any>(null);
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [promptsDropdownOpen, setPromptsDropdownOpen] = useState(false);
  const [lastSavedSettings, setLastSavedSettings] = useState<any>(null);

  // Add state for languagesData
  const [languagesData, setLanguagesData] = useState<{ code: string; name: string }[]>([]);

  // Add a state to track if prompts have changed
  const [promptsChanged, setPromptsChanged] = useState(false);

  // Helper to get language name from code
  const getLanguageName = (code: string) => {
    const lang = languagesData.find((l: any) => l.code === code);
    return lang ? lang.name : code;
  };

  // Helper to get dictionary for language pair
  const getDictionaryForPair = (language: string, glossLanguage: string, dictionaries: DictionaryConfig[]) => {
    return dictionaries.find(d => d.language === language && d.glossLanguage === glossLanguage);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/signin');
    } catch (err) {
      console.error("Logout failed:", err);
      setError("Failed to sign out. Please try again.");
    }
  };

  // Fetch target-languages.json on mount
  useEffect(() => {
    fetch('/target-languages.json')
      .then(res => res.json())
      .then(setLanguagesData)
      .catch(() => setLanguagesData([]));
  }, []);

  // Update fallback for dictionaries fetch
  useEffect(() => {
    fetch('/dictionaries.json')
      .then(res => res.json())
      .then(setDictionaries)
      .catch(() => setDictionaries([{ name: 'No dictionary', collection: 'none', language: 'none', glossLanguage: 'none' }]));
  }, []);

  useEffect(() => {
    if (user) {
      UserService.getUserPreferences(user.uid).then(prefs => {
        if (prefs?.targetLanguage) setLanguage(prefs.targetLanguage);
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
        const saved = {
          language: prefs?.targetLanguage || 'en',
          nativeLanguage: prefs?.nativeLanguage || localStorage.getItem('reader-native-language') || 'en',
          dictionary: prefs?.dictionary || 'none',
          prompts: mergedPrompts,
        };
        setPrompts(mergedPrompts);
        setSettingsDraft({ ...saved });
        setLastSavedSettings({ ...saved });
        setSettingsChanged(false);
        setPromptsLoading(false);
        setNativeLanguage(saved.nativeLanguage);
      });
    }
  }, [user]);

  // Handlers for draft changes
  const handleDraftChange = (key: string, value: string) => {
    setSettingsDraft((prev: any) => ({ ...prev, [key]: value }));
    setSettingsChanged(true);
    // Set flag for manual language changes to trigger dictionary auto-switch
    if (key === 'language' || key === 'nativeLanguage') {
      setUserManuallyChangedLanguage(true);
    }
  };
  const handlePromptDraftChange = (key: string, value: string) => {
    setSettingsDraft((prev: any) => ({ ...prev, prompts: { ...prev.prompts, [key]: value } }));
    setPromptsChanged(true);
  };
  const handleSaveSettings = async () => {
    if (!user || !settingsDraft) return;
    setPromptsLoading(true);
    try {
    await UserService.updateUserPreferences(user.uid, {
      targetLanguage: settingsDraft.language,
      nativeLanguage: settingsDraft.nativeLanguage,
      dictionary: settingsDraft.dictionary,
    });
    await UserService.updateUserPrompts(user.uid, settingsDraft.prompts);
    setPrompts(settingsDraft.prompts);
    setLastSavedSettings({ ...settingsDraft });
      setSettingsChanged(false);
      // Update local state to reflect saved values
      setLanguage(settingsDraft.language);
      setNativeLanguage(settingsDraft.nativeLanguage);
      setDictionary(settingsDraft.dictionary);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
    setPromptsLoading(false);
    }
  };
  const handleCancelSettings = () => {
    // Reset draft to last saved
    if (lastSavedSettings) {
      setSettingsDraft({ ...lastSavedSettings });
    }
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
    if (!user || !settingsDraft?.prompts) return;
    setPromptsLoading(true);
    await UserService.updateUserPrompts(user.uid, settingsDraft.prompts);
    setPrompts(settingsDraft.prompts);
    setPromptsChanged(false);
    setPromptsLoading(false);
    setPromptsSaved(true);
    setTimeout(() => setPromptsSaved(false), 2000);
  };

  // Only auto-switch dictionary when user manually changes language/nativeLanguage
  // Don't auto-switch when loading saved preferences
  const [userManuallyChangedLanguage, setUserManuallyChangedLanguage] = useState(false);

  useEffect(() => {
    if (settingsDraft && dictionaries.length > 0 && userManuallyChangedLanguage) {
      const langCode = settingsDraft.language || language;
      const glossCode = settingsDraft.nativeLanguage || nativeLanguage;
      const dict = getDictionaryForPair(langCode, glossCode, dictionaries);
      if (dict) {
        setSettingsDraft((prev: any) => ({ ...prev, dictionary: dict.collection }));
      }
      setUserManuallyChangedLanguage(false);
    }
  }, [settingsDraft?.language, settingsDraft?.nativeLanguage, dictionaries, userManuallyChangedLanguage]);

  if (!user) {
    return (
      <div className="flex items-center justify-center pt-16">
        <div className="theme-text text-xl font-semibold">
          Loading...
        </div>
      </div>
    );
  }

  const getLangName = (code: string) => {
    const lang = languagesData.find(l => l.code === code);
    return lang ? lang.name : code;
  };

  const promptKeys = [
    'wordExplainSystem',
    'wordExplainUser',
    'sentenceBreakdown',
    'sentenceTranslation',
  ] as const;
  type PromptKey = typeof promptKeys[number];

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-8" style={{ fontFamily: 'var(--font-family)' }}>
      <div className="flex flex-col gap-8">
        <div className="w-full">
          <div className="mb-4">
            <p className="text-sm theme-text-secondary">
              Signed in as {user.email}
            </p>
          </div>
          
          <section className="mb-8">
            <h2 className="text-xl font-bold theme-primary tracking-tight mb-6" style={{ letterSpacing: '-0.01em', fontWeight: 700 }}>Settings</h2>
            <div className="mb-6 flex flex-col gap-2">
              <div className="flex items-center gap-4">
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
              <div className="text-xs text-gray-500 ml-2 mb-2">The dictionary used for word lookups and definitions. Changes automatically based on your language settings if a matching dictionary exists.</div>
            </div>
            <div className="mb-6 flex flex-col gap-2">
              <div className="flex items-center gap-4">
                <label className="font-semibold theme-text">Interface Language:</label>
                {!languageLoaded ? (
                  <span className="theme-text-secondary">Loading...</span>
                ) : (
                  <select
                    className="select-themed font-semibold"
                    value={settingsDraft?.nativeLanguage || nativeLanguage}
                    onChange={async (e) => {
                      setNativeLanguage(e.target.value);
                      localStorage.setItem('reader-native-language', e.target.value);
                      handleDraftChange('nativeLanguage', e.target.value);
                    }}
                    style={{ minWidth: 160 }}
                  >
                    {languagesData.map((l: any) => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                )}
              </div>
              <div className="text-xs text-gray-500 ml-2 mb-2">The language used for explanations and the app interface.</div>
            </div>
            <div className="mb-6 flex flex-col gap-2">
              <div className="flex items-center gap-4">
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
                    {languagesData.map((l: any) => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                )}
              </div>
              <div className="text-xs text-gray-500 ml-2 mb-2">The language you are learning or reading in.</div>
            </div>
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
              Prompt Settings
              {promptsDropdownOpen ? <FaChevronUp /> : <FaChevronDown />}
            </button>
            {promptsDropdownOpen && (
              <div className="mb-4 text-sm text-gray-600">Customize the prompts used for AI explanations and translations. Use <code>[WORD]</code>, <code>[SENTENCE]</code>, <code>[INTERFACE_LANG]</code>, <code>[TARGET_LANG]</code> as placeholders.</div>
            )}
            {promptsDropdownOpen && (promptsLoading ? (
              <div>Loading prompts...</div>
            ) : settingsDraft?.prompts ? (
              <div className="flex flex-col gap-6">
                {promptKeys.map((key) => (
                  <div key={key}>
                    <label className="font-semibold">{key === 'wordExplainSystem' ? 'Word Explanation System Prompt' :
                      key === 'wordExplainUser' ? 'Word Explanation User Prompt' :
                      key === 'sentenceBreakdown' ? 'Sentence Breakdown Prompt' :
                      'Sentence Translation Prompt'}</label>
                    <textarea
                      className="w-full border rounded p-2 mt-1 text-sm"
                      rows={key === 'wordExplainUser' ? 2 : key === 'sentenceTranslation' ? 3 : 4}
                      value={settingsDraft.prompts[key] as string}
                      onChange={e => handlePromptDraftChange(key, e.target.value)}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {key === 'wordExplainSystem' ? 'Used as the system prompt for word explanations.' :
                        key === 'wordExplainUser' ? 'Used as the user prompt for word explanations.' :
                        key === 'sentenceBreakdown' ? (
                          <>
                            Used for sentence breakdown explanations. Placeholders: [WORD], [SENTENCE], [INTERFACE_LANG], [TARGET_LANG], [LANGUAGE_EXCEPTION]. [LANGUAGE_EXCEPTION] automatically adds or removes the restriction about not outputting in the target language if the interface and target language are the same.
                          </>
                        ) :
                        'Used for sentence translation.'
                      }
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button className="btn-secondary" onClick={() => {
                        const prompt = fillPromptVariables(settingsDraft.prompts[key] as string, {
                          interfaceLang: getLangName(settingsDraft?.nativeLanguage || 'en'),
                          targetLang: getLangName(settingsDraft?.language || 'fr'),
                          word: 'chat',
                          sentence: 'Bonjour',
                        });
                        console.log(`Test ${key} prompt:`, prompt);
                      }}>Test</button>
                      <button className="btn-primary" onClick={async () => {
                        if (!user) return;
                        const newPrompts = { ...settingsDraft.prompts, [key]: settingsDraft.prompts[key] };
                        setPromptsLoading(true);
                        await UserService.updateUserPrompts(user.uid, newPrompts);
                        setPrompts(newPrompts);
                        setPromptsChanged(false);
                        setPromptsLoading(false);
                        setPromptsSaved(true);
                        setTimeout(() => setPromptsSaved(false), 2000);
                      }}>Save</button>
                      <button className="btn-secondary" onClick={() => {
                        handlePromptDraftChange(key, defaultPrompts[key as PromptKey]);
                      }}>Reset to Default</button>
                    </div>
                  </div>
                ))}
                

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
