import { GoogleGenerativeAI } from "@google/generative-ai";

export interface GeminiCallOptions {
  systemPrompt?: string;
  userPrompt?: string;
  prompt?: string;
  models?: string[];
  maxRetries?: number;
}

export class GeminiUtils {
  private static readonly DEFAULT_MODELS = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite', 
    'gemini-1.5-flash',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro'
  ];

  private static readonly MAX_RETRIES = 3;

  /**
   * Call Gemini API with fallback models to handle rate limiting
   */
  static async callGemini(options: GeminiCallOptions): Promise<string> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 
                   (typeof window !== 'undefined' ? (window as any).NEXT_PUBLIC_GEMINI_API_KEY : undefined);
    
    if (!apiKey) {
      throw new Error('Gemini API key not set');
    }

    const models = options.models || this.DEFAULT_MODELS;
    const maxRetries = options.maxRetries || this.MAX_RETRIES;
    
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < Math.min(models.length, maxRetries); attempt++) {
      const modelName = models[attempt];
      
      try {
        console.log(`[GeminiUtils] Attempting call with model: ${modelName} (attempt ${attempt + 1})`);
        
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: modelName });
        
        let result;
        
        if (options.systemPrompt && options.userPrompt) {
          // Use structured prompt with system and user messages
          result = await model.generateContent({
            contents: [
              { role: 'system', parts: [{ text: options.systemPrompt }] },
              { role: 'user', parts: [{ text: options.userPrompt }] },
            ]
          });
        } else if (options.prompt) {
          // Use simple string prompt
          result = await model.generateContent(options.prompt);
        } else {
          throw new Error('No valid prompt provided');
        }
        
        const response = result.response.text();
        console.log(`[GeminiUtils] Success with model: ${modelName}`);
        return response;
        
      } catch (error: any) {
        lastError = error;
        console.warn(`[GeminiUtils] Failed with model ${modelName}:`, error.message);
        
        // Check if it's a rate limit error
        const isRateLimit = error.message?.includes('rate') || 
                           error.message?.includes('quota') || 
                           error.message?.includes('429') ||
                           error.message?.includes('too many requests');
        
        if (isRateLimit && attempt < models.length - 1) {
          console.log(`[GeminiUtils] Rate limited, trying next model...`);
          // Add a small delay before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        // If it's not a rate limit error or we're out of models, throw immediately
        if (!isRateLimit) {
          throw error;
        }
      }
    }
    
    // If we get here, all models failed
    throw lastError || new Error('All Gemini models failed');
  }

  /**
   * Legacy method for backward compatibility
   */
  static async callGeminiLegacy(prompt: string | { systemPrompt: string, userPrompt: string }): Promise<string> {
    if (typeof prompt === 'string') {
      return this.callGemini({ prompt });
    } else {
      return this.callGemini({ 
        systemPrompt: prompt.systemPrompt, 
        userPrompt: prompt.userPrompt 
      });
    }
  }
} 