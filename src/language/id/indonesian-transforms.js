/*
 * Indonesian language transforms for Read Fluent
 * Handles Indonesian word analysis and lemmatization
 */

export const indonesianTransforms = {
  name: 'Indonesian',
  description: 'Indonesian language transforms for word analysis',
  
  // Indonesian has some inflection but is generally simpler than European languages
  analyze: (text) => {
    // For Indonesian, the word is usually the lemma
    // We might need to handle some basic affixes (me-, ber-, ter-, etc.)
    return {
      lemma: text,
      conditions: [],
      trace: ['Indonesian: no inflection detected']
    };
  },
  
  // Indonesian word normalization
  normalize: (text) => {
    // Basic normalization for Indonesian
    return text.toLowerCase();
  },
  
  // Check if text is Indonesian
  isIndonesian: (text) => {
    // Indonesian uses Latin alphabet
    const indonesianPattern = /^[a-zA-Z\s]+$/;
    return indonesianPattern.test(text);
  }
}; 