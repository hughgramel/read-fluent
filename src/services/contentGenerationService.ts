import { GoogleGenerativeAI } from "@google/generative-ai";
import { uploadBookJson, saveBookMetadata } from './epubService';
import { Book, BookSection } from '@/components/reader/ReaderTypes';

export interface GenerateContentParams {
  language: string;
  genre: string;
  topic: string;
  difficulty: string;
  delfLevel: string;
  length: number;
}

export interface GeneratedContent {
  title: string;
  content: string;
  sections: BookSection[];
  totalWords: number;
}

export class ContentGenerationService {
  private static async callGemini(prompt: string): Promise<string> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || (typeof window !== 'undefined' ? (window as any).NEXT_PUBLIC_GEMINI_API_KEY : undefined);
    if (!apiKey) throw new Error('Gemini API key not set');
    
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  private static getLanguageName(languageCode: string): string {
    const languageMap: { [key: string]: string } = {
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'en': 'English'
    };
    return languageMap[languageCode] || languageCode;
  }

  private static getGenreName(genreCode: string): string {
    const genreMap: { [key: string]: string } = {
      'story': 'Story',
      'news': 'News Report',
      'article': 'Article',
      'essay': 'Essay',
      'speech': 'Speech',
      'dialogue': 'Dialogue',
      'biography': 'Biography'
    };
    return genreMap[genreCode] || genreCode;
  }

  private static getDifficultyName(difficultyCode: string): string {
    const difficultyMap: { [key: string]: string } = {
      'beginner': 'Beginner',
      'intermediate': 'Intermediate',
      'advanced': 'Advanced'
    };
    return difficultyMap[difficultyCode] || difficultyCode;
  }

  private static createPrompt(params: GenerateContentParams): string {
    const languageName = this.getLanguageName(params.language);
    const genreName = this.getGenreName(params.genre);
    const difficultyName = this.getDifficultyName(params.difficulty);
    
    return `You are an expert language learning content creator. Create a ${genreName.toLowerCase()} in ${languageName} for ${difficultyName.toLowerCase()} level learners.

Requirements:
- Language: ${languageName}
- Genre: ${genreName}
- Topic: ${params.topic}
- Difficulty: ${difficultyName} (DELF level: ${params.delfLevel.toUpperCase()})
- Target length: ${params.length} words (±10% acceptable)

Content Guidelines:
- Use vocabulary and grammar appropriate for ${difficultyName} level
- Make the content engaging and educational
- Include natural dialogue and descriptions
- Ensure proper paragraph structure with paragraphs separated by double line breaks
- Use appropriate cultural context for ${languageName}

Respond with ONLY the content text. Do not include any titles, explanations, or formatting. Just the story/content itself.`;
  }

  private static splitContentIntoSections(content: string, targetSections: number = 3): BookSection[] {
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    const sections: BookSection[] = [];
    
    if (paragraphs.length <= targetSections) {
      // If we have fewer paragraphs than target sections, create one section per paragraph
      paragraphs.forEach((paragraph, index) => {
        const wordCount = paragraph.split(/\s+/).length;
        sections.push({
          id: `section-${index + 1}`,
          title: `Section ${index + 1}`,
          content: paragraph.trim(),
          wordCount
        });
      });
    } else {
      // Split paragraphs into roughly equal sections
      const paragraphsPerSection = Math.ceil(paragraphs.length / targetSections);
      
      for (let i = 0; i < targetSections; i++) {
        const startIndex = i * paragraphsPerSection;
        const endIndex = Math.min(startIndex + paragraphsPerSection, paragraphs.length);
        const sectionParagraphs = paragraphs.slice(startIndex, endIndex);
        const sectionContent = sectionParagraphs.join('\n\n');
        const wordCount = sectionContent.split(/\s+/).length;
        
        sections.push({
          id: `section-${i + 1}`,
          title: `Section ${i + 1}`,
          content: sectionContent.trim(),
          wordCount
        });
      }
    }
    
    return sections;
  }

  static async generateContent(params: GenerateContentParams): Promise<GeneratedContent> {
    try {
      const prompt = this.createPrompt(params);
      console.log('Sending prompt to AI:', prompt);
      
      const response = await this.callGemini(prompt);
      console.log('Raw AI response:', response);
      
      // Create programmatic title: TOPIC + GENRE
      const genreName = this.getGenreName(params.genre);
      const title = `${params.topic} ${genreName}`;
      
      // Clean the response content
      const content = response.trim();
      
      // Manually count words
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      
      console.log('Generated content:', {
        title,
        contentLength: content.length,
        wordCount
      });
      
      // Split content into sections
      const sections = this.splitContentIntoSections(content);
      const totalWords = sections.reduce((sum, section) => sum + section.wordCount, 0);
      
      return {
        title,
        content,
        sections,
        totalWords
      };
    } catch (error) {
      console.error('Content generation error:', error);
      throw error;
    }
  }

  static async saveGeneratedBook(userId: string, generatedContent: GeneratedContent, params: GenerateContentParams): Promise<string> {
    try {
      // Create book object
      const bookId = `generated-${Date.now()}`;
      const book: Book = {
        id: bookId,
        title: generatedContent.title,
        author: 'Generated',
        description: `AI-generated ${this.getGenreName(params.genre).toLowerCase()} about ${params.topic}`,
        sections: generatedContent.sections,
        totalWords: generatedContent.totalWords,
        fileName: `${bookId}.json`,
        dateAdded: new Date().toISOString(),
        css: '',
        cover: '',
        wordsRead: 0,
        wordsPerPage: 250 // Default words per page
      };

      // Upload to Firebase Storage
      const { storagePath, downloadURL } = await uploadBookJson(userId, bookId, book as unknown as Record<string, unknown>);
      
      // Save metadata to Firestore
      await saveBookMetadata(userId, bookId, {
        title: book.title,
        author: book.author,
        fileName: book.fileName,
        totalWords: book.totalWords,
        storagePath,
        downloadURL,
        currentSection: 0,
        wordsRead: 0
      });

      return bookId;
    } catch (error) {
      console.error('Error saving generated book:', error);
      throw error;
    }
  }
} 