'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { WordService, WordType, Word } from '@/services/wordService';
import { FiSearch, FiPlus } from 'react-icons/fi';
import { UserService } from '@/services/userService';

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Known', value: 'known' },
  { label: 'Tracking', value: 'tracking' },
  { label: 'Ignored', value: 'ignored' },
];

export default function AboutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'known' | 'tracking' | 'ignored'>('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [words, setWords] = useState<Word[]>([]);
  const [addWord, setAddWord] = useState('');
  const [addType, setAddType] = useState<WordType>('tracking');
  const [addLang, setAddLang] = useState('en');
  const [profileLang, setProfileLang] = useState<string | null>(null);
  const [langLoaded, setLangLoaded] = useState(false);
  const [addMultiple, setAddMultiple] = useState(false);
  const [addMultiText, setAddMultiText] = useState('');
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

  useEffect(() => {
    if (!user) {
      router.push('/signin');
    }
    if (user) {
      WordService.getWords(user.uid).then(setWords);
    }
  }, [user, router]);

  useEffect(() => {
    if (user) {
      UserService.getUserPreferences(user.uid).then(prefs => {
        if (prefs?.language) setProfileLang(prefs.language);
        else setProfileLang('en');
        setLangLoaded(true);
      });
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center pt-16">
        <div className="text-[#0B1423] text-xl [font-family:var(--font-mplus-rounded)]">
          Loading...
        </div>
      </div>
    );
  }

  let filtered = words;
  if (filter !== 'all') filtered = filtered.filter(w => w.type === filter);
  if (search) filtered = filtered.filter(w => w.word.toLowerCase().includes(search.toLowerCase()));
  filtered = [
    ...filtered.filter(w => w.type === 'known'),
    ...filtered.filter(w => w.type === 'tracking'),
    ...filtered.filter(w => w.type === 'ignored'),
  ];

  const openAddModal = () => {
    if (langLoaded && profileLang) setAddLang(profileLang);
    setShowAdd(true);
  };

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !addWord.trim()) return;
    await WordService.addWord(user.uid, addWord.trim(), addType);
    setShowAdd(false);
    setAddWord('');
    setAddType('tracking');
    setAddLang(profileLang || 'en');
    // Refresh words
    const updated = await WordService.getWords(user.uid);
    setWords(updated);
  };

  return (
    <div className="w-full max-w-6xl mx-auto" style={{ fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}>
      <div className="flex flex-col gap-8">
        <div className="w-full">
          <div className="mb-6">
            <h1 className="text-4xl font-extrabold text-[#2563eb] tracking-tight" style={{ letterSpacing: '-0.02em' }}>
              Words
            </h1>
          </div>
          <div className="flex items-center gap-2 mb-6 pl-2" style={{ maxWidth: 700 }}>
            <select
              className="rounded-full border-2 border-gray-200 px-4 py-2 text-base font-bold text-[#2563eb] bg-white focus:border-[#2563eb] focus:ring-2 focus:ring-[#e6f0fd] outline-none transition-all"
              value={filter}
              onChange={e => setFilter(e.target.value as any)}
              style={{ minWidth: 110 }}
            >
              {FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <input
              type="text"
              className="rounded-full border-2 border-gray-200 px-4 py-2 text-base font-bold text-[#232946] bg-white focus:border-[#2563eb] focus:ring-2 focus:ring-[#e6f0fd] outline-none w-40 transition-all"
              placeholder="Filter words..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ minWidth: 120 }}
            />
            <button
              className="px-4 py-2 rounded-full bg-[#2563eb] text-white font-bold shadow-sm hover:bg-[#1749b1] transition-colors text-base border-none focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40"
              onClick={openAddModal}
              title="Add Word"
            >
              <FiPlus className="w-5 h-5" />
            </button>
          </div>
          {showAdd && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
              <div className="bg-white rounded-2xl p-8 border-[0.75] border-black shadow-lg max-w-md w-full relative" style={{ fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}>
                <button
                  onClick={() => setShowAdd(false)}
                  className="absolute top-3 right-3 text-gray-400 hover:text-[#2563eb] text-2xl font-bold transition-colors bg-transparent border-none"
                  style={{ lineHeight: 1 }}
                  aria-label="Close"
                >×</button>
                <h2 className="text-xl font-extrabold mb-4 text-[#2563eb] tracking-tight text-center">Add Word</h2>
                {!langLoaded ? (
                  <div className="text-gray-400">Loading language...</div>
                ) : (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (addMultiple) {
                      // Parse words: split by spaces/commas, but keep quoted phrases
                      const regex = /"([^"]+)"|'([^']+)'|\S+/g;
                      const matches = Array.from(addMultiText.matchAll(regex));
                      const words = matches.map(m => m[1] || m[2] || m[0]).map(w => w.trim()).filter(Boolean);
                      if (user && words.length > 0) {
                        await WordService.addWords(user.uid, words, addType);
                        setShowAdd(false);
                        setAddMultiText('');
                        setAddType('tracking');
                        setAddLang(profileLang || 'en');
                        const updated = await WordService.getWords(user.uid);
                        setWords(updated);
                      }
                    } else {
                      await handleAddWord(e);
                    }
                  }} className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-sm font-bold text-black">
                        <input type="checkbox" checked={addMultiple} onChange={e => setAddMultiple(e.target.checked)} />
                        Add multiple
                      </label>
                    </div>
                    {addMultiple ? (
                      <textarea
                        className="rounded-lg border-2 border-gray-200 px-4 py-2 text-base font-bold text-[#232946] bg-white focus:border-[#2563eb] focus:ring-2 focus:ring-[#e6f0fd] outline-none min-h-[80px]"
                        placeholder={'Enter words separated by spaces or commas, or use quotes for phrases (e.g. banana fruit "to be")'}
                        value={addMultiText}
                        onChange={e => setAddMultiText(e.target.value)}
                        required
                      />
                    ) : (
                      <input
                        className="rounded-lg border-2 border-gray-200 px-4 py-2 text-base font-bold text-[#232946] bg-white focus:border-[#2563eb] focus:ring-2 focus:ring-[#e6f0fd] outline-none"
                        placeholder="Word"
                        value={addWord}
                        onChange={e => setAddWord(e.target.value)}
                        required
                      />
                    )}
                    <div className="flex gap-2">
                      <select
                        className="rounded-full border-2 border-gray-200 px-4 py-2 text-base font-bold text-[#2563eb] bg-white focus:border-[#2563eb] focus:ring-2 focus:ring-[#e6f0fd] outline-none transition-all"
                        value={addType}
                        onChange={e => setAddType(e.target.value as WordType)}
                      >
                        <option value="known">Known</option>
                        <option value="tracking">Tracking</option>
                        <option value="ignored">Ignored</option>
                      </select>
                      <select
                        className="rounded-full border-2 border-gray-200 px-4 py-2 text-base font-bold text-[#2563eb] bg-white focus:border-[#2563eb] focus:ring-2 focus:ring-[#e6f0fd] outline-none transition-all"
                        value={addLang}
                        onChange={e => setAddLang(e.target.value)}
                      >
                        {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="rounded-full bg-[#2563eb] text-white font-bold px-4 py-2 hover:bg-[#1749b1] transition-all"
                    >Add</button>
                    <button
                      type="button"
                      className="rounded-full bg-gray-200 text-gray-500 font-bold px-4 py-2 cursor-not-allowed mt-2"
                      disabled
                    >Import Migaku .db file (Coming Soon)</button>
                  </form>
                )}
              </div>
            </div>
          )}
          <div className="mt-4 flex justify-start">
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              {filtered.length === 0 ? (
                <div className="text-gray-400 italic">No words found.</div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr>
                      <th className="py-3 px-3 text-base font-bold text-gray-400">#</th>
                      <th className="py-3 px-3 text-base font-bold text-gray-400">Status</th>
                      <th className="py-3 px-3 text-base font-bold text-gray-400">Lang</th>
                      <th className="py-3 px-3 text-base font-bold text-gray-400">Word</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((w, i) => (
                      <tr key={w.word} className="border-b border-gray-100">
                        <td className="py-3 px-3 text-gray-300 font-mono text-lg w-12">{i + 1}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-1 text-sm font-bold rounded-full mr-2 mb-2
                              ${w.type === 'known' ? 'bg-[#16a34a] text-white' :
                                w.type === 'tracking' ? 'bg-[#a78bfa] text-white' :
                                w.type === 'ignored' ? 'bg-[#f87171] text-white' :
                                'bg-gray-200 text-gray-500'}
                            `}
                          >
                            {w.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#2563eb] font-bold text-lg w-16">{profileLang || 'en'}</td>
                        <td className="py-3 px-3 font-extrabold text-xl text-[#232946]">{w.word}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 