'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { WordService, WordType, Word } from '@/services/wordService';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { UserService } from '@/services/userService';
import { SentenceService, UserSentence } from '@/services/sentenceService';
import { Clipboard } from 'lucide-react';

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
  const [selectedTab, setSelectedTab] = useState<'words' | 'sentences'>('words');
  const [sentences, setSentences] = useState<UserSentence[]>([]);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [copyToastMessage, setCopyToastMessage] = useState('');

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

  useEffect(() => {
    if (selectedTab === 'sentences' && user?.uid) {
      SentenceService.getSentences(user.uid).then(setSentences);
    }
  }, [selectedTab, user]);

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
        <div className="theme-text text-xl font-semibold">
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
    <div className="page-container">
      <div className="w-full max-w-7xl mx-auto px-6 py-8" style={{ fontFamily: 'var(--font-family)' }}>
        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            className={`px-4 py-2 font-semibold text-base transition-colors border-b-2 ${selectedTab === 'words' ? 'theme-border theme-primary' : 'border-transparent theme-text-secondary hover:theme-primary'}`}
            style={{ 
              background: 'transparent', 
              marginBottom: -1,
              borderColor: selectedTab === 'words' ? 'var(--primary-color)' : 'transparent',
              color: selectedTab === 'words' ? 'var(--primary-color)' : 'var(--secondary-text-color)'
            }}
            onClick={() => setSelectedTab('words')}
          >
            Words
          </button>
          <button
            className={`px-4 py-2 font-semibold text-base transition-colors border-b-2 ${selectedTab === 'sentences' ? 'theme-border theme-primary' : 'border-transparent theme-text-secondary hover:theme-primary'}`}
            style={{ 
              background: 'transparent', 
              marginBottom: -1,
              borderColor: selectedTab === 'sentences' ? 'var(--primary-color)' : 'transparent',
              color: selectedTab === 'sentences' ? 'var(--primary-color)' : 'var(--secondary-text-color)'
            }}
            onClick={() => setSelectedTab('sentences')}
          >
            Sentences
          </button>
        </div>

      {selectedTab === 'words' && (
        <>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold theme-text mb-2">Words</h1>
            <div className="flex gap-8 text-sm theme-text-secondary">
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
                  className="input-themed w-full"
                  placeholder="Search words..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {/* Status filter */}
              <div>
                <select
                  className="select-themed"
                  value={filter}
                  onChange={e => setFilter(e.target.value as 'all' | 'known' | 'tracking' | 'ignored')}
                >
                  {FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              {/* Add button */}
              <div>
                <button
                  className="btn-primary flex items-center gap-2 whitespace-nowrap"
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
            <div className="text-center py-16 theme-text-secondary">
              <div className="text-lg mb-2">No words found</div>
              <div className="text-sm">Add some words to track your vocabulary!</div>
            </div>
          ) : (
            <div className="card-themed overflow-hidden">
              <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                {/* Table Header */}
                <thead>
                  <tr className="bg-gray-50 border-b theme-border text-base font-semibold theme-text-secondary">
                    <th className="py-2 px-3 border-r theme-border text-center w-16">#</th>
                    <th 
                      className="py-2 px-3 border-r theme-border text-left cursor-pointer hover:bg-gray-100"
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
                      className="py-2 px-3 border-r theme-border text-left cursor-pointer hover:bg-gray-100"
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
                    <th className="py-2 px-3 border-r theme-border text-left" style={{ width: '15%' }}>Language</th>
                    <th className="py-2 px-3 text-center" style={{ width: '10%' }}></th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y theme-border">
                  {sortedWords.map((word, index) => (
                    <tr
                      key={word.word}
                      className="text-base hover:bg-gray-50 transition-colors select-text"
                      style={{ userSelect: 'text' }}
                    >
                      {/* Row Number */}
                      <td className="py-2 px-3 border-r theme-border text-center theme-text-secondary font-mono whitespace-nowrap">
                        {index + 1}
                      </td>

                      {/* Word */}
                      <td className="py-2 px-3 border-r theme-border whitespace-nowrap">
                        <span className="font-medium theme-text">
                          {word.word}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-2 px-3 border-r theme-border whitespace-nowrap">
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
                      <td className="py-2 px-3 border-r theme-border whitespace-nowrap">
                        <span className="theme-text-secondary font-medium">
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
        </>
      )}

      {selectedTab === 'sentences' && (
        sentences.length === 0 ? (
          <div className="text-center py-16 theme-text-secondary">
            <div className="text-lg mb-2">No sentences found</div>
            <div className="text-sm">Add sentences by clicking on them while reading</div>
          </div>
        ) : (
          <div>
            <div className="flex justify-start mb-4">
              <button
                onClick={() => {
                  const allText = sentences.map(s => s.text).join('\n');
                  navigator.clipboard.writeText(allText);
                  setCopyToastMessage('All sentences copied!');
                  setShowCopyToast(true);
                  setTimeout(() => setShowCopyToast(false), 2000);
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium theme-text-secondary hover:theme-text transition-colors bg-gray-100 hover:bg-gray-200 rounded-lg theme-border border sm:px-4"
              >
                <Clipboard className="w-4 h-4" />
                <span className="hidden sm:inline">Copy All</span>
                <span className="sm:hidden">Copy</span>
              </button>
            </div>
            <div className="card-themed overflow-hidden overflow-x-auto">
              <table className="w-full border-collapse min-w-[600px]" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr className="bg-gray-50 border-b theme-border text-sm sm:text-base font-semibold theme-text-secondary">
                    <th className="py-2 px-2 sm:px-3 border-r theme-border text-center w-12 sm:w-16">#</th>
                    <th className="py-2 px-2 sm:px-3 border-r theme-border text-left" style={{ width: '60%' }}>Sentence</th>
                    <th className="py-2 px-2 sm:px-3 border-r theme-border text-left" style={{ width: '25%' }}>Date</th>
                    <th className="py-2 px-2 sm:px-3 text-center" style={{ width: '15%' }}></th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border">
                  {sentences.map((sentence, index) => (
                    <tr
                      key={sentence.id || index}
                      className="text-sm sm:text-base hover:bg-gray-50 transition-colors select-text"
                      style={{ userSelect: 'text' }}
                    >
                      <td className="py-2 px-2 sm:px-3 border-r theme-border text-center theme-text-secondary font-mono whitespace-nowrap">
                        {index + 1}
                      </td>
                      <td className="py-2 px-2 sm:px-3 border-r theme-border theme-text">
                        <span className="font-medium theme-text break-words">
                          {sentence.text}
                        </span>
                      </td>
                      <td className="py-2 px-2 sm:px-3 border-r theme-border whitespace-nowrap">
                        <span className="theme-text-secondary text-xs sm:text-sm">
                          {sentence.createdAt ? new Date(sentence.createdAt).toLocaleDateString() : 'Unknown'}
                        </span>
                      </td>
                      <td className="py-2 px-2 sm:px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(sentence.text);
                            setCopyToastMessage('Sentence copied!');
                            setShowCopyToast(true);
                            setTimeout(() => setShowCopyToast(false), 2000);
                          }}
                          className="text-gray-400 hover:theme-primary transition-colors p-1.5 sm:p-2 rounded-lg bg-gray-100 hover:bg-gray-200 theme-border border flex items-center justify-center"
                          title="Copy sentence"
                        >
                          <Clipboard className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Add Word Modal */}
          {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAdd(false)}>
          <div className="theme-bg rounded-2xl p-8 theme-border border theme-shadow shadow-lg max-w-md w-full relative" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setShowAdd(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-2xl font-bold transition-colors bg-transparent border-none"
                  style={{ lineHeight: 1 }}
                  aria-label="Close"
                >×</button>
            <h2 className="text-2xl font-bold mb-6 theme-text text-center">Add Word</h2>
                {!langLoaded ? (
              <div className="theme-text-secondary text-center">Loading language...</div>
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
                  <label className="flex items-center gap-2 text-sm font-semibold theme-text">
                    <input 
                      type="checkbox" 
                      checked={addMultiple} 
                      onChange={e => setAddMultiple(e.target.checked)}
                      className="w-4 h-4 border-gray-300 rounded focus:ring-2"
                      style={{ 
                        accentColor: 'var(--primary-color)',
                        color: 'var(--primary-color)'
                      }}
                    />
                    Add multiple words
                      </label>
                    </div>
                    {addMultiple ? (
                      <textarea
                    className="input-themed min-h-[100px]"
                    placeholder='Enter words separated by spaces or commas, or use quotes for phrases (e.g. banana fruit "to be")'
                        value={addMultiText}
                        onChange={e => setAddMultiText(e.target.value)}
                        required
                      />
                    ) : (
                      <input
                    className="input-themed"
                    placeholder="Enter word"
                        value={addWord}
                        onChange={e => setAddWord(e.target.value)}
                        required
                      />
                    )}
                <div className="flex gap-3">
                      <select
                    className="select-themed flex-1"
                        value={addType}
                        onChange={e => setAddType(e.target.value as WordType)}
                      >
                        <option value="known">Known</option>
                        <option value="tracking">Tracking</option>
                        <option value="ignored">Ignored</option>
                      </select>
                      <select
                    className="select-themed flex-1"
                        value={addLang}
                        onChange={e => setAddLang(e.target.value)}
                      >
                        {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                      </select>
                    </div>
                    <button
                      type="submit"
                  className="btn-primary text-base"
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
      {/* Toast Notification */}
      {showCopyToast && (
        <div className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Clipboard className="w-4 h-4" />
          <span>{copyToastMessage}</span>
        </div>
      )}
      </div>
    </div>
  );
} 