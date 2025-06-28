import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

const SYSTEM_PROMPTS = {
  wordExplanation: (interfaceLang: string) =>
    `You are a language API that explains the specific nuance of specified word(s) in a sentence. Respond concisely in no more than 100 words. Specified word(s) MUST be in its original language. All other explanation text MUST be in language ${interfaceLang}. In your response: DO NOT OUTPUT the language name or the word 'nuance'; DO NOT OUTPUT the context sentence; DO NOT OUTPUT romaji/pinyin/furigana or any notes on pronunciation; Conclude with the specific nuance within the context sentence.`,
  sentenceTranslation: () =>
    `You are a language translation API. RESPOND ONLY with the translated text. MAINTAIN the EXACT punctuation of the original text. DO NOT RESPOND with enclosing quotations unless the original text has them.`
};

const USER_PROMPTS = {
  wordExplanation: (sentence: string, word: string, targetLang: string) =>
    `${sentence}. Explain usage of word(s): ${word} (lang: ${targetLang})`,
  sentenceTranslation: (sentence: string, targetLang: string) =>
    `Translate this text into language ${targetLang}: ${sentence}`
};

export async function POST(req: NextRequest) {
  try {
    const { type, targetLang, interfaceLang, word, sentence } = await req.json();
    
    if (type === 'wordExplanation') {
      // For word explanations, use Gemini API
      const systemPrompt = SYSTEM_PROMPTS.wordExplanation(interfaceLang);
      const userPrompt = USER_PROMPTS.wordExplanation(sentence, word, targetLang);
      
      const res = await fetch(`${GEMINI_API_URL}?key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 1,
            maxOutputTokens: 100,
          }
        })
      });
      
      if (!res.ok) {
        const err = await res.text();
        console.error('Gemini API error:', err);
        return NextResponse.json({ error: err }, { status: res.status });
      }
      
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return NextResponse.json({ text });
      
    } else if (type === 'sentenceTranslation') {
      // For sentence translations, use Google Translate API
      const res = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: sentence,
          target: targetLang.toLowerCase(),
          format: 'text'
        })
      });
      
      if (!res.ok) {
        const err = await res.text();
        console.error('Translation API error:', err);
        return NextResponse.json({ error: err }, { status: res.status });
      }
      
      const data = await res.json();
      const translation = data.data?.translations?.[0]?.translatedText || '';
      return NextResponse.json({ text: translation });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (e: any) {
    console.error('API error:', e);
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
} 