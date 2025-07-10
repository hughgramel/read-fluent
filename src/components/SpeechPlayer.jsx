import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, SkipBack, SkipForward, MousePointerClick, Repeat } from 'lucide-react';

const SpeechPlayer = forwardRef(({
  sentences,
  onSentenceChange,
  onWordChange,
  onPlaybackFinish,
  speakingRate = 1.0,
  voiceName = 'es-MX-JorgeNeural',
  onProgress,
  onCurrentReadingSentenceEnd,
  onSelectModeToggle,
  forceStartAt,
  onForceStartProcessed,
  disableWordHighlighting = false,
  disableSentenceHighlighting = false,
  onSentenceSelect,
}, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reader-current-sentence-index');
      if (saved && !isNaN(Number(saved))) {
        return Number(saved);
      }
    }
    return 0;
  });
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [authToken, setAuthToken] = useState(null);
  const [error, setError] = useState(null);
  
  const synthesizerRef = useRef(null);
  const playerRef = useRef(null);
  const speechConfigRef = useRef(null);
  const wordBoundaryListRef = useRef([]);
  const highlightIntervalRef = useRef(null);
  const isCurrentlyPlayingRef = useRef(false);
  const autoAdvanceRef = useRef(false);
  const shouldResumeAfterIndexChange = useRef(false);
  const skipInProgress = useRef(false);

  // Load Speech SDK dynamically
  useEffect(() => {
    const loadSpeechSDK = () => {
      if (window.SpeechSDK) {
        setIsSDKLoaded(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://aka.ms/csspeech/jsbrowserpackageraw';
      script.onload = () => setIsSDKLoaded(true);
      script.onerror = () => setError('Failed to load Speech SDK');
      document.head.appendChild(script);
    };
    loadSpeechSDK();
  }, []);

  // Get authorization token
  useEffect(() => {
    const getAuthToken = () => {
      fetch('/api/speech-token')
        .then(response => response.ok ? response.json() : null)
        .then(data => {
          if (data && data.token) setAuthToken(data.token);
        })
        .catch(() => {});
    };
    if (isSDKLoaded) getAuthToken();
  }, [isSDKLoaded]);

  // Fetch available voices
  const fetchVoices = useCallback(() => {
    if (!isSDKLoaded || !window.SpeechSDK) return;
    try {
      const region = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION || 'eastus';
      const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`;
      const headers = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      else if (process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY) headers['Ocp-Apim-Subscription-Key'] = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY;
      fetch(endpoint, { headers })
        .then(response => response.ok ? response.json() : [])
        .then(voices => setAvailableVoices(voices));
    } catch {}
  }, [isSDKLoaded, authToken]);
  useEffect(() => { fetchVoices(); }, [fetchVoices]);

  // Handle force start at specific sentence
  useEffect(() => {
    if (forceStartAt !== null && forceStartAt !== undefined) {
      setCurrentSentenceIndex(forceStartAt);
      if (typeof onSentenceSelect === 'function') {
        onSentenceSelect(forceStartAt);
      }
      if (onForceStartProcessed) onForceStartProcessed();
    }
  }, [forceStartAt, onForceStartProcessed, onSentenceSelect]);

  // Initialize speech config once
  useEffect(() => {
    if (!isSDKLoaded || !window.SpeechSDK) return;
    const SpeechSDK = window.SpeechSDK;
    const region = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION || 'eastus';
    let speechConfig;
    if (authToken) speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(authToken, region);
    else if (process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY) speechConfig = SpeechSDK.SpeechConfig.fromSubscription(process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY, region);
    else { setError('Speech API not configured. Please set NEXT_PUBLIC_AZURE_SPEECH_KEY in your environment variables.'); return; }
    speechConfig.speechSynthesisVoiceName = voiceName;
    speechConfig.speechSynthesisOutputFormat = SpeechSDK.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;
    speechConfigRef.current = speechConfig;
  }, [isSDKLoaded, authToken, voiceName]);

  // Helper: normalize a word for comparison
  function normalizeWord(word) {
    return word
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[.,!?;:"'""''()\[\]{}…—–]/g, '') // remove punctuation
      .trim();
  }

  // Start word highlighting interval (robust, throttled)
  const startWordHighlighting = () => {
    if (highlightIntervalRef.current) clearInterval(highlightIntervalRef.current);
    let lastBoundaryIdx = -1;
    highlightIntervalRef.current = setInterval(() => {
      if (!playerRef.current || !isCurrentlyPlayingRef.current) return;
      const currentTime = playerRef.current.currentTime;
      let wordBoundaryIdx = -1;
      for (let i = 0; i < wordBoundaryListRef.current.length; i++) {
        const e = wordBoundaryListRef.current[i];
        if (currentTime * 1000 > e.audioOffset / 10000) wordBoundaryIdx = i;
        else break;
      }
      if (wordBoundaryIdx === -1 || wordBoundaryIdx === lastBoundaryIdx) return;
      lastBoundaryIdx = wordBoundaryIdx;
      const wordBoundary = wordBoundaryListRef.current[wordBoundaryIdx];
      if (wordBoundary && onWordChange && !disableWordHighlighting) {
        const sentence = sentences[currentSentenceIndex] || '';
        const words = sentence.match(/\S+/g) || [];
        const normBoundary = normalizeWord(wordBoundary.text);
        // Count which occurrence of this wordBoundary.text we are on
        let boundaryCount = 0;
        for (let i = 0; i <= wordBoundaryIdx; i++) {
          if (normalizeWord(wordBoundaryListRef.current[i].text) === normBoundary) boundaryCount++;
        }
        // Find the Nth occurrence in the words array
        let foundIdx = -1;
        let seen = 0;
        for (let i = 0; i < words.length; i++) {
          if (normalizeWord(words[i]) === normBoundary) {
            seen++;
            if (seen === boundaryCount) {
              foundIdx = i;
              break;
            }
          }
        }
        if (foundIdx >= 0) onWordChange(foundIdx);
      }
    }, 75);
  };
  const stopWordHighlighting = () => {
    if (highlightIntervalRef.current) { clearInterval(highlightIntervalRef.current); highlightIntervalRef.current = null; }
    if (onWordChange) onWordChange(null);
  };

  // Play current sentence and auto-advance if enabled
  const playCurrentSentence = useCallback((autoAdvance = false) => {
    if (!sentences || sentences.length === 0 || currentSentenceIndex >= sentences.length) return;
    if (!speechConfigRef.current || !window.SpeechSDK) return;
    if (synthesizerRef.current) {
      try {
        synthesizerRef.current.close();
      } catch (e) {}
      synthesizerRef.current = null;
    }
    autoAdvanceRef.current = autoAdvance;
    const SpeechSDK = window.SpeechSDK;
    const sentence = sentences[currentSentenceIndex];
    if (onSentenceChange) onSentenceChange(currentSentenceIndex);
    wordBoundaryListRef.current = [];
    const player = new SpeechSDK.SpeakerAudioDestination();
    player.onAudioStart = () => {
      setIsPlaying(true); setIsPaused(false); isCurrentlyPlayingRef.current = true; startWordHighlighting();
    };
    player.onAudioEnd = () => {
      setIsPlaying(false); setIsPaused(false); isCurrentlyPlayingRef.current = false; stopWordHighlighting(); wordBoundaryListRef.current = [];
      // Prevent auto-advance if skipInProgress is set (user pressed next/prev)
      if (skipInProgress.current) {
        skipInProgress.current = false;
        return;
      }
      // Auto-advance to next sentence if enabled
      if (autoAdvanceRef.current && currentSentenceIndex < sentences.length - 1) {
        setTimeout(() => {
          setCurrentSentenceIndex(idx => {
            const nextIdx = idx + 1;
            if (nextIdx < sentences.length) {
              return nextIdx;
            } else {
              if (onPlaybackFinish) onPlaybackFinish();
              return idx;
            }
          });
        }, 200);
      } else if (currentSentenceIndex === sentences.length - 1 && onPlaybackFinish) {
        onPlaybackFinish();
      }
    };
    playerRef.current = player;
    const audioConfig = SpeechSDK.AudioConfig.fromSpeakerOutput(player);
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfigRef.current, audioConfig);
    synthesizer.synthesizing = (s, e) => {};
    synthesizer.synthesisStarted = (s, e) => {};
    synthesizer.synthesisCompleted = (s, e) => {};
    synthesizer.SynthesisCanceled = (s, e) => {
      setError('Speech synthesis was canceled'); setIsPlaying(false); setIsPaused(false); isCurrentlyPlayingRef.current = false; stopWordHighlighting();
    };
    synthesizer.wordBoundary = (s, e) => { wordBoundaryListRef.current.push(e); };
    synthesizerRef.current = synthesizer;
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="es-MX"><voice name="${voiceName}"><prosody rate="${speakingRate}">${sentence}</prosody></voice></speak>`;
    const complete_cb = (result) => { try { synthesizer.close(); } catch (e) {} synthesizerRef.current = null; };
    const err_cb = (err) => { setError('Speech synthesis error: ' + err); try { synthesizer.close(); } catch (e) {} synthesizerRef.current = null; setIsPlaying(false); setIsPaused(false); isCurrentlyPlayingRef.current = false; };
    synthesizer.speakSsmlAsync(ssml, complete_cb, err_cb);
  }, [sentences, currentSentenceIndex, onSentenceChange, speakingRate, voiceName, onPlaybackFinish]);

  // Auto-play next sentence when currentSentenceIndex changes and auto-advance is enabled
  useEffect(() => {
    if (autoAdvanceRef.current && !isPlaying) {
      playCurrentSentence(true);
    }
    // eslint-disable-next-line
  }, [currentSentenceIndex]);

  // Control functions
  const handlePlay = () => {
    playCurrentSentence(true);
  };
  // Pause only
  const handlePause = () => {
    if (playerRef.current && isPlaying) { playerRef.current.pause(); setIsPaused(true); setIsPlaying(false); isCurrentlyPlayingRef.current = false; stopWordHighlighting(); }
  };
  // Stop (optionally reset index if you want a true reset elsewhere)
  const handleStop = () => {
    if (playerRef.current && isPlaying) { playerRef.current.pause(); setIsPaused(true); setIsPlaying(false); isCurrentlyPlayingRef.current = false; stopWordHighlighting(); }
    // Do not reset currentSentenceIndex here unless you want a true reset
  };
  const handlePrevious = () => {
    if (currentSentenceIndex > 0) {
      if (isPlaying) {
        handlePause();
        skipInProgress.current = true;
        shouldResumeAfterIndexChange.current = true;
        setCurrentSentenceIndex(idx => idx - 1);
      } else {
        setCurrentSentenceIndex(idx => idx - 1);
      }
    }
  };
  const handleNext = () => {
    if (currentSentenceIndex < sentences.length - 1) {
      if (isPlaying) {
        handlePause();
        skipInProgress.current = true;
        shouldResumeAfterIndexChange.current = true;
        setCurrentSentenceIndex(idx => idx + 1);
      } else {
        setCurrentSentenceIndex(idx => idx + 1);
      }
    }
  };
  const toggleSelectMode = () => { if (onSelectModeToggle) onSelectModeToggle(prev => !prev); };

  // Repeat current sentence (replay without advancing)
  const repeatCurrentSentence = useCallback(() => {
    handlePause();
    setTimeout(() => playCurrentSentence(false), 50);
  }, [playCurrentSentence]);

  useImperativeHandle(ref, () => ({
    repeatCurrentSentence,
  }));

  // Cleanup on unmount
  useEffect(() => { return () => { handleStop(); }; }, []);

  // Resume playback after index change if needed
  useEffect(() => {
    if (shouldResumeAfterIndexChange.current) {
      shouldResumeAfterIndexChange.current = false;
      playCurrentSentence(true);
    }
  }, [currentSentenceIndex, playCurrentSentence]);

  // Save currentSentenceIndex to localStorage on every change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('reader-current-sentence-index', String(currentSentenceIndex));
    }
  }, [currentSentenceIndex]);

  // Keyboard shortcuts for previous/next (a/d)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'a' || e.key === 'A') {
        handlePrevious();
      } else if (e.key === 'd' || e.key === 'D') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevious, handleNext]);

  if (!isSDKLoaded) {
    return (<div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4"><div className="text-sm text-gray-600">Loading Speech SDK...</div></div>);
  }
  if (error) {
    return (<div className="fixed bottom-4 right-4 bg-red-50 border border-red-300 rounded-lg shadow-lg p-4"><div className="text-sm text-red-600">Error: {error}</div></div>);
  }
  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-[220px] flex flex-col items-center">
      <div className="flex items-center gap-2 justify-center">
        <button onClick={handlePrevious} disabled={currentSentenceIndex === 0} className="p-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-full" title="Previous">
          <SkipBack size={22} className="text-blue-500" />
        </button>
        {isPlaying && !isPaused ? (
          <button onClick={handlePause} className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full" title="Pause">
            <Pause size={28} className="text-white" />
          </button>
        ) : (
          <button onClick={handlePlay} className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-full" title={isPaused ? "Resume" : "Play"}>
            <Play size={28} className="text-white" />
          </button>
        )}
        <button onClick={handleNext} disabled={currentSentenceIndex === sentences.length - 1} className="p-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-full" title="Next">
          <SkipForward size={22} className="text-blue-500" />
        </button>
        <button onClick={repeatCurrentSentence} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full" title="Repeat current sentence">
          <Repeat size={22} className="text-yellow-500" />
        </button>
        <button onClick={toggleSelectMode} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full" title="Select active sentence">
          <MousePointerClick size={22} className="text-purple-500" />
        </button>
      </div>
    </div>
  );
});

export default SpeechPlayer; 