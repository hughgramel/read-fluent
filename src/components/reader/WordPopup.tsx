import React, { useState, useEffect } from 'react';
import { BookOpen, MessageSquare, Languages, Bookmark, X, Eye, CheckCircle, XCircle, HelpCircle, Bot, ListOrdered } from 'lucide-react';
import { Bookmark as BookmarkIcon, Bookmark as BookmarkFilledIcon } from 'lucide-react';
import { WordType } from './ReaderTypes';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';
import { SentenceService } from '@/services/sentenceService';
import { useAuth } from '@/contexts/AuthContext';


export type DatabaseTermEntry = {
  expression: string;
  reading: string;
  expressionReverse?: string;
  readingReverse?: string;
  definitionTags: string | null;
  tags?: string;
  rules: string;
  score: number;
  glossary: Array<{
    definition: string;
    type?: string;
    notes?: string;
    source?: string;
  }>;
  sequence?: number;
  termTags?: string;
  dictionary: string;
};

interface WordPopupProps {
  word: string;
  sentence: string;
  x: number;
  y: number;
  position: 'above' | 'below';
  align: 'left' | 'right';
  onClose?: () => void;
  wordStatus?: WordType;
  onWordStatusChange?: (word: string, newStatus: WordType) => void;
  readerFont?: string;
  nativeLanguage?: string;
  targetLanguage?: string;
}

// Utility to render Yomitan/Wiktionary structured-content JSON
function renderStructuredContent(node: any, key?: React.Key, readerFont?: string): React.ReactNode {
  if (!node) return null;
  if (Array.isArray(node)) {
    return node.map((child, i) => renderStructuredContent(child, i, readerFont));
  }
  if (typeof node === 'string') {
    return node;
  }
  // Debug: log each part
  if (node.tag) {
    console.log('[DICT DEBUG] tag:', node.tag, 'data:', node.data, 'content:', node.content);
  }
  if (node.notes) {
    console.log('[DICT DEBUG] notes:', node.notes);
  }
  if (node.source) {
    console.log('[DICT DEBUG] source:', node.source);
  }
  if (node.terms) {
    console.log('[DICT DEBUG] terms:', node.terms);
  }
  if (node.tags) {
    console.log('[DICT DEBUG] tags:', node.tags);
  }
  if (node.rules) {
    console.log('[DICT DEBUG] rules:', node.rules);
  }
  // Special styling for span tags (used for vt/vr etc)
  if (node.tag === 'span') {
    return <span key={key} style={{
      display: 'inline-block',
      background: '#23272f',
      color: '#fff',
      borderRadius: 6,
      padding: '1px 8px',
      fontSize: 13,
      fontWeight: 700,
      marginRight: 6,
      fontFamily: readerFont || 'monospace',
      verticalAlign: 'middle',
      boxShadow: '0 1px 2px rgba(0,0,0,0.10)'
    }}>{node.content}</span>;
  }
  // Handle known tags
  switch (node.tag) {
    case 'div':
      return <div key={key}>{renderStructuredContent(node.content, undefined, readerFont)}</div>;
    case 'b':
      return <b key={key}>{renderStructuredContent(node.content, undefined, readerFont)}</b>;
    case 'i':
      return <i key={key}>{renderStructuredContent(node.content, undefined, readerFont)}</i>;
    case 'ul':
      return <ul key={key}>{renderStructuredContent(node.content, undefined, readerFont)}</ul>;
    case 'ol':
      return <ol key={key}>{renderStructuredContent(node.content, undefined, readerFont)}</ol>;
    case 'li':
      return <li key={key}>{renderStructuredContent(node.content, undefined, readerFont)}</li>;
    case 'details':
      return <details key={key}><summary>{node.data?.content || 'Details'}</summary>{renderStructuredContent(node.content, undefined, readerFont)}</details>;
    case 'summary':
      return <summary key={key}>{renderStructuredContent(node.content, undefined, readerFont)}</summary>;
    case 'a':
      return <a key={key} href={node.href} target="_blank" rel="noopener noreferrer">{renderStructuredContent(node.content, undefined, readerFont)}</a>;
    default:
      // Fallback: render as div
      return <div key={key}>{renderStructuredContent(node.content, undefined, readerFont)}</div>;
  }
}

// Helper to render numbered definitions with tags
function renderNumberedDefinitions(defArr: any[], readerFont?: string) {
  // Find the structured-content block
  const structured = defArr.find(d => d.type === 'structured-content');
  if (!structured || !Array.isArray(structured.content)) return null;
  // Extract main numbered definitions (ol/li structure)
  const olBlock = structured.content.find((block: any) => block.tag === 'ol');
  if (!olBlock || !Array.isArray(olBlock.content)) return null;
  // Each li is a definition
  return (
    <div style={{ marginTop: 8 }}>
      {olBlock.content.map((li: any, idx: number) => {
        // Try to extract tag (vt/vr) and meaning
        let tag = '';
        let meaning: any = '';
        // Try to get definitionTags if present
        let definitionTags = '';
        if (li.content && Array.isArray(li.content)) {
          // Look for a span with vt/vr
          const tagSpan = li.content.find((c: any) => c.tag === 'span');
          tag = tagSpan?.content || '';
          // The rest is the meaning
          const meaningBlock = li.content.find((c: any) => c.tag !== 'span');
          if (typeof meaningBlock === 'string') {
            meaning = meaningBlock;
          } else if (meaningBlock && typeof meaningBlock === 'object') {
            meaning = renderStructuredContent(meaningBlock, undefined, readerFont);
          } else {
            meaning = '';
          }
        } else if (typeof li.content === 'string') {
          meaning = li.content;
        }
        // Prefer definitionTags if present
        if (li.definitionTags) {
          definitionTags = li.definitionTags;
        } else if (tag) {
          definitionTags = tag;
        }
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginRight: 8 }}>{idx + 1}.</div>
            {definitionTags && (
              <span id="definition-tags" style={{
                display: 'inline-block',
                background: '#444',
                color: '#fff',
                borderRadius: 8,
                padding: '2px 12px',
                fontSize: 14,
                fontWeight: 700,
                marginRight: 10,
                fontFamily: 'monospace',
                letterSpacing: 0.5,
                verticalAlign: 'middle',
                boxShadow: '0 1px 2px rgba(0,0,0,0.10)'
              }}>{definitionTags}</span>
            )}
            <div style={{ fontSize: 15, color: '#232946', fontWeight: 500 }}>{meaning}</div>
          </div>
        );
      })}
    </div>
  );
}

// Placeholder AI icon component
const AiIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="#6366f1" strokeWidth="2" fill="#e0e7ff" />
    <text x="12" y="16" textAnchor="middle" fontSize="10" fill="#6366f1" fontWeight="bold">AI</text>
  </svg>
);

// Helper to parse Gemini breakdown output into groups
function parseBreakdownOutput(output: string) {
  // Split by #1, #2, #3 pattern
  // Example: #1 chunk, #2 meaning, #3 explanation
  const groups = [];
  const regex = /#1\s*(.+?)\s*#2\s*(.+?)\s*#3\s*([\s\S]*?)(?=(#1|$))/g;
  let match;
  while ((match = regex.exec(output)) !== null) {
    groups.push({
      chunk: match[1]?.trim() || '',
      meaning: match[2]?.trim() || '',
      explanation: match[3]?.trim().replace(/^Explanation:?/i, '').trim() || '',
    });
  }
  return groups;
}

export function WordPopup({ word, sentence, x, y, position, align, onClose, wordStatus = 'unknown', onWordStatusChange, readerFont, nativeLanguage, targetLanguage }: WordPopupProps) {
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const [placeholderText, setPlaceholderText] = useState('');
  const [activeTab, setActiveTab] = useState<'definition' | 'explain' | 'translate' | 'sentence' | 'word-explain'>('definition');
  const [dictEntries, setDictEntries] = useState<any[]>([]);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictError, setDictError] = useState<string | null>(null);
  // Add new state for lemma entry
  const [lemmaEntry, setLemmaEntry] = useState<any | null>(null);
  const [explainResult, setExplainResult] = useState<string | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [translateResult, setTranslateResult] = useState<string | null>(null);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [wordExplainResult, setWordExplainResult] = useState<string | null>(null);
  const [wordExplainLoading, setWordExplainLoading] = useState(false);
  const [wordExplainError, setWordExplainError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveAnim, setSaveAnim] = useState(false);

  // Detect mobile screen
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640;

  // Clean word for display (remove punctuation)
  const cleanWordForDisplay = (word: string) => {
    return word.replace(/[.,!?;:]|["'\)\]}]/g, '').toLowerCase();
  };

  const displayWord = cleanWordForDisplay(word);

  // Default languages if not provided
  const interfaceLang = nativeLanguage || 'en';
  const targetLang = targetLanguage || 'es';

  const handlePopupClick = (e: React.MouseEvent) => {
    // Prevent clicks on the popup from bubbling up to the container
    e.stopPropagation();
  };

  const handleWordStatusToggle = () => {
    if (!onWordStatusChange) return;
    
    // Cycle through statuses: unknown -> known -> tracking -> ignored -> unknown
    const statusCycle: WordType[] = ['unknown', 'known', 'tracking', 'ignored'];
    const currentIndex = statusCycle.indexOf(wordStatus);
    const nextIndex = (currentIndex + 1) % statusCycle.length;
    const newStatus = statusCycle[nextIndex];
    
    onWordStatusChange(displayWord, newStatus);
  };

  // Yomitan-style dictionary lookup
  useEffect(() => {
    const fetchYomitanEntries = async () => {
      setDictLoading(true);
      setDictError(null);
      setDictEntries([]);
      setLemmaEntry(null);
      try {
        const db = getFirestore();
        // 1. Fetch the index document for the word
        const indexRef = doc(db, 'dictionary_es', displayWord);
        const indexSnap = await getDoc(indexRef);
        if (!indexSnap.exists()) {
          setDictError('No dictionary entry found.');
          setDictLoading(false);
          return;
        }
        let indexData = indexSnap.data();
        let indexArr: any[] = [];
        if (typeof indexData.definitions_json === 'string') {
          try {
            indexArr = JSON.parse(indexData.definitions_json);
          } catch (e) {
            setDictError('Failed to parse dictionary index.');
            setDictLoading(false);
            return;
          }
        } else if (Array.isArray(indexData.definitions_json)) {
          indexArr = indexData.definitions_json;
        }
        // 2. For each entry, fetch the actual definition document
        const allEntries: any[] = [];
        let lemmaWord = displayWord;
        let lemmaTags: string[] = [];
        // Find the lemma (the entry without 'alternative' tag)
        for (const entry of indexArr) {
          const entryWord = Array.isArray(entry) ? entry[0] : displayWord;
          const entryTags = Array.isArray(entry) ? entry[1] : [];
          if (!entryTags.includes('alternative')) {
            lemmaWord = entryWord;
            lemmaTags = entryTags;
          }
          allEntries.push({ word: entryWord, tags: entryTags });
        }
        setDictEntries(allEntries);
        // If the selected word is an alternative, fetch the lemma's full entry
        if (displayWord !== lemmaWord) {
          const lemmaRef = doc(db, 'dictionary_es', lemmaWord);
          const lemmaSnap = await getDoc(lemmaRef);
          let lemmaData = lemmaSnap.exists() ? lemmaSnap.data() : null;
          let lemmaJson = lemmaData && lemmaData.definitions_json ? lemmaData.definitions_json : null;
          let lemmaParsed = null;
          if (typeof lemmaJson === 'string') {
            try {
              lemmaParsed = JSON.parse(lemmaJson);
            } catch {}
          } else if (lemmaJson) {
            lemmaParsed = lemmaJson;
          }
          // Debug: print lemma object
          console.log('[DICT DEBUG] Fetched lemma object for', lemmaWord, lemmaData);
          setLemmaEntry({
            word: lemmaWord,
            tags: lemmaTags,
            definition: lemmaParsed,
            raw: lemmaData
          });
        } else {
          // If the selected word is the lemma, fetch and show its entry as before
          const defRef = doc(db, 'dictionary_es', lemmaWord);
          const defSnap = await getDoc(defRef);
          let defData = defSnap.exists() ? defSnap.data() : null;
          let defJson = defData && defData.definitions_json ? defData.definitions_json : null;
          let defParsed = null;
          if (typeof defJson === 'string') {
            try {
              defParsed = JSON.parse(defJson);
            } catch {}
          } else if (defJson) {
            defParsed = defJson;
          }
          setLemmaEntry({
            word: lemmaWord,
            tags: lemmaTags,
            definition: defParsed,
            raw: defData
          });
        }
        setDictLoading(false);
      } catch (e: any) {
        setDictError('Failed to fetch dictionary entries.');
        setDictLoading(false);
      }
    };
    fetchYomitanEntries();
  }, [displayWord]);

  // Gemini API call utility using @google/generative-ai
  async function callGemini(prompt: string | { systemPrompt: string, userPrompt: string }): Promise<string> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || (typeof window !== 'undefined' ? (window as any).NEXT_PUBLIC_GEMINI_API_KEY : undefined);
    if (!apiKey) throw new Error('Gemini API key not set');
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
    if (typeof prompt === 'string') {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } else {
      // Use systemPrompt as context, userPrompt as the main prompt
      const result = await model.generateContent({ contents: [
        { role: 'system', parts: [{ text: prompt.systemPrompt }] },
        { role: 'user', parts: [{ text: prompt.userPrompt }] },
      ] });
      return result.response.text();
    }
  }

  // Prompts
  const wordExplainSystemPrompt = `You are a language API that explains the specific nuance of specified word(s) in a sentence.\n\nRespond concisely in no more than 100 words.\n\nSpecified word(s) MUST be in its original language.\n\nAll other explanation text MUST be in language [INTERFACE_LANG].\n\nIn your response:\nDO NOT OUTPUT the language name or the word 'nuance';\nDO NOT OUTPUT the context sentence ;\nDO NOT OUTPUT romaji/pinyin/furigana or any notes on pronunciation;\nConclude with the specific nuance within the context sentence.`;
  const wordExplainUserPrompt = `[SENTENCE]. Explain usage of word(s): [WORD] (lang: [TARGET_LANG])`;
  const sentenceBreakdownPrompt = `You are a language API that does sentence breakdown-explanations.\n\nSentence: [SENTENCE]\n\nBreak down the supplied sentence into meaningful, contiguous chunks.\nEach chunk should be SMALL, meaningful groupings of words or characters.\nOutput in groups of NUMBERED LISTS, in this format:\n#1 chunk #2 reworded meaning #3 explanation (particles, tenses, etc.).\n'Chunk' MUST be in its original language.\n'Meaning' and 'explanation' MUST be in language en.\n'Meaning' MUST be markedly different from 'Chunk' text (reworded, definition, synonyms, etc.).\nThe 'explanation' field should be no longer than 100 words.\nALWAYS count like so: #1 ... #2 ... #3 ... DO NOT count higher.\nDO NOT OUTPUT dot-points, dashes, or titles like 'Chunk:' etc.\nDO NOT OUTPUT readings, brackets, or romaji/pinyin/furigana/pronunciations of any kind.\nDO NOT OUTPUT the original sentence.\nDO NOT OUTPUT quotation marks in the 'chunk' or 'meaning' fields.\nDO NOT OUTPUT other text, ONLY OUTPUT numbered lists.\nDO NOT OUTPUT any text in [TARGET_LANG]. ONLY output text IN en.`;
  const sentenceTranslationPrompt = `You are a language translation API.\n\nSentence: [SENTENCE]\n\nRESPOND ONLY with the translated text.\nMAINTAIN the EXACT punctuation of the original text.\nDO NOT RESPOND with enclosing quotations unless the original text has them.\nSentence MUST BE translated into this SPECIFIC language: [TARGET_LANG].`;

  // Handle Word Explanation tab
  useEffect(() => {
    if (activeTab === 'word-explain') {
      setWordExplainResult(null);
      setWordExplainError(null);
      setWordExplainLoading(true);
      const systemPrompt = wordExplainSystemPrompt.replace('[INTERFACE_LANG]', interfaceLang);
      const userPrompt = wordExplainUserPrompt.replace('[SENTENCE]', sentence).replace('[WORD]', word).replace('[TARGET_LANG]', targetLang);
      const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
      callGemini(combinedPrompt)
        .then(setWordExplainResult)
        .catch(e => setWordExplainError(e.message))
        .finally(() => setWordExplainLoading(false));
    }
  }, [activeTab, word, nativeLanguage]);

  // Handle Explain tab
  useEffect(() => {
    if (activeTab === 'explain') {
      setExplainResult(null);
      setExplainError(null);
      setExplainLoading(true);
      callGemini(sentenceBreakdownPrompt.replace('[WORD]', word).replace('[SENTENCE]', sentence))
        .then(setExplainResult)
        .catch(e => setExplainError(e.message))
        .finally(() => setExplainLoading(false));
    }
  }, [activeTab, sentence, nativeLanguage]);

  // Handle Translate tab
  useEffect(() => {
    if (activeTab === 'translate') {
      setTranslateResult(null);
      setTranslateError(null);
      setTranslateLoading(true);
      const prompt = sentenceTranslationPrompt
        .replace('[WORD]', word)
        .replace('[SENTENCE]', sentence)
        .replace('[TARGET_LANG]', targetLang)
        .replace('[NATIVE_LANG]', interfaceLang);
      callGemini(prompt)
        .then(setTranslateResult)
        .catch(e => setTranslateError(e.message))
        .finally(() => setTranslateLoading(false));
    }
  }, [activeTab, sentence, nativeLanguage, targetLanguage]);

  const getStatusConfig = (status: WordType) => {
    switch (status) {
      case 'known':
        return {
          label: 'Known',
          color: '#10b981', // green
          bgColor: '#10b981',
          icon: CheckCircle,
        };
      case 'tracking':
        return {
          label: 'Tracking',
          color: '#3b82f6', // blue
          bgColor: '#3b82f6',
          icon: Eye,
        };
      case 'ignored':
        return {
          label: 'Ignored',
          color: '#6b7280', // gray
          bgColor: '#6b7280',
          icon: XCircle,
        };
      case 'unknown':
      default:
        return {
          label: 'Unknown',
          color: '#f59e0b', // amber
          bgColor: '#f59e0b',
          icon: HelpCircle,
        };
    }
  };

  const statusConfig = getStatusConfig(wordStatus);
  const StatusIcon = statusConfig.icon;

  // In handleButtonClick, always reset loading, error, and result state for the selected tab
  const handleButtonClick = (action: string) => {
    setShowPlaceholder(true);
    setActiveTab(action as any);
    switch (action) {
      case 'definition':
        setPlaceholderText('');
        setDictLoading(false);
        setDictError(null);
        setDictEntries([]);
        setLemmaEntry(null);
        break;
      case 'explain':
        setPlaceholderText('');
        setExplainLoading(false);
        setExplainError(null);
        setExplainResult(null);
        break;
      case 'translate':
        setPlaceholderText('');
        setTranslateLoading(false);
        setTranslateError(null);
        setTranslateResult(null);
        break;
      case 'word-explain':
        setPlaceholderText('');
        setWordExplainLoading(false);
        setWordExplainError(null);
        setWordExplainResult(null);
        break;
      case 'sentence':
        setShowPlaceholder(false);
        setPlaceholderText('');
        break;
    }
  };

  const { user } = useAuth ? useAuth() : { user: null };

  return (
    <div
      data-popup="word-popup"
      style={{
        ...(isMobile
          ? {
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              top: 'unset',
              zIndex: 9999,
              background: 'white',
              color: '#232946',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              border: '1px solid #888',
              boxShadow: '0 -4px 16px rgba(0,0,0,0.12)',
              padding: '12px 16px 24px 16px',
              fontSize: 16,
              width: '100vw',
              maxWidth: '100vw',
              minHeight: 180,
              maxHeight: '60vh',
              pointerEvents: 'auto',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }
          : {
        position: 'fixed',
              left: Math.max(8, Math.min(x, window.innerWidth - 400 - 8)),
              top: y + 8,
        zIndex: 9999,
        background: 'white',
        color: '#232946',
        border: '1px solid #888',
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        padding: '12px 16px',
        fontSize: 16,
              width: 400,
              maxWidth: '95vw',
              maxHeight: 255,
              minHeight: 100,
        pointerEvents: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }),
      }}
      onClick={handlePopupClick}
    >
      {/* Word and close button row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{displayWord}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={async () => {
            if (user && user.uid) {
              setIsSaving(true);
              await SentenceService.addSentence(user.uid, sentence, word);
              setIsSaving(false);
              setIsSaved(true);
              setSaveAnim(true);
              setTimeout(() => setSaveAnim(false), 300);
              console.log('Saved sentence with target word:', sentence, word);
            } else {
              console.log('No user, cannot save sentence');
            }
          }}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: isSaved ? 'default' : 'pointer',
            padding: 4,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s, transform 0.15s',
            color: isSaved ? '#232946' : '#666',
            transform: saveAnim ? 'scale(1.2)' : 'scale(1)',
            filter: isSaved ? 'brightness(1)' : 'none',
            opacity: isSaving ? 0.7 : 1,
          }}
          title={isSaved ? 'Sentence saved' : 'Save sentence'}
          disabled={isSaved || isSaving}
        >
          {isSaved
            ? <BookmarkIcon size={16} color="#232323" fill="#232323" style={{ display: 'block' }} />
            : <BookmarkIcon size={16} color="#666" style={{ display: 'block' }} />
          }
        </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close"
            >
              <X size={16} color="#666" />
            </button>
          )}
      </div>
      </div>

      {/* Action buttons row - circular and smaller, positioned below word */}
      <div style={{ display: 'flex', gap: isMobile ? 4 : 6, flexShrink: 0, marginBottom: isMobile ? 6 : 8, justifyContent: 'flex-start' }}>
        {/* Definition tab */}
        <button
          onClick={() => handleButtonClick('definition')}
          style={{
            background: activeTab === 'definition' ? '#e0e7ff' : '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '50%',
            padding: isMobile ? '6px' : '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#495057',
            width: isMobile ? '28px' : '32px',
            height: isMobile ? '28px' : '32px',
          }}
          title="Show word definition"
        >
          <BookOpen size={isMobile ? 12 : 14} />
        </button>
        {/* Word Explanation (AI) */}
        <button
          onClick={() => handleButtonClick('word-explain')}
          style={{
            background: activeTab === 'word-explain' ? '#e0e7ff' : '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '50%',
            padding: isMobile ? '6px' : '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#495057',
            width: isMobile ? '28px' : '32px',
            height: isMobile ? '28px' : '32px',
          }}
          title="AI Word Explanation"
        >
          <Bot size={isMobile ? 12 : 14} />
        </button>
        {/* Sentence Breakdown (AI) */}
        <button
          onClick={() => handleButtonClick('explain')}
          style={{
            background: activeTab === 'explain' ? '#e0e7ff' : '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '50%',
            padding: isMobile ? '6px' : '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#495057',
            width: isMobile ? '28px' : '32px',
            height: isMobile ? '28px' : '32px',
          }}
          title="AI Sentence Breakdown"
        >
          <ListOrdered size={isMobile ? 12 : 14} />
        </button>
        {/* Sentence Translation (AI) */}
        <button
          onClick={() => handleButtonClick('translate')}
          style={{
            background: activeTab === 'translate' ? '#e0e7ff' : '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '50%',
            padding: isMobile ? '6px' : '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#495057',
            width: isMobile ? '28px' : '32px',
            height: isMobile ? '28px' : '32px',
          }}
          title="AI Sentence Translation"
        >
          <Languages size={isMobile ? 12 : 14} />
        </button>
        {/* Sentence tab */}
        <button
          onClick={() => handleButtonClick('sentence')}
          style={{
            background: activeTab === 'sentence' ? '#e0e7ff' : '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '50%',
            padding: isMobile ? '6px' : '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#495057',
            width: isMobile ? '28px' : '32px',
            height: isMobile ? '28px' : '32px',
          }}
          title="See sentence"
        >
          <Eye size={isMobile ? 12 : 14} />
        </button>
      </div>

      {/* Tab content (definition tab) */}
      <div style={{ 
        fontSize: isMobile ? 13 : 14, 
        color: '#444', 
        lineHeight: 1.4,
        flex: 1,
        overflowY: 'auto',
        minHeight: 0,
        maxHeight: isMobile ? '120px' : '140px'
      }}>
        {activeTab === 'definition' && (
          <div>
            {dictLoading && <div>Loading dictionary...</div>}
            {dictError && <div className="text-red-500">{dictError}</div>}
            {!dictLoading && !dictError && dictEntries.length > 0 && (
              <div>
                {/* Alternatives/inflections list at the top */}
                
                {/* Lemma entry below */}
                {lemmaEntry && (
                  <div style={{ marginTop: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{lemmaEntry.word}</div>
                    {lemmaEntry.tags && lemmaEntry.tags.length > 0 && (
                      <div style={{ marginBottom: 4 }}>
                        {/* {lemmaEntry.tags.map((tag: string, j: number) => (
                          <span key={j} style={{
                            display: 'inline-block',
                            background: '#e0e7ff',
                            color: '#3730a3',
                            borderRadius: 4,
                            padding: '2px 6px',
                            fontSize: 12,
                            fontWeight: 600,
                            marginRight: 4
                          }}>{tag}</span>
                        ))} */}
                      </div>
                    )}
                    {/* Debug: print all parts for the alternative definition */}
                    {(() => {
                      let defArr = Array.isArray(lemmaEntry.definition)
                        ? lemmaEntry.definition
                        : lemmaEntry.definition
                        ? [lemmaEntry.definition]
                        : [];
                      if (defArr.length > 0) {
                        console.log('[DICT DEBUG] Alternative definition parts:');
                        Object.entries(defArr[0]).forEach(([key, value]) => {
                          console.log(`  ${key}:`, value);
                        });
                      }
                      // Render numbered definitions
                      const numbered = renderNumberedDefinitions(defArr, readerFont);
                      if (numbered) return numbered;
                      // Otherwise, fallback to previous rendering
                      return defArr.map((term: any, idx: number) => (
                        <div key={idx} style={{ marginBottom: 8, paddingLeft: 8, borderLeft: '2px solid #e0e7ff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{ fontWeight: 600 }}>{term.expression}</span>
                            {term.reading && <span style={{ color: '#888', fontSize: 13 }}>({term.reading})</span>}
                            {term.termTags && <span style={{ background: '#f3e8ff', color: '#a21caf', borderRadius: 4, padding: '2px 6px', fontSize: 12, fontWeight: 600 }}>{term.termTags}</span>}
                            {term.definitionTags && <span style={{ background: '#e0e7ff', color: '#3730a3', borderRadius: 4, padding: '2px 6px', fontSize: 12, fontWeight: 600 }}>{term.definitionTags}</span>}
                            {term.tags && <span style={{ background: '#e0e7ff', color: '#3730a3', borderRadius: 4, padding: '2px 6px', fontSize: 12, fontWeight: 600 }}>{term.tags}</span>}
                            {term.rules && <span style={{ background: '#fef9c3', color: '#b45309', borderRadius: 4, padding: '2px 6px', fontSize: 12, fontWeight: 600 }}>{term.rules}</span>}
                          </div>
                          <div style={{ marginLeft: 8 }}>
                            {Array.isArray(term.glossary) && term.glossary.length > 0 && (
                              <ul style={{ margin: 0, padding: 0, listStyle: 'disc inside' }}>
                                {term.glossary.map((g: any, gi: number) => (
                                  <li key={gi} style={{ marginBottom: 2 }}>
                                    <span>{g.definition}</span>
                                    {g.type && <span style={{ color: '#888', fontSize: 12, marginLeft: 6 }}>[{g.type}]</span>}
                                    {g.notes && <span style={{ color: '#888', fontSize: 12, marginLeft: 6 }}>({g.notes})</span>}
                                    {g.source && <span style={{ color: '#888', fontSize: 12, marginLeft: 6 }}>({g.source})</span>}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                    {/* Render Grammar and Etymology as dropdowns if present */}
                    {Array.isArray(lemmaEntry.definition) && lemmaEntry.definition.length > 0 && lemmaEntry.definition[0].type === 'structured-content' && Array.isArray(lemmaEntry.definition[0].content) && (
                      <div style={{ marginTop: 12 }}>
                        {lemmaEntry.definition[0].content.filter((block: any) => block.tag === 'details').map((block: any, idx: number) => (
                          <details key={idx} style={{ marginBottom: 8 }}>
                            <summary style={{ fontWeight: 700, fontSize: 15 }}>{block.data?.content || 'Details'}</summary>
                            {renderStructuredContent(block.content, undefined, readerFont)}
                          </details>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div style={{ marginBottom: 0 }}>
                  {dictEntries.map((entry, i) => (
                    <div key={i} style={{ color: '#888', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span role="img" aria-label="book">📖</span>
                      <span>{entry.word}</span>
                      {entry.tags && entry.tags.length > 0 && (
                        <span style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>{entry.tags.join(', ')}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'word-explain' && (
          <div style={{ fontFamily: readerFont, fontSize: isMobile ? 13 : 14, color: '#444', lineHeight: 1.4, overflowY: 'auto', maxHeight: isMobile ? '120px' : '140px' }}>
            {wordExplainLoading && !wordExplainResult && !wordExplainError && <div>Loading word explanation...</div>}
            {wordExplainError && <div className="text-red-500">{wordExplainError}</div>}
            {wordExplainResult && <ReactMarkdown>{wordExplainResult}</ReactMarkdown>}
          </div>
        )}
        {activeTab === 'explain' && (
          <div style={{ fontFamily: readerFont, fontSize: isMobile ? 13 : 14, color: '#444', lineHeight: 1.4, overflowY: 'auto', maxHeight: isMobile ? '120px' : '140px' }}>
            {explainLoading ? (
              <div>Loading explanation...</div>
            ) : explainError ? (
              <div className="text-red-500">{explainError}</div>
            ) : explainResult && parseBreakdownOutput(explainResult).length > 0 ? (
              <div>
                {parseBreakdownOutput(explainResult).map((group, idx) => (
                  <div key={idx} style={{ marginBottom: 16, padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{group.chunk}</div>
                    <div style={{ fontWeight: 600, color: '#6366f1', fontSize: 13, marginBottom: 2 }}>Meaning: <span style={{ color: '#444', fontWeight: 500 }}>{group.meaning}</span></div>
                    <div style={{ fontWeight: 600, color: '#888', fontSize: 12, marginBottom: 0 }}>Explanation:</div>
                    <div style={{ color: '#444', fontSize: 12 }}>{group.explanation}</div>
                  </div>
                ))}
              </div>
            ) : (
              explainResult && <ReactMarkdown>{explainResult}</ReactMarkdown>
            )}
          </div>
        )}
        {activeTab === 'translate' && (
          <div style={{ fontFamily: readerFont, fontSize: isMobile ? 13 : 14, color: '#444', lineHeight: 1.4, overflowY: 'auto', maxHeight: isMobile ? '120px' : '140px' }}>
            {translateLoading && !translateResult && !translateError && <div>Loading translation...</div>}
            {translateError && <div className="text-red-500">{translateError}</div>}
            {translateResult && (
              <>
                <div style={{ fontWeight: 500, marginBottom: 6 }}><ReactMarkdown>{translateResult}</ReactMarkdown></div>
                <div style={{ fontStyle: 'italic', color: '#888', fontSize: isMobile ? 12 : 13 }}>{sentence}</div>
              </>
            )}
          </div>
        )}
        {activeTab !== 'definition' && activeTab !== 'translate' && (showPlaceholder ? placeholderText : sentence)}
      </div>

      {/* Word status indicator - bottom right */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: isMobile ? 6 : 8, 
        flexShrink: 0 
      }}>
        <div style={{ fontSize: isMobile ? 11 : 12, color: '#666' }}>{displayWord}</div>
        <button
          onClick={handleWordStatusToggle}
          style={{
            background: statusConfig.bgColor,
            border: 'none',
            borderRadius: 6,
            padding: isMobile ? '4px 8px' : '6px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 3 : 4,
            color: 'white',
            fontSize: isMobile ? 11 : 12,
            fontWeight: 'bold',
            transition: 'opacity 0.2s',
          }}
          title={`Click to change status (currently: ${statusConfig.label})`}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          <StatusIcon size={isMobile ? 10 : 12} />
          {statusConfig.label}
        </button>
      </div>

    </div>
  );
} 