export interface WiktionaryDefinition {
  word: string;
  partOfSpeech: string;
  definition: string;
  example?: string;
}

export interface WiktionaryResponse {
  word: string;
  definitions: WiktionaryDefinition[];
  error?: string;
}

export class WiktionaryService {
  private static readonly BASE_URL = 'https://en.wiktionary.org/api/rest_v1/page/definition/';
  private static readonly BACKUP_URL = 'https://en.wiktionary.org/w/api.php';

  /**
   * Fetches word definition from Wiktionary API
   */
  static async getDefinition(word: string): Promise<WiktionaryResponse> {
    if (!word || word.trim().length === 0) {
      return { word, definitions: [], error: 'Invalid word' };
    }

    // Clean the word (remove punctuation, convert to lowercase)
    const cleanedWord = word.replace(/[^\w\s-']/g, '').toLowerCase().trim();
    
    try {
      // First try the REST API
      const response = await fetch(`${this.BASE_URL}${encodeURIComponent(cleanedWord)}`);
      
      if (response.ok) {
        const data = await response.json();
        return this.parseRestApiResponse(cleanedWord, data);
      }
      
      // If REST API fails, try the legacy API
      return await this.fetchFromLegacyApi(cleanedWord);
    } catch (error) {
      console.error('Error fetching definition:', error);
      return { word: cleanedWord, definitions: [], error: 'Failed to fetch definition' };
    }
  }

  /**
   * Parses the REST API response
   */
  private static parseRestApiResponse(word: string, data: any): WiktionaryResponse {
    const definitions: WiktionaryDefinition[] = [];
    
    if (data.en && Array.isArray(data.en)) {
      data.en.forEach((entry: any) => {
        if (entry.definitions && Array.isArray(entry.definitions)) {
          entry.definitions.forEach((def: any) => {
            if (def.definition && def.parsedExamples) {
              definitions.push({
                word,
                partOfSpeech: entry.partOfSpeech || 'unknown',
                definition: this.cleanDefinition(def.definition),
                example: def.parsedExamples.length > 0 ? def.parsedExamples[0] : undefined
              });
            }
          });
        }
      });
    }

    return {
      word,
      definitions: definitions.slice(0, 3), // Limit to 3 definitions
      error: definitions.length === 0 ? 'No definitions found' : undefined
    };
  }

  /**
   * Fallback to legacy API if REST API fails
   */
  private static async fetchFromLegacyApi(word: string): Promise<WiktionaryResponse> {
    try {
      const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        titles: word,
        prop: 'extracts',
        exintro: 'true',
        explaintext: 'true',
        exsectionformat: 'plain',
        origin: '*'
      });

      const response = await fetch(`${this.BACKUP_URL}?${params}`);
      const data = await response.json();
      
      if (data.query && data.query.pages) {
        const pages = Object.values(data.query.pages) as any[];
        const page = pages[0];
        
        if (page && page.extract) {
          // Simple parsing of the extract text
          const extract = page.extract;
          const definitions = this.parseExtractText(word, extract);
          
          return {
            word,
            definitions: definitions.slice(0, 2), // Limit to 2 definitions for legacy API
            error: definitions.length === 0 ? 'No definitions found' : undefined
          };
        }
      }
      
      return { word, definitions: [], error: 'No definitions found' };
    } catch (error) {
      console.error('Error with legacy API:', error);
      return { word, definitions: [], error: 'Failed to fetch definition' };
    }
  }

  /**
   * Parses extract text from legacy API
   */
  private static parseExtractText(word: string, extract: string): WiktionaryDefinition[] {
    const definitions: WiktionaryDefinition[] = [];
    
    // Simple regex to find definitions
    const lines = extract.split('\n').filter(line => line.trim().length > 0);
    
    for (const line of lines) {
      if (line.includes('(') && line.includes(')')) {
        // Try to extract part of speech
        const partOfSpeechMatch = line.match(/\(([^)]+)\)/);
        const partOfSpeech = partOfSpeechMatch ? partOfSpeechMatch[1] : 'unknown';
        
        // Clean the definition
        const definition = line.replace(/\([^)]+\)/g, '').trim();
        
        if (definition.length > 10) { // Only add if it's a substantial definition
          definitions.push({
            word,
            partOfSpeech,
            definition: this.cleanDefinition(definition)
          });
        }
      }
    }
    
    return definitions;
  }

  /**
   * Cleans definition text
   */
  private static cleanDefinition(definition: string): string {
    return definition
      .replace(/\[\[([^\]]+)\]\]/g, '$1') // Remove wiki links
      .replace(/\{\{[^}]+\}\}/g, '') // Remove templates
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .replace(/^[^a-zA-Z]*/, '') // Remove leading non-letters
      .replace(/[^a-zA-Z]*$/, ''); // Remove trailing non-letters
  }
}