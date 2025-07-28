/*
 * Vietnamese language transforms for Read Fluent
 * Handles Vietnamese word analysis and lemmatization
 */

export const vietnameseTransforms = {
  name: 'Vietnamese',
  description: 'Vietnamese language transforms for word analysis',
  
  // Vietnamese doesn't have complex inflection like European languages
  // Most words are monosyllabic and don't change form
  analyze: (text) => {
    // For Vietnamese, the word is usually the lemma
    // We might need to handle tone normalization for lookup
    return {
      lemma: text,
      conditions: [],
      trace: ['Vietnamese: no inflection detected']
    };
  },
  
  // Vietnamese word normalization
  normalize: (text) => {
    // Remove tones for dictionary lookup
    return text.normalize('NFD').replace(/[\u0300\u0309\u0303\u0301\u0323]/g, '');
  },
  
  // Check if text is Vietnamese
  isVietnamese: (text) => {
    // Vietnamese uses Latin alphabet with diacritics
    const vietnamesePattern = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    return vietnamesePattern.test(text);
  }
}; 