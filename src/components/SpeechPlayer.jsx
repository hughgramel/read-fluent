import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, SkipBack, SkipForward, MousePointerClick, Repeat } from 'lucide-react';

const SpeechPlayer = forwardRef(({
  sentences,
  onSentenceChange,
  onWordChange,
  onPlaybackFinish,
  speakingRate = 1.0,
  voiceName = null,
  onProgress,
  onCurrentReadingSentenceEnd,
  onSelectModeToggle,
  forceStartAt,
  onForceStartProcessed,
  disableWordHighlighting = false,
  disableSentenceHighlighting = false,
  onSentenceSelect,
  onSettingsChange,
  readerSettings,
}, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [lastPlayedSentenceIndex, setLastPlayedSentenceIndex] = useState(0);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [filteredVoices, setFilteredVoices] = useState([]);
  const [countryCodes, setCountryCodes] = useState({});
  const [authToken, setAuthToken] = useState(null);
  const [error, setError] = useState(null);
  const [showNoSpeakerAlert, setShowNoSpeakerAlert] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingSettings, setPendingSettings] = useState({
    ttsSpeed: speakingRate,
    ttsVoice: voiceName,
    targetLanguage: readerSettings?.targetLanguage || 'es'
  });
  
  const synthesizerRef = useRef(null);
  const playerRef = useRef(null);
  const speechConfigRef = useRef(null);
  const wordBoundaryListRef = useRef([]);
  const highlightIntervalRef = useRef(null);
  const isCurrentlyPlayingRef = useRef(false);
  const autoAdvanceRef = useRef(false);
  const shouldResumeAfterIndexChange = useRef(false);
  const skipInProgress = useRef(false);
  const ttsSpeedUpdateTimeoutRef = useRef(null);

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

  // Fetch available voices from Azure Speech API
  const fetchVoices = useCallback(() => {
    if (!isSDKLoaded || !window.SpeechSDK) {
      console.log('[SpeechPlayer] Cannot fetch voices: SDK not loaded');
      return;
    }
    
    console.log('[SpeechPlayer] Starting to fetch voices from Azure...');
    try {
      const region = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION || 'eastus';
      const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`;
      const headers = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      else if (process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY) headers['Ocp-Apim-Subscription-Key'] = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY;
      
      console.log('[SpeechPlayer] Fetching from endpoint:', endpoint);
      console.log('[SpeechPlayer] Using headers:', headers);
      
      fetch(endpoint, { headers })
        .then(response => {
          console.log('[SpeechPlayer] Response status:', response.status);
          return response.ok ? response.json() : [];
        })
        .then(voices => {
          console.log('[SpeechPlayer] Fetched voices from Azure:', voices);
          console.log('[SpeechPlayer] Number of voices:', voices.length);
          setAvailableVoices(voices);
        })
        .catch(error => {
          console.error('[SpeechPlayer] Error fetching voices:', error);
        });
    } catch (error) {
      console.error('[SpeechPlayer] Error in fetchVoices:', error);
    }
  }, [isSDKLoaded, authToken]);
  // Load country codes
  useEffect(() => {
    fetch('/country-codes.json')
      .then(response => response.json())
      .then(setCountryCodes)
      .catch(error => console.error('Failed to load country codes:', error));
  }, []);

  // Filter voices by target language
  useEffect(() => {
    if (availableVoices.length > 0 && pendingSettings.targetLanguage) {
      console.log('[SpeechPlayer] Filtering voices for target language:', pendingSettings.targetLanguage);
      console.log('[SpeechPlayer] All available voices:', availableVoices);
      
      const targetLang = pendingSettings.targetLanguage.toLowerCase();
      const voicesForLanguage = availableVoices.filter(voice => {
        const locale = voice.Locale || '';
        const languageCode = locale.split('-')[0]?.toLowerCase();
        console.log(`[SpeechPlayer] Voice: ${voice.Name}, Locale: ${locale}, Language Code: ${languageCode}, Target: ${targetLang}`);
        return languageCode === targetLang;
      });
      
      console.log('[SpeechPlayer] Voices filtered for language:', voicesForLanguage);
      setFilteredVoices(voicesForLanguage);
    } else {
      setFilteredVoices([]);
    }
  }, [availableVoices, pendingSettings.targetLanguage]);

  useEffect(() => { fetchVoices(); }, [fetchVoices]);

  // Handle force start at specific sentence
  useEffect(() => {
    if (forceStartAt !== null && forceStartAt !== undefined) {
      setCurrentSentenceIndex(forceStartAt);
      if (typeof onSentenceSelect === 'function') {
        onSentenceSelect(forceStartAt);
      }
      if (onForceStartProcessed) onForceStartProcessed();
      // Don't automatically play - just select the sentence
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
    
    // Only set voice name if one is provided
    if (voiceName) {
      speechConfig.speechSynthesisVoiceName = voiceName;
    }
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

  // Helper function to format voice name with country name
  const formatVoiceName = (voice) => {
    const locale = voice.Locale || '';
    const parts = locale.split('-');
    if (parts.length >= 2) {
      const countryCode = parts[1];
      const countryName = countryCodes[countryCode] || countryCode;
      console.log(`[SpeechPlayer] Formatting voice: ${voice.Name}, Locale: ${locale}, Country Code: ${countryCode}, Country Name: ${countryName}`);
      return `${voice.LocalName || voice.Name} (${countryName})`;
    }
    return voice.LocalName || voice.Name;
  };

  // Start word highlighting interval (robust, throttled)
  const startWordHighlighting = () => {
    if (highlightIntervalRef.current) clearInterval(highlightIntervalRef.current);
    let lastBoundaryIdx = -1;
    let lastSentenceIndex = currentSentenceIndex;
    
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
        const normBoundary = normalizeWord(wordBoundary.text);
        
        // Count which occurrence of this wordBoundary.text we are on
        let boundaryCount = 0;
        for (let i = 0; i <= wordBoundaryIdx; i++) {
          if (normalizeWord(wordBoundaryListRef.current[i].text) === normBoundary) boundaryCount++;
        }
        
        // Find which sentence and word we're currently in
        let currentSentenceIdx = currentSentenceIndex;
        let wordCount = 0;
        let foundWordIdx = -1;
        let foundSentenceIdx = -1;
        
        // Search through all sentences from currentSentenceIndex onwards
        for (let sentenceIdx = currentSentenceIndex; sentenceIdx < sentences.length; sentenceIdx++) {
          const sentence = sentences[sentenceIdx];
          const words = sentence.match(/\S+/g) || [];
          
          for (let wordIdx = 0; wordIdx < words.length; wordIdx++) {
            if (normalizeWord(words[wordIdx]) === normBoundary) {
              wordCount++;
              if (wordCount === boundaryCount) {
                foundWordIdx = wordIdx;
                foundSentenceIdx = sentenceIdx;
              break;
            }
          }
        }
          if (foundWordIdx !== -1) break;
        }
        
        // Update sentence highlighting if we've moved to a new sentence
        if (foundSentenceIdx !== -1 && foundSentenceIdx !== lastSentenceIndex) {
          lastSentenceIndex = foundSentenceIdx;
          if (onSentenceChange) onSentenceChange(foundSentenceIdx);
          // Only update currentSentenceIndex if it's actually different to prevent unnecessary re-renders
          if (foundSentenceIdx !== currentSentenceIndex) {
            setCurrentSentenceIndex(foundSentenceIdx);
          }
        }
        
        // Update word highlighting
        if (foundWordIdx >= 0) {
          onWordChange(foundWordIdx);
        }
      }
    }, 75);
  };
  const stopWordHighlighting = () => {
    if (highlightIntervalRef.current) { clearInterval(highlightIntervalRef.current); highlightIntervalRef.current = null; }
    if (onWordChange) onWordChange(null);
    // Reset sentence highlighting to current sentence when stopping
    if (onSentenceChange) onSentenceChange(currentSentenceIndex);
  };

  // Play continuous audio from current sentence to end of page
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
    // Build continuous text from current sentence to end of page
    const continuousText = sentences.slice(currentSentenceIndex).join(' ');
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
    
    // Generate SSML for continuous text
    let ssml;
    if (voiceName) {
      ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="es-MX"><voice name="${voiceName}"><prosody rate="${speakingRate}">${continuousText}</prosody></voice></speak>`;
    } else {
      ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="es-MX"><prosody rate="${speakingRate}">${continuousText}</prosody></speak>`;
    }
    
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
    // Check if voice is set
    if (!voiceName) {
      setShowNoSpeakerAlert(true);
      setTimeout(() => setShowNoSpeakerAlert(false), 3000);
      return;
    }
    
    let idx = currentSentenceIndex;
    if (idx === null || idx === undefined || isNaN(idx) || idx < 0 || idx >= (sentences?.length || 0)) {
      idx = 0;
      setCurrentSentenceIndex(0);
      if (typeof onSentenceChange === 'function') onSentenceChange(0);
    }
    
    // If resuming from pause, start from the last played sentence
    if (isPaused) {
      idx = lastPlayedSentenceIndex;
      setCurrentSentenceIndex(lastPlayedSentenceIndex);
      if (typeof onSentenceChange === 'function') onSentenceChange(lastPlayedSentenceIndex);
    } else {
      // Starting fresh playback, reset the last played sentence index
      setLastPlayedSentenceIndex(idx);
    }
    
    playCurrentSentence(true);
  };
  // Pause only
  const handlePause = () => {
    if (playerRef.current && isPlaying) { 
      playerRef.current.pause(); 
      setIsPaused(true); 
      setIsPlaying(false); 
      isCurrentlyPlayingRef.current = false; 
      stopWordHighlighting(); 
      
      // Store the current position for resume
      // We'll resume from the current sentence index
      setLastPlayedSentenceIndex(currentSentenceIndex);
    }
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

  // Toggle play/pause
  const togglePlayPause = () => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  useImperativeHandle(ref, () => ({
    repeatCurrentSentence,
    play: handlePlay,
    pause: handlePause,
    togglePlayPause,
  }));

  // Cleanup on unmount
  useEffect(() => { 
    return () => { 
      handleStop(); 
      if (ttsSpeedUpdateTimeoutRef.current) {
        clearTimeout(ttsSpeedUpdateTimeoutRef.current);
      }
    }; 
  }, []);

  // Resume playback after index change if needed
  useEffect(() => {
    if (shouldResumeAfterIndexChange.current) {
      shouldResumeAfterIndexChange.current = false;
      playCurrentSentence(true);
    }
  }, [currentSentenceIndex, playCurrentSentence]);

  // Reset sentence index when sentences change (new page)
  useEffect(() => {
    setCurrentSentenceIndex(0);
    if (typeof onSentenceChange === 'function') onSentenceChange(0);
    if (typeof onSentenceSelect === 'function') onSentenceSelect(0);
    // Clear localStorage to prevent persistence across pages
    if (typeof window !== 'undefined') {
      localStorage.removeItem('reader-current-sentence-index');
    }
  }, [sentences, onSentenceChange, onSentenceSelect]);

  // Note: Removed localStorage persistence for currentSentenceIndex to prevent cross-page persistence

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

  // Update pending settings when props change
  useEffect(() => {
    setPendingSettings({
      ttsSpeed: speakingRate,
      ttsVoice: voiceName,
      targetLanguage: readerSettings?.targetLanguage || 'es'
    });
  }, [speakingRate, voiceName, readerSettings?.targetLanguage]);

  // Handle settings changes
  const handleSettingChange = (key, value) => {
    const newSettings = { ...pendingSettings, [key]: value };
    setPendingSettings(newSettings);
    
    // Special handling for TTS speed - debounce the update
    if (key === 'ttsSpeed') {
      // Clear any existing timeout
      if (ttsSpeedUpdateTimeoutRef.current) {
        clearTimeout(ttsSpeedUpdateTimeoutRef.current);
      }
      
      // Set a new timeout to update after 1 second of inactivity
      ttsSpeedUpdateTimeoutRef.current = setTimeout(() => {
        if (onSettingsChange) {
          onSettingsChange(newSettings);
        }
      }, 1000);
    } else {
      // For non-speed settings, update immediately
      if (onSettingsChange) {
        onSettingsChange(newSettings);
      }
    }
  };

  // Global click handler to close settings when clicking outside
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (showSettings) {
        // Check if the click is outside the SpeechPlayer component
        const speechPlayerElement = document.querySelector('[data-speech-player]');
        if (speechPlayerElement && !speechPlayerElement.contains(e.target)) {
          setShowSettings(false);
        }
      }
    };

    if (showSettings) {
      document.addEventListener('click', handleGlobalClick);
    }

    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [showSettings]);

  if (!isSDKLoaded) {
    return (<div className="fixed bottom-4 right-4 bg-[var(--background)] border theme-border rounded-lg shadow-lg p-4"><div className="text-sm theme-text">Loading Speech SDK...</div></div>);
  }
  if (error) {
    return (<div className="fixed bottom-4 right-4 bg-red-50 border border-red-300 rounded-lg shadow-lg p-4"><div className="text-sm text-red-600">Error: {error}</div></div>);
  }
  return (
    <>
      <div 
        data-speech-player
        className="fixed bottom-4 right-4 bg-[var(--background)] border theme-border rounded-lg shadow-lg p-4 flex flex-col items-end transition-all duration-300 ease-in-out min-w-[220px]"
      >
        {/* Settings panel - integrated into main container */}
        <div className={`w-full overflow-hidden transition-all duration-300 ease-in-out ${showSettings ? 'max-h-96 opacity-100 mb-4' : 'max-h-0 opacity-0 mb-0'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold theme-text">TTS Settings</h3>
            <button 
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
              title="Close settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m18 15-6-6-6 6"/>
              </svg>
            </button>
          </div>
          
          {/* Speed slider */}
          <div className="mb-4">
            <label className="block text-xs font-medium theme-text mb-2">
              Speed ({pendingSettings.ttsSpeed}x)
            </label>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              value={pendingSettings.ttsSpeed}
              onChange={e => handleSettingChange('ttsSpeed', Number(e.target.value))}
              className="w-full accent-[#2563eb]"
            />
          </div>

          {/* Speaker dropdown */}
          <div className="mb-2">
            <label className="block text-xs font-medium theme-text mb-2">
              Speaker
            </label>
            <select
              value={pendingSettings.ttsVoice || ''}
              onChange={e => handleSettingChange('ttsVoice', e.target.value || null)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#2563eb] max-w-[200px]"
              style={{ maxWidth: '200px' }}
            >
              <option value="">No speaker selected</option>
              {(() => {
                console.log('[SpeechPlayer Settings] Filtered voices:', filteredVoices);
                console.log('[SpeechPlayer Settings] Target language:', pendingSettings.targetLanguage);
                
                return filteredVoices.map((voice) => (
                  <option key={voice.Name} value={voice.Name}>
                    {formatVoiceName(voice)}
                  </option>
                ));
              })()}
            </select>
            <div className="text-xs text-gray-500 mt-1">
              Target language: {pendingSettings.targetLanguage}
            </div>
          </div>
        </div>

        {/* Main controls */}
        <div className="flex items-center gap-2 justify-center">
          <button onClick={handlePrevious} disabled={currentSentenceIndex === 0} className="p-2 bg-[var(--sidebar-background)] hover:bg-[var(--primary-color)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors" title="Previous">
            <SkipBack size={22} className="text-[var(--primary-color)]" />
          </button>
          {isPlaying && !isPaused ? (
            <button onClick={handlePause} className="p-3 bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] text-white rounded-full transition-colors" title="Pause">
              <Pause size={28} className="text-white" />
            </button>
          ) : (
            <button onClick={handlePlay} className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors" title={isPaused ? "Resume" : "Play"}>
              <Play size={28} className="text-white" />
            </button>
          )}
          <button onClick={handleNext} disabled={currentSentenceIndex === sentences.length - 1} className="p-2 bg-[var(--sidebar-background)] hover:bg-[var(--primary-color)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors" title="Next">
            <SkipForward size={22} className="text-[var(--primary-color)]" />
          </button>
          <button onClick={repeatCurrentSentence} className="p-2 bg-[var(--sidebar-background)] hover:bg-[var(--primary-color)] hover:text-white rounded-full transition-colors" title="Repeat current sentence">
            <Repeat size={22} className="text-yellow-500" />
          </button>
          <button onClick={toggleSelectMode} className="p-2 bg-[var(--sidebar-background)] hover:bg-[var(--primary-color)] hover:text-white rounded-full transition-colors" title="Select active sentence">
            <MousePointerClick size={22} className="text-purple-500" />
          </button>
          
          {/* Settings button with dots */}
          <button 
            onClick={() => setShowSettings(!showSettings)} 
            className="p-2 bg-[var(--sidebar-background)] hover:bg-[var(--primary-color)] hover:text-white rounded-full transition-colors" 
            title="TTS Settings"
          >
            <div className="flex flex-col gap-0.5">
              <div className="w-1 h-1 bg-[var(--primary-color)] rounded-full"></div>
              <div className="w-1 h-1 bg-[var(--primary-color)] rounded-full"></div>
              <div className="w-1 h-1 bg-[var(--primary-color)] rounded-full"></div>
            </div>
          </button>
        </div>
      </div>
      
      {/* No speaker alert */}
      {showNoSpeakerAlert && (
        <div className="fixed bottom-32 right-4 bg-red-50 border border-red-300 rounded-lg shadow-lg p-3 max-w-xs">
          <div className="text-sm text-red-600 font-medium">No speaker set</div>
          <div className="text-xs text-red-500 mt-1">Please select a TTS speaker in reader settings</div>
        </div>
      )}
    </>
  );
});

export default SpeechPlayer; 