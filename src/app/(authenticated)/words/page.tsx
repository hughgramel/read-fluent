'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { WordService, WordType, Word } from '@/services/wordService';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { UserService } from '@/services/userService';

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Known', value: 'known' },
  { label: 'Tracking', value: 'tracking' },
  { label: 'Ignored', value: 'ignored' },
];

export default function WordsPage() {
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
  const [sortColumn, setSortColumn] = useState<'word' | 'type'>('word');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  const handleSort = (column: 'word' | 'type') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleDeleteWord = async (word: Word) => {
    if (!user?.uid) return;
    try {
      // For now, we'll remove this functionality since removeWord doesn't exist
      // await WordService.removeWord(user.uid, word.word);
      // const updated = await WordService.getWords(user.uid);
      // setWords(updated);
      console.log('Delete word functionality not yet implemented:', word.word);
    } catch (error) {
      console.error('Failed to delete word:', error);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center pt-16">
        <div className="text-[#232946] text-xl font-semibold">
          Loading...
        </div>
      </div>
    );
  }

  // Filter and sort words
  let filtered = words;
  if (filter !== 'all') filtered = filtered.filter(w => w.type === filter);
  if (search) filtered = filtered.filter(w => w.word.toLowerCase().includes(search.toLowerCase()));

  const sortedWords = [...filtered].sort((a, b) => {
    let aValue: string;
    let bValue: string;

    switch (sortColumn) {
      case 'type':
        aValue = a.type;
        bValue = b.type;
        break;
      case 'word':
      default:
        aValue = a.word.toLowerCase();
        bValue = b.word.toLowerCase();
        break;
    }

    return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
  });

  // Calculate statistics
  const totalWords = words.length;
  const knownWords = words.filter(w => w.type === 'known').length;
  const trackingWords = words.filter(w => w.type === 'tracking').length;
  const ignoredWords = words.filter(w => w.type === 'ignored').length;

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
    <div className="w-full max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#232946] mb-2">Words</h1>
        <div className="flex gap-8 text-sm text-gray-600">
          <span><strong>{totalWords}</strong> total words</span>
          <span><strong>{knownWords}</strong> known</span>
          <span><strong>{trackingWords}</strong> tracking</span>
          <span><strong>{ignoredWords}</strong> ignored</span>
        </div>
      </div>

      {/* Search and Filter Controls - Aligned with table */}
      <div className="mb-4">
        <div className="flex items-center gap-4">
          {/* Word search */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-base font-medium text-[#232946] bg-white focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] outline-none transition-all"
              placeholder="Search words..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          {/* Status filter */}
          <div>
            <select
              className="rounded-lg border border-gray-200 px-3 py-2 text-base font-medium text-[#2563eb] bg-white focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] outline-none transition-all"
              value={filter}
              onChange={e => setFilter(e.target.value as any)}
            >
              {FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          
          {/* Add button */}
          <div>
            <button
              className="px-4 py-2 rounded-lg bg-[#2563eb] text-white font-semibold shadow-sm hover:bg-[#1749b1] transition-colors text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 flex items-center gap-2 whitespace-nowrap"
              onClick={openAddModal}
              title="Add Word"
            >
              <FiPlus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Words Table */}
      {sortedWords.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-lg mb-2">No words found</div>
          <div className="text-sm">Add some words to track your vocabulary!</div>
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
                  onClick={() => handleSort('word')}
                  style={{ width: '40%' }}
                >
                  <div className="flex items-center gap-2">
                    Word
                    {sortColumn === 'word' && (
                      <span className="text-sm">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="py-2 px-3 border-r border-gray-200 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('type')}
                  style={{ width: '25%' }}
                >
                  <div className="flex items-center gap-2">
                    Status
                    {sortColumn === 'type' && (
                      <span className="text-sm">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="py-2 px-3 border-r border-gray-200 text-left" style={{ width: '15%' }}>Language</th>
                <th className="py-2 px-3 text-center" style={{ width: '10%' }}></th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-gray-200">
              {sortedWords.map((word, index) => (
                <tr
                  key={word.word}
                  className="text-base hover:bg-gray-50 transition-colors select-text"
                  style={{ userSelect: 'text' }}
                >
                  {/* Row Number */}
                  <td className="py-2 px-3 border-r border-gray-200 text-center text-gray-500 font-mono whitespace-nowrap">
                    {index + 1}
                  </td>

                  {/* Word */}
                  <td className="py-2 px-3 border-r border-gray-200 whitespace-nowrap">
                    <span className="font-medium text-[#232946]">
                      {word.word}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-2 px-3 border-r border-gray-200 whitespace-nowrap">
                    <span
                      className={`inline-block px-3 py-1 text-sm font-semibold rounded-full
                        ${word.type === 'known' ? 'bg-green-100 text-green-800' :
                          word.type === 'tracking' ? 'bg-purple-100 text-purple-800' :
                          word.type === 'ignored' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'}
                      `}
                    >
                      {word.type}
                    </span>
                  </td>

                  {/* Language */}
                  <td className="py-2 px-3 border-r border-gray-200 whitespace-nowrap">
                    <span className="text-gray-700 font-medium">
                      {profileLang || 'en'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-2 px-3 text-center whitespace-nowrap">
                    <button
                      onClick={() => handleDeleteWord(word)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                      title="Delete word"
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

      {/* Add Word Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" style={{ backdropFilter: 'blur(2px)' }}>
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg max-w-md w-full relative">
            <button
              onClick={() => setShowAdd(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-2xl font-bold transition-colors bg-transparent border-none"
              style={{ lineHeight: 1 }}
              aria-label="Close"
            >×</button>
            <h2 className="text-2xl font-bold mb-6 text-[#232946] text-center">Add Word</h2>
            {!langLoaded ? (
              <div className="text-gray-500 text-center">Loading language...</div>
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
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#232946]">
                    <input 
                      type="checkbox" 
                      checked={addMultiple} 
                      onChange={e => setAddMultiple(e.target.checked)}
                      className="w-4 h-4 text-[#2563eb] border-gray-300 rounded focus:ring-[#2563eb]"
                    />
                    Add multiple words
                  </label>
                </div>
                {addMultiple ? (
                  <textarea
                    className="rounded-lg border-2 border-gray-200 px-4 py-3 text-base font-medium text-[#232946] bg-white focus:border-[#2563eb] focus:ring-2 focus:ring-[#e6f0fd] outline-none min-h-[100px] transition-all"
                    placeholder='Enter words separated by spaces or commas, or use quotes for phrases (e.g. banana fruit "to be")'
                    value={addMultiText}
                    onChange={e => setAddMultiText(e.target.value)}
                    required
                  />
                ) : (
                  <input
                    className="rounded-lg border-2 border-gray-200 px-4 py-3 text-base font-medium text-[#232946] bg-white focus:border-[#2563eb] focus:ring-2 focus:ring-[#e6f0fd] outline-none transition-all"
                    placeholder="Enter word"
                    value={addWord}
                    onChange={e => setAddWord(e.target.value)}
                    required
                  />
                )}
                <div className="flex gap-3">
                  <select
                    className="rounded-lg border-2 border-gray-200 px-4 py-3 text-base font-medium text-[#2563eb] bg-white focus:border-[#2563eb] focus:ring-2 focus:ring-[#e6f0fd] outline-none transition-all flex-1"
                    value={addType}
                    onChange={e => setAddType(e.target.value as WordType)}
                  >
                    <option value="known">Known</option>
                    <option value="tracking">Tracking</option>
                    <option value="ignored">Ignored</option>
                  </select>
                  <select
                    className="rounded-lg border-2 border-gray-200 px-4 py-3 text-base font-medium text-[#2563eb] bg-white focus:border-[#2563eb] focus:ring-2 focus:ring-[#e6f0fd] outline-none transition-all flex-1"
                    value={addLang}
                    onChange={e => setAddLang(e.target.value)}
                  >
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-[#2563eb] text-white font-bold px-6 py-3 hover:bg-[#1749b1] transition-all text-base"
                >
                  Add {addMultiple ? 'Words' : 'Word'}
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-gray-100 text-gray-400 font-medium px-6 py-3 cursor-not-allowed text-base"
                  disabled
                >
                  Import Migaku .db file (Coming Soon)
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 