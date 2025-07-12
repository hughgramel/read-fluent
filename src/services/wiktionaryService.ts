export interface WiktionaryDefinition {
  word: string;
  definitions: string[];
  etymology?: string;
  language: string;
  pronunciation?: string;
}

export class WiktionaryService {
  private static readonly BASE_URL = 'https://en.wiktionary.org/api/rest_v1/page/definition/';
  
  static async getDefinition(word: string, language: string = 'en'): Promise<WiktionaryDefinition | null> {
    try {
      // Clean the word (remove punctuation, convert to lowercase)
      const cleanWord = word.replace(/[^\w\s]/g, '').toLowerCase().trim();
      if (!cleanWord) return null;
      
      const response = await fetch(`${this.BASE_URL}${encodeURIComponent(cleanWord)}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ReadFluent/1.0 (https://readfluent.com)',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Parse the Wiktionary response
      if (data && data[language] && data[language].length > 0) {
        const definitions: string[] = [];
        
        data[language].forEach((entry: any) => {
          if (entry.definitions && entry.definitions.length > 0) {
            entry.definitions.forEach((def: any) => {
              if (def.definition && typeof def.definition === 'string') {
                // Clean HTML tags from definition
                const cleanDefinition = def.definition.replace(/<[^>]*>/g, '').trim();
                if (cleanDefinition && !definitions.includes(cleanDefinition)) {
                  definitions.push(cleanDefinition);
                }
              }
            });
          }
        });
        
        if (definitions.length > 0) {
          return {
            word: cleanWord,
            definitions: definitions.slice(0, 3), // Limit to 3 definitions
            language,
            etymology: data[language][0]?.etymology || undefined,
            pronunciation: data[language][0]?.pronunciation || undefined,
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching Wiktionary definition:', error);
      return null;
    }
  }
  
  static async getDefinitionSimple(word: string, language: string = 'en'): Promise<string | null> {
    try {
      const definition = await this.getDefinition(word, language);
      return definition?.definitions[0] || null;
    } catch (error) {
      console.error('Error fetching simple definition:', error);
      return null;
    }
  }
}