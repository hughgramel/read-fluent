'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, Repeat, ChevronsLeft, ChevronsRight, MousePointerClick } from 'lucide-react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

// --- NEW: A global Set to track all active synthesizers ---
const activeSynthesizers = new Set<SpeechSDK.SpeechSynthesizer>();

interface SpeechPlayerProps {
  sentences: string[];
  onSentenceChange: (index: number | null) => void;
  onWordChange: (wordIdx: number | null, wordText?: string) => void;
  onPlaybackFinish: () => void;
  onCurrentReadingSentenceEnd?: (sentenceIndex: number) => void;
  speakingRate?: number;
  voiceName?: string;
  onProgress?: (index: number) => void;
  onSelectModeToggle?: (isActive: boolean) => void;
  forceStartAt?: number | null;
  onForceStartProcessed?: () => void;
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
  onSelectModeToggle,
  forceStartAt,
  onForceStartProcessed,
}: SpeechPlayerProps) {
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [isSelectModeActive, setIsSelectModeActive] = useState(false);

  const isMountedRef = useRef(true);
  const speechConfigRef = useRef<SpeechSDK.SpeechConfig | null>(null);
  const lastPlayedIndexRef = useRef<number>(0);
  const currentPlaybackStateRef = useRef<PlaybackState>('idle');

  const speechKey = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY;
  const speechRegion = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION;

  useEffect(() => {
    if (speechKey && speechRegion) {
      const config = SpeechSDK.SpeechConfig.fromSubscription(speechKey, speechRegion);
      config.speechSynthesisVoiceName = voiceName;
      speechConfigRef.current = config;
    }
  }, [speechKey, speechRegion, voiceName]);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      forceStop();
    };
  }, []);

  useEffect(() => {
    currentPlaybackStateRef.current = playbackState;
  }, [playbackState]);

  // State to track when we need to restart playback after a forced start
  const [pendingRestartIndex, setPendingRestartIndex] = useState<number | null>(null);

  useEffect(() => {
    if (forceStartAt !== null && forceStartAt !== undefined) {
      const wasPlaying = playbackState === 'playing';
      
      if (wasPlaying) {
        // Stop current playback and prepare to restart from selected sentence
        forceStop();
        setCurrentSentenceIdx(forceStartAt);
        lastPlayedIndexRef.current = forceStartAt;
        onSentenceChange(forceStartAt);
        // Set up restart after playSentence is available
        setPendingRestartIndex(forceStartAt);
      } else {
        // If not playing, just set the position
        setCurrentSentenceIdx(forceStartAt);
        lastPlayedIndexRef.current = forceStartAt;
        onSentenceChange(forceStartAt);
      }
      
      // Deactivate select mode visually after a selection is made
      setIsSelectModeActive(false);
      
      // Notify parent that forced start has been processed
      if (onForceStartProcessed) {
        onForceStartProcessed();
      }
    }
  }, [forceStartAt, onSentenceChange, playbackState, onForceStartProcessed]);

  const playSentence = useCallback(async (index: number) => {
    if (currentPlaybackStateRef.current !== 'playing' || !speechConfigRef.current || !isMountedRef.current) {
      return;
    }
      
      setCurrentSentenceIdx(index);
      lastPlayedIndexRef.current = index;
      onSentenceChange(index);
      onWordChange(null);
      if (typeof onProgress === 'function') onProgress(index);
      
      const sentence = sentences[index];
      if (!sentence || sentence.trim() === '') {
        // If the sentence is empty, recursively call the next one if still playing
        if (currentPlaybackStateRef.current === 'playing' && index < sentences.length - 1) {
            playSentence(index + 1);
        }
        return;
      }

      // We no longer need a dedicated speaker ref
      const speaker = new SpeechSDK.SpeakerAudioDestination();
      const audioConfig = SpeechSDK.AudioConfig.fromSpeakerOutput(speaker);
      const synth = new SpeechSDK.SpeechSynthesizer(speechConfigRef.current, audioConfig);
      
      // --- MODIFIED: Add the new synthesizer to our global registry ---
      activeSynthesizers.add(synth);

      try {
        await new Promise<void>((resolve, reject) => {
          synth.synthesisCompleted = (_, e) => {
            if (e.result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
              resolve();
            } else if (e.result.reason === SpeechSDK.ResultReason.Canceled) {
              reject(new Error('Synthesis canceled'));
            }
          };
          synth.wordBoundary = (_, e) => {
            // ... word boundary logic is fine ...
            const words = sentence.match(/\S+/g) || [];
            let charCount = 0;
            let wordIdx = -1;
            for (let j = 0; j < words.length; j++) {
                if (e.textOffset >= charCount && e.textOffset < charCount + words[j].length) {
                wordIdx = j;
                break;
                }
                charCount += words[j].length + 1;
            }
            onWordChange(wordIdx, e.text);
          };
          speaker.onAudioEnd = () => {
            if (isMountedRef.current) {
              onWordChange(null);
              if (onCurrentReadingSentenceEnd) onCurrentReadingSentenceEnd(index);

              if (currentPlaybackStateRef.current === 'playing') {
                if (index < sentences.length - 1) {
                  playSentence(index + 1);
                } else {
                  setPlaybackState('idle');
                  onSentenceChange(null);
                  onWordChange(null);
                  onPlaybackFinish();
                }
              }
            }
          };
          const ssml = `<?xml version='1.0'?><speak version='1.0' xml:lang='en-US'><voice name='${voiceName}'><prosody rate='${speakingRate}'>${sentence}</prosody></voice></speak>`;
          synth.speakSsmlAsync(ssml, 
            result => {
              if (result.reason === SpeechSDK.ResultReason.Canceled) {
                reject(new Error('Synthesis canceled during initiation'));
              }
            }, 
            error => {
              reject(new Error(error));
            }
          );
        });
      } catch (error) {
        console.log('[SpeechPlayer] Synthesis promise was rejected (likely paused or stopped).', error);
      } finally {
        // --- MODIFIED: Clean up this specific instance ---
        if (synth) {
            synth.close();
            // Remove it from the registry, as its lifecycle is over.
            activeSynthesizers.delete(synth);
        }
        if (speaker) {
            speaker.close();
        }
      }
    
  }, [sentences, onSentenceChange, onWordChange, onPlaybackFinish, onCurrentReadingSentenceEnd, speakingRate, voiceName, onProgress]);

  // Handle restart after forced start during playback
  useEffect(() => {
    if (pendingRestartIndex !== null) {
      // Restart playback from the selected sentence
      currentPlaybackStateRef.current = 'playing';
      setPlaybackState('playing');
      playSentence(pendingRestartIndex);
      setPendingRestartIndex(null);
    }
  }, [pendingRestartIndex, playSentence]);

  // --- REVISED: forceStop now acts as a global kill switch ---
  const forceStop = () => {
    console.log(`[SpeechPlayer] forceStop called. Closing ${activeSynthesizers.size} active synthesizers.`);
    // The .close() call on a synth will trigger its 'synthesisCompleted' event with a 'Canceled' reason.
    // This causes its promise to reject, and its 'finally' block will run, removing it from the Set.
    // We create a copy to iterate over so we don't modify the Set while looping.
    const synthesizersToStop = new Set(activeSynthesizers);
    synthesizersToStop.forEach(synth => {
        synth.close();
    });
  };

  const handlePlay = () => {
    // This logic has a bug, it should set the React state to trigger a re-render
    // and let a useEffect handle the call, but keeping it as is to address the forceStop issue.
    setPlaybackState('playing');
    currentPlaybackStateRef.current = 'playing';
    // Always start from the current sentence index (whether paused, idle, or selected)
    playSentence(currentSentenceIdx);
  };

  const handlePause = () => {
    if (currentPlaybackStateRef.current !== 'playing') return;
    setPlaybackState('paused');
    // --- FIX: Immediately update the ref so callbacks see the new state ---
    currentPlaybackStateRef.current = 'paused'; 
    forceStop();
  };


  const handleStop = () => {
    if (isStoppedOrPaused(currentPlaybackStateRef.current)) return;
    setPlaybackState('stopped');
    // --- FIX: Immediately update the ref ---
    currentPlaybackStateRef.current = 'stopped'; 
    forceStop();
    
    // Reset the player state
    const resetIndex = 0;
    setCurrentSentenceIdx(resetIndex);
    lastPlayedIndexRef.current = resetIndex;
    onSentenceChange(null);
    onWordChange(null);
    if (typeof onProgress === 'function') onProgress(resetIndex);
    
    // Also update state and ref to idle at the end
    setPlaybackState('idle');
    currentPlaybackStateRef.current = 'idle';
  };
  
  const handleNextSentence = () => {
    const wasPlaying = currentPlaybackStateRef.current === 'playing';
    if (wasPlaying) {
      forceStop();
    }
    const nextIdx = Math.min(currentSentenceIdx + 1, sentences.length - 1);
    setCurrentSentenceIdx(nextIdx);
    onSentenceChange(nextIdx);
    if (wasPlaying) {
        // If it was playing, restart the playback from the new sentence
        currentPlaybackStateRef.current = 'playing';
        setPlaybackState('playing');
        playSentence(nextIdx);
    }
  };

  const handlePrevSentence = () => {
    const wasPlaying = currentPlaybackStateRef.current === 'playing';
    if (wasPlaying) {
        forceStop();
    }
    const prevIdx = Math.max(currentSentenceIdx - 1, 0);
    setCurrentSentenceIdx(prevIdx);
    onSentenceChange(prevIdx);
    if (wasPlaying) {
        currentPlaybackStateRef.current = 'playing';
        setPlaybackState('playing');
        playSentence(prevIdx);
    }
  };
  
  const handleSelectToggle = () => {
    const newMode = !isSelectModeActive;
    setIsSelectModeActive(newMode);
    onSelectModeToggle?.(newMode);
  };

  // --- JSX is unchanged ---
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
          className="w-12 h-12 flex items-center justify-center bg-[#2563eb] text-white rounded-full hover:bg-[#1749b1] disabled:opacity-50 transition-colors shadow-sm" 
          aria-label="Previous Sentence"
        >
          <ChevronsLeft size={24} />
        </button>
        <button
          onClick={handleSelectToggle}
          className={`w-12 h-12 flex items-center justify-center text-white rounded-full hover:bg-pink-600 transition-colors shadow-sm ${isSelectModeActive ? 'bg-pink-500' : 'bg-[#2563eb]'}`}
          aria-label="Select Start Sentence"
        >
          <MousePointerClick size={24} />
        </button>
        <button 
          onClick={isPlaying ? handlePause : handlePlay}
          className="w-14 h-14 flex items-center justify-center bg-[#2563eb] text-white rounded-full hover:bg-[#1749b1] transition-colors shadow-sm" 
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1"/>}
        </button>
        <button 
          onClick={handleStop} 
          className="w-14 h-14 flex items-center justify-center bg-[#2563eb] text-white rounded-full hover:bg-[#1749b1] transition-colors shadow-sm" 
          aria-label="Stop"
        >
          <Square size={24} />
        </button>
        <button 
          onClick={handleNextSentence}
          disabled={isPlaying && currentSentenceIdx >= sentences.length - 1}
          className="w-12 h-12 flex items-center justify-center bg-[#2563eb] text-white rounded-full hover:bg-[#1749b1] disabled:opacity-50 transition-colors shadow-sm" 
          aria-label="Next Sentence"
        >
          <ChevronsRight size={24} />
        </button>
      </div>
    </div>
  );
}