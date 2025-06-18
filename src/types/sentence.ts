export interface Sentence {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
  bookId?: string;
  sectionId?: string;
  word?: string;
} 