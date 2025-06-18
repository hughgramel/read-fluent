import { Sentence } from '@/types/sentence';
import { v4 as uuidv4 } from 'uuid';

export const SentenceService = {
  getSentences(userId: string): Sentence[] {
    const key = `sentences-${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as Sentence[];
    } catch {
      return [];
    }
  },

  addSentence(userId: string, text: string, meta?: Partial<Omit<Sentence, 'id' | 'userId' | 'text' | 'createdAt'>>): Sentence {
    const key = `sentences-${userId}`;
    const sentences = SentenceService.getSentences(userId);
    const sentence: Sentence = {
      id: uuidv4(),
      userId,
      text,
      createdAt: new Date().toISOString(),
      ...meta,
    };
    sentences.unshift(sentence);
    localStorage.setItem(key, JSON.stringify(sentences));
    return sentence;
  },

  removeSentence(userId: string, sentenceId: string): void {
    const key = `sentences-${userId}`;
    const sentences = SentenceService.getSentences(userId).filter(s => s.id !== sentenceId);
    localStorage.setItem(key, JSON.stringify(sentences));
  },
}; 