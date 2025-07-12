import { WordType } from './ReaderTypes';

// Helper: tokenize paragraph into words and punctuation (Unicode-aware, don't split on accented letters)
export function tokenize(text: string): string[] {
  if (!text) return [];
  // Split on spaces and keep punctuation as separate tokens, but keep all Unicode letters together
  // This regex matches words (including Unicode letters, apostrophes, hyphens), or punctuation/space
  return Array.from(text.matchAll(/([\p{L}\p{M}\d'-]+|[.,!?;:"()\[\]{}…—–\s]+)/gu)).map(m => m[0]);
}

// Helper: get next status (unknown -> known -> tracking -> ignored -> unknown)
export function nextStatus(current: WordType | undefined): WordType {
  if (!current) return 'known'; // unknown -> known
  if (current === 'known') return 'tracking';
  if (current === 'tracking') return 'ignored';
  if (current === 'ignored') return 'known'; // ignored -> unknown (which is not in the map, so nextStatus returns 'known')
  return 'known';
}

// Helper: get underline style
export function getUnderline(type: WordType | undefined, hovered: boolean): string {
  if (type === 'tracking') return '2px solid #a78bfa'; // purple
  if (!type || type === 'unknown') return 'none'; // no underline for unknown
  if (type === 'known') return hovered ? '2px solid #16a34a' : 'none';
  if (type === 'ignored') return hovered ? '2px solid #222' : 'none';
  return 'none';
}

// Helper: get word underline style for highlighting feature
export function getWordUnderline(type: WordType | undefined, hovered: boolean): string {
  if (type === 'tracking') return '2px solid #a78bfa'; // purple
  if (!type || type === 'unknown') return '2px solid #ef4444'; // red for unknown
  if (type === 'known') return hovered ? '2px solid #16a34a' : 'none'; // green on hover
  if (type === 'ignored') return hovered ? '2px solid #4b5563' : 'none'; // dark grey on hover
  return 'none';
}

// Helper: clean word for lookup (remove punctuation, lowercase)
export function cleanWord(word: string): string {
  return word.replace(/[^\p{L}\p{M}\d'-]/gu, '').toLowerCase();
}

// Helper: robust sentence splitter
export function splitSentences(text: string): string[] {
  // Split after ., !, ?, ¿, ¡, even if no space after, and include closing punctuation
  // Handles Spanish and English sentence boundaries robustly
  return text.match(/[^.!?¿¡]+[.!?¿¡]+["']?(?=\s|$|[A-ZÁÉÍÓÚÑ¿¡])/g) || [];
}

// Helper: check if a string is a valid image URL
export function isValidImageUrl(url: string | undefined): boolean {
  return !!url && (url.startsWith('http') || url.startsWith('data:image'));
}

// Helper: sanitize HTML: remove <a> tags and all event handlers
export function sanitizeHtml(html: string): string {
  // Remove <a ...>...</a> tags
  let sanitized = html.replace(/<a [^>]*>(.*?)<\/a>/gi, '$1');
  // Remove inline event handlers (onclick, onmouseover, etc.)
  sanitized = sanitized.replace(/ on\w+="[^"]*"/gi, '');
  sanitized = sanitized.replace(/ on\w+='[^']*'/gi, '');
  return sanitized;
}

// Helper: get section title
export function getSectionTitle(section: { title?: string } | undefined, idx: number): string {
  let title = section?.title?.trim() || '';
  if (!title) title = `Section ${idx + 1}`;
  if (title.length > 100) title = title.slice(0, 100) + '…';
  return title;
}

// Helper: get total words for a page
export function getPageWordCount(sectionPages: string[][][], sectionIdx: number, pageIdx: number): number {
  const page = sectionPages[sectionIdx]?.[pageIdx] || [];
  return page.join(' ').split(/\s+/).filter(Boolean).length;
}

// Helper: get reader container class
export function getReaderContainerClass(readerContainerStyle: string): string {
  if (readerContainerStyle === 'contained') return 'bg-white rounded-lg border-[0.75] border-black';
  if (readerContainerStyle === 'border') return 'bg-transparent border border-gray-300 rounded-lg';
  if (readerContainerStyle === 'full-width') return 'bg-white';
  return 'bg-transparent';
}

// Helper: get reader container style
export function getReaderContainerStyle(
  readerContainerStyle: string,
  readerFont: string,
  readerWidth: number,
  isMobile: boolean
): React.CSSProperties {
  if (readerContainerStyle === 'full-width') {
    return { 
      fontFamily: readerFont, 
      fontSize: '1.1rem', 
      width: '100%', 
      maxWidth: '100%', 
      margin: 0, 
      padding: 0, 
      boxShadow: 'none', 
      border: 'none', 
      background: 'white' 
    };
  }
  let style: React.CSSProperties = { 
    fontFamily: readerFont, 
    fontSize: '1.1rem', 
    maxWidth: readerWidth, 
    width: readerWidth, 
    margin: '0', 
    padding: isMobile ? '1.5rem 0.75rem' : '2.5rem 2.5rem',
  };
  if (readerContainerStyle === 'none') {
    style = { ...style, boxShadow: 'none', border: 'none', background: 'transparent' };
  } else if (readerContainerStyle === 'border') {
    style = { ...style, boxShadow: 'none', background: 'transparent' };
  }
  return style;
} 