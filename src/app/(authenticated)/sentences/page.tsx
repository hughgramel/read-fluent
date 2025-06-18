"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SentenceService } from '@/services/sentenceService';
import { Sentence } from '@/types/sentence';

export default function SentencesPage() {
  const { user } = useAuth();
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [loading, setLoading] = useState(true);

  // Sentences are saved from the reader by clicking the save icon in the popup or pressing 's' while hovering a word.
  useEffect(() => {
    if (user?.uid) {
      setSentences(SentenceService.getSentences(user.uid));
    }
    setLoading(false);
  }, [user]);

  const handleRemove = (id: string) => {
    if (!user?.uid) return;
    SentenceService.removeSentence(user.uid, id);
    setSentences(SentenceService.getSentences(user.uid));
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12" style={{ fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}>
      <div className="flex flex-col gap-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-[#232946] tracking-tight mb-4" style={{ letterSpacing: '-0.02em', fontWeight: 800 }}>
            Sentences
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Sentences you save from reading will appear here. (Tip: Press <span className='font-mono bg-gray-100 px-2 py-0.5 rounded'>s</span> while hovering a word, or use the save icon in the popup.)
          </p>
        </div>
        <div className="bg-white rounded-xl p-0 border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-gray-400 p-8">Loading...</div>
          ) : !user ? (
            <div className="text-gray-400 p-8">Sign in to see your saved sentences.</div>
          ) : sentences.length === 0 ? (
            <div className="text-gray-400 p-8">No sentences saved yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sentences.map((sentence, idx) => (
                <div
                  key={sentence.id}
                  className="flex items-center group hover:bg-gray-50 transition-colors"
                  style={{ borderTop: idx === 0 ? '1px solid #e5e7eb' : undefined, borderRight: '1px solid #e5e7eb', minHeight: 72 }}
                >
                  <div className="w-20 text-right pr-6 py-6 text-gray-400 text-xl font-mono select-none" style={{ minWidth: 64 }}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 py-6 pr-6 text-[#232946] text-xl" style={{ wordBreak: 'break-word', fontWeight: 400, fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}>
                    {sentence.text}
                  </div>
                  <button
                    onClick={() => handleRemove(sentence.id)}
                    className="ml-2 px-5 py-2 rounded bg-red-50 text-red-500 font-semibold hover:bg-red-100 transition-colors border border-red-100 text-base"
                    style={{ marginRight: 18 }}
                  >Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 