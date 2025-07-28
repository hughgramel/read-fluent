/*
 * Word playback utilities for Read Fluent
 * Handles individual word pronunciation using Azure Speech Services
 */

// Extend Window interface to include SpeechSDK
declare global {
  interface Window {
    SpeechSDK: any;
  }
}

interface WordPlaybackOptions {
  word: string;
  voiceName?: string | null;
  speakingRate?: number;
  targetLanguage?: string;
}

class WordPlaybackUtils {
  private static synthesizerRef: any = null;
  private static isSDKLoaded = false;
  private static authToken: string | null = null;

  /**
   * Load Speech SDK dynamically
   */
  private static async loadSpeechSDK(): Promise<void> {
    if (this.isSDKLoaded) return;
    
    if (window.SpeechSDK) {
      this.isSDKLoaded = true;
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://aka.ms/csspeech/jsbrowserpackageraw';
      script.onload = () => {
        this.isSDKLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Speech SDK'));
      document.head.appendChild(script);
    });
  }

  /**
   * Get authorization token
   */
  private static async getAuthToken(): Promise<void> {
    if (this.authToken) return;
    
    try {
      const response = await fetch('/api/speech-token');
      if (response.ok) {
        const data = await response.json();
        if (data && data.token) {
          this.authToken = data.token;
        }
      }
    } catch (error) {
      console.warn('Failed to get speech token:', error);
    }
  }

  /**
   * Initialize speech configuration
   */
  private static async initializeSpeechConfig(): Promise<any> {
    if (!this.isSDKLoaded) {
      await this.loadSpeechSDK();
    }
    
    if (!window.SpeechSDK) {
      throw new Error('Speech SDK not available');
    }

    await this.getAuthToken();
    
    const SpeechSDK = window.SpeechSDK;
    const region = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION || 'eastus';
    
    let speechConfig;
    if (this.authToken) {
      speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(this.authToken, region);
    } else if (process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY) {
      speechConfig = SpeechSDK.SpeechConfig.fromSubscription(process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY, region);
    } else {
      throw new Error('No speech authentication available');
    }

    return speechConfig;
  }

  /**
   * Play a single word
   */
  static async playWord(options: WordPlaybackOptions): Promise<void> {
    try {
      // Close any existing synthesizer
      if (this.synthesizerRef) {
        try {
          this.synthesizerRef.close();
        } catch (e) {}
        this.synthesizerRef = null;
      }

      const speechConfig = await this.initializeSpeechConfig();
      const SpeechSDK = window.SpeechSDK;
      
      const player = new SpeechSDK.SpeakerAudioDestination();
      const audioConfig = SpeechSDK.AudioConfig.fromSpeakerOutput(player);
      const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);
      
      this.synthesizerRef = synthesizer;

      // Generate SSML with or without voice specification
      let ssml;
      const { word, voiceName, speakingRate = 1.0, targetLanguage = 'es' } = options;
      
      if (voiceName) {
        ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${targetLanguage}"><voice name="${voiceName}"><prosody rate="${speakingRate}">${word}</prosody></voice></speak>`;
      } else {
        ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${targetLanguage}"><prosody rate="${speakingRate}">${word}</prosody></speak>`;
      }

      return new Promise((resolve, reject) => {
        const complete_cb = (result: any) => {
          try {
            synthesizer.close();
          } catch (e) {}
          this.synthesizerRef = null;
          resolve();
        };
        
        const err_cb = (err: any) => {
          try {
            synthesizer.close();
          } catch (e) {}
          this.synthesizerRef = null;
          reject(new Error('Speech synthesis error: ' + err));
        };
        
        synthesizer.speakSsmlAsync(ssml, complete_cb, err_cb);
      });
    } catch (error) {
      console.error('Word playback error:', error);
      throw error;
    }
  }

  /**
   * Stop any currently playing word
   */
  static stop(): void {
    if (this.synthesizerRef) {
      try {
        this.synthesizerRef.close();
      } catch (e) {}
      this.synthesizerRef = null;
    }
  }
}

export { WordPlaybackUtils }; 