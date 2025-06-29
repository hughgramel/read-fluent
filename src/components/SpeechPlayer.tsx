'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, Repeat, ChevronsLeft, ChevronsRight } from 'lucide-react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

interface SpeechPlayerProps {
  sentences: string[];
  onSentenceChange: (index: number | null) => void;
  onWordChange: (wordIdx: number | null, wordText?: string) => void;
  onPlaybackFinish: () => void;
  onCurrentReadingSentenceEnd?: (sentenceIndex: number) => void;
  speakingRate?: number;
  voiceName?: string;
  onProgress?: (index: number) => void;
}

type PlaybackState = 'idle' | 'playing' | 'paused' | 'stopped';

function isStoppedOrPaused(state: PlaybackState) {
  return state === 'stopped' || state === 'paused';
}

export default function SpeechPlayer({
  sentences,
  onSentenceChange,
  onWordChange,
  onPlaybackFinish,
  onCurrentReadingSentenceEnd,
  speakingRate = 1.0,
  voiceName = 'es-MX-JorgeNeural',
  onProgress,
}: SpeechPlayerProps) {
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);

  // Refs for managing state across async operations
  const synthesizerRef = useRef<SpeechSDK.SpeechSynthesizer | null>(null);
  const speakerRef = useRef<SpeechSDK.SpeakerAudioDestination | null>(null);
  const isMountedRef = useRef(true);
  const speechConfigRef = useRef<SpeechSDK.SpeechConfig | null>(null);
  const lastPlayedIndexRef = useRef<number>(0);
  const currentPlaybackStateRef = useRef<PlaybackState>('idle');

  const speechKey = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY;
  const speechRegion = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION;

  // Initialize speech config
  useEffect(() => {
    if (speechKey && speechRegion) {
      const config = SpeechSDK.SpeechConfig.fromSubscription(speechKey, speechRegion);
      config.speechSynthesisVoiceName = voiceName;
      speechConfigRef.current = config;
    }
  }, [speechKey, speechRegion, voiceName]);
  
  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      forceStop();
    };
  }, []);

  // Update ref when state changes
  useEffect(() => {
    currentPlaybackStateRef.current = playbackState;
  }, [playbackState]);

  // --- Core Playback Logic ---
  const playSentences = useCallback(async (startIdx: number) => {
    if (currentPlaybackStateRef.current === 'playing' || !speechConfigRef.current || !isMountedRef.current) return;
    setPlaybackState('playing');
    for (let i = startIdx; i < sentences.length; i++) {
      if (isStoppedOrPaused(currentPlaybackStateRef.current)) break;
      if (!isMountedRef.current) {
        forceStop();
        break;
      }
      setCurrentSentenceIdx(i);
      lastPlayedIndexRef.current = i;
      onSentenceChange(i);
      onWordChange(null);
      if (typeof onProgress === 'function') onProgress(i);
      const sentence = sentences[i];
      if (!sentence || sentence.trim() === '') continue;
      const speaker = new SpeechSDK.SpeakerAudioDestination();
      speakerRef.current = speaker;
      const audioConfig = SpeechSDK.AudioConfig.fromSpeakerOutput(speaker);
      const synth = new SpeechSDK.SpeechSynthesizer(speechConfigRef.current, audioConfig);
      synthesizerRef.current = synth;
      const ssml = `<?xml version='1.0'?><speak version='1.0' xml:lang='en-US'><voice name='${voiceName}'><prosody rate='${speakingRate}'>${sentence}</prosody></voice></speak>`;
      const audioEndPromise = new Promise<void>((resolve, reject) => {
        synth.wordBoundary = (s, e) => {
          const words = sentence.match(/\S+/g) || [];
          let charCount = 0;
          let wordIdx = -1;
          for (let j = 0; j < words.length; j++) {
            if (charCount === e.textOffset) {
              wordIdx = j;
              break;
            }
            charCount += words[j].length + 1;
          }
          onWordChange(wordIdx, e.text);
        };
        synth.synthesisCompleted = (s, e) => {
          if (e.result.reason === SpeechSDK.ResultReason.Canceled) {
            reject(new Error('Synthesis canceled'));
          }
        };
        speaker.onAudioEnd = () => {
          if (isMountedRef.current) {
            console.log(`🎵 Audio ended for sentence ${i}: "${sentence.substring(0, 50)}${sentence.length > 50 ? '...' : ''}"`);
            onWordChange(null);
            // Call the new callback when current sentence audio ends
            if (typeof onCurrentReadingSentenceEnd === 'function') {
              onCurrentReadingSentenceEnd(i);
            }
            resolve();
          }
        };
        synth.speakSsmlAsync(ssml, result => {}, error => {
          console.error('Synthesis error:', error);
          reject(new Error(error));
        });
      });
      try {
        await audioEndPromise;
      } catch (error) {
        console.error(`❌ Error playing sentence ${i}:`, error);
        break;
      } finally {
        synth.close();
        if (synthesizerRef.current === synth) {
          synthesizerRef.current = null;
        }
      }
      if (isStoppedOrPaused(currentPlaybackStateRef.current)) break;
    }
    if (isMountedRef.current && currentPlaybackStateRef.current !== 'paused') {
      console.log('🎵 Playback finished - all sentences completed');
      setPlaybackState('idle');
      onSentenceChange(null);
      onWordChange(null);
      onPlaybackFinish();
    }
  }, [sentences, onSentenceChange, onWordChange, onPlaybackFinish, onCurrentReadingSentenceEnd, speakingRate, voiceName, onProgress]);

  // --- Control Handlers ---

  const forceStop = () => {
    if (speakerRef.current) {
        speakerRef.current.pause();
        speakerRef.current.close();
        speakerRef.current = null;
    }
    if (synthesizerRef.current) {
        synthesizerRef.current.close();
        synthesizerRef.current = null;
    }
  };

  const handlePlay = () => {
    // If paused, resume from where we left off. Otherwise, start from the current index.
    const startIndex = playbackState === 'paused' ? currentSentenceIdx : lastPlayedIndexRef.current;
    playSentences(startIndex);
  };

  const handlePause = () => {
    if (playbackState !== 'playing') return;
    setPlaybackState('paused');
    forceStop();
    // Keep currentSentenceIdx as is, so we can resume
  };

  const handleStop = () => {
    if (playbackState === 'idle' || playbackState === 'stopped') return;
    setPlaybackState('stopped');
    forceStop();
    setCurrentSentenceIdx(0);
    lastPlayedIndexRef.current = 0;
    onSentenceChange(null);
    onWordChange(null);
    if (typeof onProgress === 'function') onProgress(0);
  };
  
  const handleNextSentence = () => {
      const nextIdx = Math.min(currentSentenceIdx + 1, sentences.length - 1);
      setPlaybackState('stopped'); // Signal loop to stop
      forceStop();
      setCurrentSentenceIdx(nextIdx);
      lastPlayedIndexRef.current = nextIdx;
      if (typeof onProgress === 'function') onProgress(nextIdx);
      // Use a timeout to allow state to update before starting new playback
      setTimeout(() => playSentences(nextIdx), 50);
  };

  const handlePrevSentence = () => {
      const prevIdx = Math.max(currentSentenceIdx - 1, 0);
      setPlaybackState('stopped'); // Signal loop to stop
      forceStop();
      setCurrentSentenceIdx(prevIdx);
      lastPlayedIndexRef.current = prevIdx;
      if (typeof onProgress === 'function') onProgress(prevIdx);
      setTimeout(() => playSentences(prevIdx), 50);
  };
  
  const handleRepeat = () => {
      setPlaybackState('stopped'); // Signal loop to stop
      forceStop();
      setTimeout(() => playSentences(currentSentenceIdx), 50);
  };

  if (!speechKey || !speechRegion) {
    return (
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="text-red-500 text-center p-4 bg-white rounded-lg shadow-lg border">
          Azure Speech credentials are not configured.
        </div>
      </div>
    );
  }

  const isPlaying = playbackState === 'playing';

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 bg-white rounded-full shadow-lg border p-2">
        <button 
          onClick={handlePrevSentence} 
          disabled={isPlaying && currentSentenceIdx === 0}
          className="w-12 h-12 flex items-center justify-center bg-[#3b355d] text-white rounded-full hover:bg-[#4a417a] disabled:opacity-50 transition-colors" 
          aria-label="Previous Sentence"
        >
          <ChevronsLeft size={24} />
        </button>
        <button 
          onClick={handleRepeat}
          disabled={!isPlaying}
          className="w-12 h-12 flex items-center justify-center bg-[#3b355d] text-white rounded-full hover:bg-[#4a417a] disabled:opacity-50 transition-colors"
          aria-label="Repeat Sentence"
        >
          <Repeat size={24} />
        </button>
        <button 
          onClick={isPlaying ? handlePause : handlePlay}
          className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-orange-400 to-pink-500 text-white rounded-full hover:opacity-90 transition-opacity" 
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1"/>}
        </button>
        <button 
          onClick={handleStop} 
          className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-orange-400 to-pink-500 text-white rounded-full hover:opacity-90 transition-opacity" 
          aria-label="Stop"
        >
          <Square size={24} />
        </button>
        <button 
          onClick={handleNextSentence}
          disabled={isPlaying && currentSentenceIdx >= sentences.length - 1}
          className="w-12 h-12 flex items-center justify-center bg-[#3b355d] text-white rounded-full hover:bg-[#4a417a] disabled:opacity-50 transition-colors" 
          aria-label="Next Sentence"
        >
          <ChevronsRight size={24} />
        </button>
      </div>
    </div>
  );
} 