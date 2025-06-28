'use server'; // This directive MUST be the very first line.

import { useAuth } from '@/hooks/useAuth';
import { uploadBookJson, saveBookMetadata } from '@/services/epubService';
import EPub from 'epub-parser';
import * as cheerio from 'cheerio';

// Define the types needed for this server-side operation
interface BookSection {
  id: string;
  title: string;
  content: string;
  wordCount: number;
}

interface Book {
  id: string;
  title: string;
  author: string;
  sections: BookSection[];
  totalWords: number;
  fileName: string;
  dateAdded: string;
  completed?: boolean;
}

// This function receives the file data from the client and runs ONLY on the server
export async function processAndSaveBook(formData: FormData) {
  // Get the session using the server-side auth() function, NOT the useAuth() hook
  const { user } = useAuth();
  const userId = user?.uid; // Adjust this path if your session object is different
  const file = formData.get('epubFile') as File;

  if (!userId) {
    return { error: "Authentication failed. Please log in." };
  }
  if (!file) {
    return { error: "No file was provided." };
  }

  try {
    const fileBuffer = await file.arrayBuffer();
    // This server-side code can now safely use epub-parser
    const parsedEpub: any = await EPub.parse(fileBuffer);

    if (!parsedEpub || !parsedEpub.metadata || !parsedEpub.flow) {
      throw new Error('Invalid EPUB: Could not parse book structure.');
    }
      
    const { title = 'Unknown Title', creator = 'Unknown Author' } = parsedEpub.metadata;
    
    const sections: BookSection[] = parsedEpub.flow.map((item: any, index: number) => {
      if (!item || !item.html) return null;
      const $ = cheerio.load(item.html);
      const sectionTitle = ($('h1, h2, h3').first().text() || `Section ${index + 1}`).trim();
      const content = $('body').text().replace(/\s+/g, ' ').trim();
      const wordCount = content.split(' ').filter(Boolean).length;
      return { id: item.id || `section-${index}`, title: sectionTitle, content, wordCount };
    }).filter((section: any): section is BookSection => section !== null && section.wordCount > 0);

    const totalWords = sections.reduce((sum: number, section: BookSection) => sum + section.wordCount, 0);
    const bookId = Date.now().toString();

    const newBook: Book = {
      id: bookId, title, author: creator, sections, totalWords,
      fileName: file.name, dateAdded: new Date().toISOString(), completed: false,
    };
    
    const { storagePath, downloadURL } = await uploadBookJson(userId, bookId, newBook);
    
    await saveBookMetadata(userId, bookId, {
      title: newBook.title, author: newBook.author, fileName: newBook.fileName,
      totalWords: newBook.totalWords, storagePath, downloadURL,
      dateAdded: newBook.dateAdded, completed: false,
    });

    // Send back a success message and the new book's metadata
    return { 
        success: true, 
        newBook: {
            id: bookId,
            title,
            author: creator,
            totalWords,
            fileName: file.name,
            dateAdded: newBook.dateAdded,
            storagePath,
            downloadURL,
            completed: false,
            sections: [],
        }
    };

  } catch (err) {
    console.error('Server Action Error:', err);
    return { error: `Processing failed: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}